import os
import stripe
from flask import Blueprint, request, jsonify
from supabase_admin import get_admin_sb

stripe_bp = Blueprint('stripe', __name__)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

PRICE_MAP = {
    'starter': os.environ.get('STRIPE_PRICE_STARTER', ''),
    'pro': os.environ.get('STRIPE_PRICE_PRO', ''),
    'unlimited': os.environ.get('STRIPE_PRICE_UNLIMITED', ''),
}

PRICE_TO_PLAN = {}

def _build_price_to_plan():
    global PRICE_TO_PLAN
    PRICE_TO_PLAN = {v: k for k, v in PRICE_MAP.items() if v}

@stripe_bp.route('/api/stripe/create-checkout-session', methods=['POST'])
def create_checkout_session():
    _build_price_to_plan()
    data = request.json
    user_id = data.get('user_id')
    plan = data.get('plan')
    email = data.get('email')

    if not user_id or not plan or plan not in PRICE_MAP:
        return jsonify(error='Invalid request'), 400

    price_id = PRICE_MAP[plan]
    if not price_id:
        return jsonify(error='Plan not configured'), 400

    sb = get_admin_sb()

    sub_res = sb.table('subscriptions').select('stripe_customer_id').eq('user_id', user_id).execute()
    customer_id = None
    if sub_res.data and sub_res.data[0].get('stripe_customer_id'):
        customer_id = sub_res.data[0]['stripe_customer_id']
    else:
        customer = stripe.Customer.create(
            email=email,
            metadata={'supabase_user_id': user_id}
        )
        customer_id = customer.id
        sb.table('subscriptions').upsert({
            'user_id': user_id,
            'stripe_customer_id': customer_id,
            'plan': 'free',
            'status': 'active',
        }, on_conflict='user_id').execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode='subscription',
        line_items=[{'price': price_id, 'quantity': 1}],
        success_url=f'{FRONTEND_URL}/dashboard?upgraded=true',
        cancel_url=f'{FRONTEND_URL}/pricing',
        metadata={'supabase_user_id': user_id},
        subscription_data={'metadata': {'supabase_user_id': user_id}},
    )
    return jsonify(url=session.url)

@stripe_bp.route('/api/stripe/create-portal-session', methods=['POST'])
def create_portal_session():
    data = request.json
    user_id = data.get('user_id')

    sb = get_admin_sb()
    sub_res = sb.table('subscriptions').select('stripe_customer_id').eq('user_id', user_id).execute()
    if not sub_res.data or not sub_res.data[0].get('stripe_customer_id'):
        return jsonify(error='No subscription found'), 404

    session = stripe.billing_portal.Session.create(
        customer=sub_res.data[0]['stripe_customer_id'],
        return_url=f'{FRONTEND_URL}/dashboard',
    )
    return jsonify(url=session.url)

@stripe_bp.route('/api/stripe/webhook', methods=['POST'])
def webhook():
    payload = request.get_data()
    sig = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        return jsonify(error='Invalid signature'), 400

    sb = get_admin_sb()

    existing = sb.table('stripe_events').select('id').eq('stripe_event_id', event['id']).execute()
    if existing.data:
        return jsonify(ok=True), 200

    event_type = event['type']

    if event_type == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('metadata', {}).get('supabase_user_id')
        sub_id = session.get('subscription')
        if user_id and sub_id:
            sub = stripe.Subscription.retrieve(sub_id)
            price_id = sub['items']['data'][0]['price']['id']
            _build_price_to_plan()
            plan = PRICE_TO_PLAN.get(price_id, 'starter')
            sb.table('subscriptions').upsert({
                'user_id': user_id,
                'stripe_customer_id': session.get('customer'),
                'stripe_subscription_id': sub_id,
                'plan': plan,
                'status': sub['status'],
                'current_period_start': sub['current_period_start'],
                'current_period_end': sub['current_period_end'],
                'cancel_at_period_end': sub.get('cancel_at_period_end', False),
            }, on_conflict='user_id').execute()

    elif event_type == 'customer.subscription.updated':
        sub = event['data']['object']
        user_id = sub.get('metadata', {}).get('supabase_user_id')
        if user_id:
            price_id = sub['items']['data'][0]['price']['id']
            _build_price_to_plan()
            plan = PRICE_TO_PLAN.get(price_id, 'starter')
            sb.table('subscriptions').update({
                'plan': plan,
                'status': sub['status'],
                'current_period_start': sub['current_period_start'],
                'current_period_end': sub['current_period_end'],
                'cancel_at_period_end': sub.get('cancel_at_period_end', False),
                'updated_at': 'now()',
            }).eq('user_id', user_id).execute()

    elif event_type == 'customer.subscription.deleted':
        sub = event['data']['object']
        user_id = sub.get('metadata', {}).get('supabase_user_id')
        if user_id:
            sb.table('subscriptions').update({
                'plan': 'free',
                'status': 'canceled',
                'cancel_at_period_end': False,
                'updated_at': 'now()',
            }).eq('user_id', user_id).execute()

    elif event_type == 'invoice.payment_failed':
        invoice = event['data']['object']
        customer_id = invoice.get('customer')
        if customer_id:
            sb.table('subscriptions').update({
                'status': 'past_due',
                'updated_at': 'now()',
            }).eq('stripe_customer_id', customer_id).execute()

    sb.table('stripe_events').insert({
        'stripe_event_id': event['id'],
        'event_type': event_type,
    }).execute()

    return jsonify(ok=True), 200

@stripe_bp.route('/api/stripe/subscription', methods=['GET'])
def get_subscription():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    sb = get_admin_sb()
    sub_res = sb.table('subscriptions').select('*').eq('user_id', user_id).execute()

    from middleware import PLAN_LIMITS, _get_today_usage

    if sub_res.data:
        sub = sub_res.data[0]
        plan = sub['plan']
    else:
        plan = 'free'
        sub = {'plan': 'free', 'status': 'active'}

    usage = _get_today_usage(user_id)
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['free'])

    return jsonify({
        'plan': plan,
        'status': sub.get('status', 'active'),
        'cancel_at_period_end': sub.get('cancel_at_period_end', False),
        'current_period_end': sub.get('current_period_end'),
        'usage': {
            'messages_used': usage.get('messages_used', 0),
            'games_used': usage.get('games_used', 0),
            'vision_used': usage.get('vision_used', 0),
        },
        'limits': limits,
    })
