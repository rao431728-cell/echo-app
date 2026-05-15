import os
import json
import base64
from datetime import date, timedelta
from flask import Blueprint, request, jsonify, Response, stream_with_context
import anthropic
from supabase import create_client

fitness_bp = Blueprint('fitness', __name__)

MODEL = 'claude-opus-4-5'

_sb = None
_claude = None

def get_sb():
    global _sb
    if _sb is None:
        _sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_PUBLISHABLE_KEY'])
    return _sb

def get_claude():
    global _claude
    if _claude is None:
        key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not key:
            raise RuntimeError('ANTHROPIC_API_KEY not set')
        _claude = anthropic.Anthropic(api_key=key)
    return _claude


import re

def _extract_json(text):
    text = text.strip()
    # Try parsing as-is first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Extract from markdown code fences
    m = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Find the first { ... } or [ ... ] block
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        if start == -1:
            continue
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            c = text[i]
            if escape:
                escape = False
                continue
            if c == '\\' and in_string:
                escape = True
                continue
            if c == '"' and not escape:
                in_string = not in_string
                continue
            if in_string:
                continue
            if c == start_char:
                depth += 1
            elif c == end_char:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        break
    return None


def _profile(user_id):
    res = get_sb().table('fitness_profiles').select('*').eq('user_id', user_id).execute()
    return res.data[0] if res.data else None


def _today_workout(profile):
    if not profile or not profile.get('program'):
        return None
    program = profile['program']
    weeks = program.get('weeks', [])
    if not weeks:
        return None
    start = profile.get('created_at', '')[:10]
    if not start:
        return None
    from datetime import datetime
    try:
        start_date = datetime.strptime(start, '%Y-%m-%d').date()
    except ValueError:
        return None
    today = date.today()
    delta = (today - start_date).days
    week_idx = (delta // 7) % len(weeks)
    day_idx = delta % 7
    week = weeks[week_idx]
    days = week.get('days', [])
    if day_idx >= len(days):
        return None
    day = days[day_idx]
    if day.get('type') == 'Rest':
        return None
    return day


@fitness_bp.route('/fitness/profile')
def get_profile():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400
    profile = _profile(user_id)
    if not profile:
        return jsonify(profile=None)

    today_workout = _today_workout(profile)

    wk_res = get_sb().table('fitness_workouts').select('*').eq('user_id', user_id).execute()
    workouts = wk_res.data or []
    today_str = str(date.today())
    week_start = date.today() - timedelta(days=date.today().weekday())
    workouts_this_week = sum(
        1 for w in workouts
        if w.get('completed') and w.get('date', '') >= str(week_start)
    )

    wl_res = get_sb().table('fitness_weight_log').select('*').eq('user_id', user_id).order('date').execute()
    weight_log = wl_res.data or []

    weekly_workouts = []
    if workouts:
        from collections import Counter
        week_counts = Counter()
        for w in workouts:
            if w.get('completed') and w.get('date'):
                d = w['date']
                wk = d[:7]
                week_counts[wk] += 1
        for wk in sorted(week_counts.keys())[-8:]:
            weekly_workouts.append({'week': wk, 'count': week_counts[wk]})

    total_workouts = sum(1 for w in workouts if w.get('completed'))
    max_streak = profile.get('streak', 0)

    all_workouts = [{'date': w['date']} for w in workouts if w.get('completed') and w.get('date')]

    meals_res = get_sb().table('fitness_meals').select('*').eq('user_id', user_id).eq('date', today_str).execute()
    today_meals = meals_res.data[0] if meals_res.data else None

    return jsonify(
        profile=profile,
        today_workout=today_workout,
        workouts_this_week=workouts_this_week,
        weight_log=weight_log,
        weekly_workouts=weekly_workouts,
        total_workouts=total_workouts,
        max_streak=max_streak,
        all_workouts=all_workouts,
        today_meals=today_meals,
    )


@fitness_bp.route('/fitness/onboarding', methods=['POST'])
def onboarding():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    prompt = f"""Create a personalized multi-week workout program. Return ONLY valid JSON.

Client profile:
- Name: {data.get('name')}
- Age: {data.get('age')}
- Weight: {data.get('weight')} {data.get('weight_unit', 'kg')}
- Height: {data.get('height')} {data.get('height_unit', 'cm')}
- Goal: {data.get('goal')}
- Equipment: {', '.join(data.get('equipment', []))}
- Training days/week: {data.get('days_per_week')}
- Fitness level: {data.get('fitness_level')}
- Injuries: {data.get('injuries') or 'None'}

Return this exact JSON structure:
{{
  "name": "Program name",
  "weeks": [
    {{
      "focus": "Week focus description",
      "days": [
        {{
          "label": "Day 1 - Push",
          "type": "Push",
          "warmup": [{{"name": "Exercise", "duration": "5 min"}}],
          "exercises": [{{"name": "Exercise", "sets": 3, "reps": "8-12", "rest": 60}}],
          "cooldown": [{{"name": "Exercise", "duration": "3 min"}}]
        }},
        {{
          "label": "Day 2 - Rest",
          "type": "Rest"
        }}
      ]
    }}
  ]
}}

Create a {data.get('days_per_week')}-day split over 4 weeks. Include rest days. Each training day must have warmup, exercises (5-8), and cooldown. Tailor everything to their level and goal. Only return the JSON, no explanation."""

    try:
        msg = get_claude().messages.create(
            model=MODEL, max_tokens=16000,
            messages=[{'role': 'user', 'content': prompt}]
        )
    except Exception as e:
        return jsonify(error=f'AI service error: {e}'), 502

    if msg.stop_reason == 'max_tokens':
        print(f"WARNING: onboarding response truncated at max_tokens", flush=True)

    text = msg.content[0].text.strip()
    program = _extract_json(text)
    if program is None:
        print(f"PARSE FAILED. Raw response ({len(text)} chars):\n{repr(text[:500])}", flush=True)
        return jsonify(error='Failed to parse program from AI response'), 502

    profile_data = {
        'user_id': user_id,
        'name': data.get('name'),
        'age': int(data.get('age', 0)),
        'weight': float(data.get('weight', 0)),
        'weight_unit': data.get('weight_unit', 'kg'),
        'height': float(data.get('height', 0)),
        'height_unit': data.get('height_unit', 'cm'),
        'goal': data.get('goal'),
        'equipment': data.get('equipment', []),
        'days_per_week': int(data.get('days_per_week', 3)),
        'fitness_level': data.get('fitness_level'),
        'injuries': data.get('injuries', ''),
        'program': program,
        'streak': 0,
    }

    try:
        get_sb().table('fitness_profiles').upsert(profile_data, on_conflict='user_id').execute()
        get_sb().table('fitness_weight_log').insert({
            'user_id': user_id,
            'weight': float(data.get('weight', 0)),
        }).execute()
    except Exception as e:
        return jsonify(error=f'Database error: {e}'), 500

    return jsonify(ok=True, program=program)


@fitness_bp.route('/fitness/program')
def get_program():
    user_id = request.args.get('user_id')
    profile = _profile(user_id)
    if not profile:
        return jsonify(program=None)
    return jsonify(program=profile.get('program'))


@fitness_bp.route('/fitness/complete-workout', methods=['POST'])
def complete_workout():
    data = request.json
    user_id = data.get('user_id')
    workout = data.get('workout')
    rating = data.get('rating', 0)

    get_sb().table('fitness_workouts').insert({
        'user_id': user_id,
        'workout': workout,
        'completed': True,
        'rating': rating,
    }).execute()

    profile = _profile(user_id)
    if profile:
        last = profile.get('last_workout_date')
        today_str = str(date.today())
        yesterday = str(date.today() - timedelta(days=1))
        streak = profile.get('streak', 0)
        if last == yesterday:
            streak += 1
        elif last != today_str:
            streak = 1
        get_sb().table('fitness_profiles').update({
            'streak': streak,
            'last_workout_date': today_str,
        }).eq('user_id', user_id).execute()

    return jsonify(ok=True)


@fitness_bp.route('/fitness/chat', methods=['POST'])
def chat():
    data = request.json
    user_id = data.get('user_id')
    message = data.get('message', '')
    if not user_id or not message:
        return jsonify(error='user_id and message required'), 400

    profile = _profile(user_id)

    hist_res = get_sb().table('fitness_messages').select('*').eq('user_id', user_id).order('created_at').execute()
    history = hist_res.data or []
    recent = history[-20:]

    wk_res = get_sb().table('fitness_workouts').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(5).execute()
    recent_workouts = wk_res.data or []
    workout_summary = '; '.join(
        f"{w.get('date', '?')}: {w.get('workout', {}).get('label', 'workout')}, rated {w.get('rating', '?')}/5"
        for w in recent_workouts
    ) or 'No workouts yet'

    p = profile or {}
    system_prompt = f"""You are Echo, an elite personal fitness trainer and coach. You are motivating, knowledgeable, direct, and genuinely care about your client's results. You combine the knowledge of a personal trainer, nutritionist, and sports psychologist.

User profile:
- Name: {p.get('name', 'Unknown')}
- Age: {p.get('age', '?')}
- Weight: {p.get('weight', '?')}{p.get('weight_unit', 'kg')}
- Height: {p.get('height', '?')}{p.get('height_unit', 'cm')}
- Goal: {p.get('goal', '?')}
- Equipment: {', '.join(p.get('equipment', [])) or '?'}
- Training days per week: {p.get('days_per_week', '?')}
- Fitness level: {p.get('fitness_level', '?')}
- Injuries: {p.get('injuries') or 'None'}
- Current streak: {p.get('streak', 0)} days
- Workout history: {workout_summary}

Never give generic advice. Everything must be personalised to this specific person. Reference their history naturally. Push them to be better. Be direct, motivating, and real. Add personality — you are their trainer, not a robot."""

    messages = [{'role': m['role'], 'content': m['content']} for m in recent]
    messages.append({'role': 'user', 'content': message})

    get_sb().table('fitness_messages').insert({'user_id': user_id, 'role': 'user', 'content': message}).execute()

    def generate():
        full_response = ''
        with get_claude().messages.stream(
            model=MODEL, max_tokens=1024,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"
        get_sb().table('fitness_messages').insert({
            'user_id': user_id, 'role': 'assistant', 'content': full_response,
        }).execute()

    return Response(stream_with_context(generate()), content_type='text/event-stream')


@fitness_bp.route('/fitness/chat/history')
def chat_history():
    user_id = request.args.get('user_id')
    res = get_sb().table('fitness_messages').select('role,content').eq('user_id', user_id).order('created_at').execute()
    return jsonify(messages=res.data or [])


@fitness_bp.route('/fitness/scan-food', methods=['POST'])
def scan_food():
    data = request.json
    user_id = data.get('user_id')
    image_b64 = data.get('image')
    if not image_b64:
        return jsonify(error='image required'), 400

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=512,
        messages=[{
            'role': 'user',
            'content': [
                {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': image_b64}},
                {'type': 'text', 'text': 'Analyze this food photo. Return ONLY valid JSON with these fields: food_name (string), calories (int), protein (int grams), carbs (int grams), fats (int grams), portion (string describing estimated portion size). Be as accurate as possible.'},
            ],
        }],
    )

    text = msg.content[0].text.strip()
    analysis = _extract_json(text)
    if analysis is None:
        return jsonify(error='Failed to parse food analysis'), 502
    return jsonify(analysis=analysis)


@fitness_bp.route('/fitness/generate-meals', methods=['POST'])
def generate_meals():
    data = request.json
    user_id = data.get('user_id')
    tdee = data.get('tdee', 2000)
    protein = data.get('protein', 150)
    carbs = data.get('carbs', 200)
    fats = data.get('fats', 70)

    profile = _profile(user_id)
    p = profile or {}

    prompt = f"""Generate a full day meal plan for this person. Return ONLY valid JSON.

Target macros: {tdee} kcal, {protein}g protein, {carbs}g carbs, {fats}g fats
Goal: {p.get('goal', 'general fitness')}
Injuries/restrictions: {p.get('injuries') or 'None'}

Return this exact JSON structure:
{{
  "breakfast": [{{"name": "Meal name", "calories": 400, "protein": 30, "carbs": 40, "fats": 15}}],
  "lunch": [{{"name": "Meal name", "calories": 500, "protein": 40, "carbs": 50, "fats": 18}}],
  "dinner": [{{"name": "Meal name", "calories": 500, "protein": 40, "carbs": 50, "fats": 18}}],
  "snacks": [{{"name": "Snack name", "calories": 200, "protein": 15, "carbs": 20, "fats": 8}}]
}}

Make meals practical, tasty, and easy to prepare. Hit the macro targets closely. Only return the JSON."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}],
    )

    text = msg.content[0].text.strip()
    meals = _extract_json(text)
    if meals is None:
        return jsonify(error='Failed to parse meal plan'), 502
    return jsonify(meals=meals)


@fitness_bp.route('/fitness/save-meals', methods=['POST'])
def save_meals():
    data = request.json
    user_id = data.get('user_id')
    today_str = str(date.today())
    food_log = data.get('food_log', [])
    meals = data.get('meals', {})
    total_cals = sum(f.get('calories', 0) for f in food_log)

    existing = get_sb().table('fitness_meals').select('id').eq('user_id', user_id).eq('date', today_str).execute()
    row = {'user_id': user_id, 'date': today_str, 'meals': {'meals': meals, 'food_log': food_log}, 'total_calories': total_cals}
    if existing.data:
        get_sb().table('fitness_meals').update(row).eq('id', existing.data[0]['id']).execute()
    else:
        get_sb().table('fitness_meals').insert(row).execute()
    return jsonify(ok=True)


@fitness_bp.route('/fitness/log-weight', methods=['POST'])
def log_weight_route():
    data = request.json
    user_id = data.get('user_id')
    weight = data.get('weight')
    if not user_id or not weight:
        return jsonify(error='user_id and weight required'), 400
    get_sb().table('fitness_weight_log').insert({
        'user_id': user_id, 'weight': float(weight),
    }).execute()
    return jsonify(ok=True)


@fitness_bp.route('/fitness/explain-exercise', methods=['POST'])
def explain_exercise():
    data = request.json
    exercise_name = data.get('exercise_name', '')
    user_id = data.get('user_id')
    profile = _profile(user_id) if user_id else None
    p = profile or {}

    prompt = f"""Explain how to perform "{exercise_name}" properly.

Person's fitness level: {p.get('fitness_level', 'intermediate')}
Injuries: {p.get('injuries') or 'None'}

Cover:
1. Setup and starting position
2. Step-by-step execution
3. Common mistakes to avoid
4. Breathing pattern
5. Modifications if they have injuries

Keep it concise and practical. Use a motivating, trainer-like tone."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=512,
        messages=[{'role': 'user', 'content': prompt}],
    )
    return jsonify(explanation=msg.content[0].text)


@fitness_bp.route('/fitness/adjust-program', methods=['POST'])
def adjust_program():
    data = request.json
    user_id = data.get('user_id')
    direction = data.get('direction', 'regenerate')
    profile = _profile(user_id)
    if not profile:
        return jsonify(error='No profile found'), 404

    p = profile
    current = json.dumps(p.get('program', {}))

    if direction == 'regenerate':
        instruction = "Create a completely new program with different exercises but same structure."
    elif direction == 'harder':
        instruction = "Make this program harder: increase sets, reps, or add more challenging exercise variations. Keep the same structure."
    else:
        instruction = "Make this program easier: reduce sets/reps, substitute easier exercise variations, add more rest. Keep the same structure."

    prompt = f"""{instruction}

Client: {p.get('name')}, {p.get('fitness_level')} level, goal: {p.get('goal')}, equipment: {', '.join(p.get('equipment', []))}, {p.get('days_per_week')} days/week, injuries: {p.get('injuries') or 'None'}

Current program:
{current}

Return ONLY the updated program as valid JSON with the same structure (name, weeks array with days containing label, type, warmup, exercises, cooldown). No explanation."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=16000,
        messages=[{'role': 'user', 'content': prompt}],
    )

    text = msg.content[0].text.strip()
    program = _extract_json(text)
    if program is None:
        return jsonify(error='Failed to parse adjusted program'), 502

    get_sb().table('fitness_profiles').update({'program': program}).eq('user_id', user_id).execute()
    return jsonify(program=program)
