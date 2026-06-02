import os
import functools
from datetime import date
from flask import request, jsonify
from supabase_admin import get_admin_sb

PLAN_LIMITS = {
    'free':      {'messages_per_day': 5,    'games_per_day': 0,    'vision': False},
    'starter':   {'messages_per_day': 50,   'games_per_day': 3,    'vision': False},
    'pro':       {'messages_per_day': 200,  'games_per_day': 10,   'vision': True},
    'unlimited': {'messages_per_day': None, 'games_per_day': None, 'vision': True},
}

def _get_user_plan(user_id):
    sb = get_admin_sb()
    res = sb.table('subscriptions').select('plan,status,current_period_end').eq('user_id', user_id).execute()
    if not res.data:
        return 'free'
    sub = res.data[0]
    if sub['status'] in ('active', 'trialing'):
        return sub['plan']
    if sub['status'] == 'past_due':
        return sub['plan']
    return 'free'

def _get_today_usage(user_id):
    sb = get_admin_sb()
    today = date.today().isoformat()
    res = sb.table('usage_tracking').select('*').eq('user_id', user_id).eq('date', today).execute()
    if res.data:
        return res.data[0]
    return {'messages_used': 0, 'games_used': 0, 'vision_used': 0}

def _increment_usage(user_id, usage_type):
    sb = get_admin_sb()
    today = date.today().isoformat()
    col = {'message': 'messages_used', 'game': 'games_used', 'vision': 'vision_used'}.get(usage_type, 'messages_used')

    existing = sb.table('usage_tracking').select('id,' + col).eq('user_id', user_id).eq('date', today).execute()
    if existing.data:
        current = existing.data[0].get(col, 0)
        sb.table('usage_tracking').update({col: current + 1}).eq('id', existing.data[0]['id']).execute()
    else:
        row = {'user_id': user_id, 'date': today, 'messages_used': 0, 'games_used': 0, 'vision_used': 0}
        row[col] = 1
        sb.table('usage_tracking').insert(row).execute()

def check_usage(user_id, usage_type):
    plan = _get_user_plan(user_id)
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['free'])
    usage = _get_today_usage(user_id)

    if usage_type == 'message':
        limit = limits['messages_per_day']
        used = usage.get('messages_used', 0)
    elif usage_type == 'game':
        limit = limits['games_per_day']
        used = usage.get('games_used', 0)
    elif usage_type == 'vision':
        if not limits['vision']:
            return False, plan, usage, limits
        limit = None
        used = 0
    else:
        limit = limits['messages_per_day']
        used = usage.get('messages_used', 0)

    if limit is None:
        return True, plan, usage, limits
    return used < limit, plan, usage, limits

def require_plan(usage_type):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            user_id = None
            if request.is_json and request.json:
                user_id = request.json.get('user_id')
            if not user_id:
                user_id = request.args.get('user_id')
            if not user_id:
                return f(*args, **kwargs)

            allowed, plan, usage, limits = check_usage(user_id, usage_type)
            if not allowed:
                return jsonify({
                    'error': 'Usage limit reached',
                    'plan': plan,
                    'usage': {
                        'messages_used': usage.get('messages_used', 0),
                        'games_used': usage.get('games_used', 0),
                    },
                    'limits': {
                        'messages_per_day': limits.get('messages_per_day', 5),
                        'games_per_day': limits.get('games_per_day', 0),
                    },
                    'upgrade_url': '/pricing',
                }), 429

            result = f(*args, **kwargs)
            _increment_usage(user_id, usage_type)
            return result
        return wrapper
    return decorator
