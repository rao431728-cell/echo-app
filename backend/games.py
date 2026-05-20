import os
import json
import re
from flask import Blueprint, request, jsonify
import anthropic
from supabase import create_client

games_bp = Blueprint('games', __name__)

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


def _extract_json(text):
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
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


def _strip_fences(text):
    text = text.strip()
    text = re.sub(r'^```(?:html)?\s*\n?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\n?```\s*$', '', text)
    return text.strip()


GAME_SYSTEM_PROMPT = """You are the world's best HTML5 game developer. You create complete, fully playable games using pure HTML, CSS, and JavaScript in a single file. Your games are polished, fun, and work perfectly in a browser iframe.

RULES YOU ALWAYS FOLLOW:
1. Return ONLY raw HTML — no markdown, no code fences, no explanation
2. Every game must have: a start screen, actual gameplay, score tracking, game over screen with restart
3. Games must be self-contained — no external dependencies except Google Fonts
4. Use requestAnimationFrame for smooth 60fps gameplay
5. Add keyboard AND touch controls so games work on mobile too
6. Include particle effects, smooth animations, and visual polish
7. Add sound effects using the Web Audio API (generate tones procedurally — no external audio files)
8. Games must be genuinely fun and playable — not just a tech demo
9. Include a HUD showing score, lives, level, and time where relevant
10. Add difficulty progression — games should get harder over time
11. Use beautiful colors and visual design — dark backgrounds with neon/vibrant accents
12. Add screen shake, flash effects, and juice to make hits and events feel satisfying
13. The game canvas should fill the available space responsively
14. Always include a pause function (P key or tap)

GAME TYPES YOU CAN BUILD (and more):
- Arcade shooters (space invaders, asteroids, bullet hell)
- Platformers (side-scrolling with gravity, jumps, collectibles)
- Puzzle games (match-3, sliding puzzles, logic games)
- Racing games (top-down or side-scrolling)
- Tower defense games
- Roguelikes and dungeon crawlers
- Snake, Tetris, Breakout clones
- Card games and board games
- Endless runners
- Rhythm games
- Strategy games
- RPGs with combat systems
- Fighting games
- Physics-based games

Build exactly what the user describes. Be creative. Make it genuinely fun."""

TITLE_SYSTEM_PROMPT = """Given a game description, return a JSON object with a single key "title" — a short, catchy game title (2-4 words max). No explanation. Example: {"title": "Neon Blasters"}"""

REMIX_SYSTEM_PROMPT = """You are an expert HTML5 game developer. You will receive the full HTML of an existing game and a modification instruction. Apply the instruction precisely and return ONLY the complete modified HTML. No explanations. No markdown. No code fences. Raw HTML only. Keep everything that works, only change what was requested. Make sure the game still runs perfectly after your changes."""


@games_bp.route('/games/generate', methods=['POST'])
def generate_game():
    data = request.json or {}
    user_id = data.get('user_id')
    prompt = (data.get('prompt') or '').strip()
    genre = data.get('genre', '')
    style = data.get('style', '')
    features = data.get('features', [])

    if not user_id:
        return jsonify(error='user_id required'), 400
    if not prompt:
        return jsonify(error='Please describe the game you want to build'), 400

    full_prompt = prompt
    if genre:
        full_prompt += f'\nGenre: {genre}'
    if style:
        full_prompt += f'\nVisual style: {style}'
    if features:
        full_prompt += f'\nMust include: {", ".join(features)}'

    try:
        msg = get_claude().messages.create(
            model=MODEL,
            max_tokens=16000,
            system=GAME_SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': full_prompt}],
        )
        html = ''
        for block in msg.content:
            if block.type == 'text':
                html += block.text
        html = _strip_fences(html)

        if not html or '<' not in html:
            return jsonify(error='Failed to generate game. Please try again.'), 500

        title_msg = get_claude().messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=100,
            system=TITLE_SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': prompt}],
        )
        title_text = ''
        for block in title_msg.content:
            if block.type == 'text':
                title_text += block.text
        title_data = _extract_json(title_text)
        title = (title_data or {}).get('title', 'Untitled Game')

        game_id = None
        try:
            result = get_sb().table('game_builds').insert({
                'user_id': user_id,
                'title': title,
                'description': prompt,
                'html_content': html,
                'genre': genre or None,
                'plays': 0,
            }).execute()
            game_id = result.data[0]['id'] if result.data else None
        except Exception:
            pass

        return jsonify(html=html, title=title, game_id=game_id)

    except Exception as e:
        return jsonify(error=str(e)), 500


@games_bp.route('/games/remix', methods=['POST'])
def remix_game():
    data = request.json or {}
    user_id = data.get('user_id')
    game_id = data.get('game_id')
    instruction = (data.get('instruction') or '').strip()
    current_html = (data.get('current_html') or '').strip()

    if not user_id:
        return jsonify(error='user_id required'), 400
    if not instruction:
        return jsonify(error='Please describe what to change'), 400
    if not current_html:
        return jsonify(error='No game to remix'), 400

    try:
        user_prompt = f"INSTRUCTION:\n{instruction}\n\nCURRENT GAME HTML:\n{current_html}"
        msg = get_claude().messages.create(
            model=MODEL,
            max_tokens=16000,
            system=REMIX_SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': user_prompt}],
        )
        html = ''
        for block in msg.content:
            if block.type == 'text':
                html += block.text
        html = _strip_fences(html)

        if not html or '<' not in html:
            return jsonify(error='Remix failed. Try again.'), 500

        if game_id:
            try:
                get_sb().table('game_builds').update({
                    'html_content': html,
                }).eq('id', game_id).eq('user_id', user_id).execute()
            except Exception:
                pass

        return jsonify(html=html, message='Game remixed successfully.')

    except Exception as e:
        return jsonify(error=str(e)), 500


@games_bp.route('/games/library', methods=['GET'])
def game_library():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    try:
        result = get_sb().table('game_builds').select(
            'id, title, description, genre, plays, created_at'
        ).eq('user_id', user_id).order('created_at', desc=True).execute()
        return jsonify(games=result.data or [])
    except Exception as e:
        return jsonify(error=str(e)), 500


@games_bp.route('/games/explore', methods=['GET'])
def explore_games():
    try:
        result = get_sb().table('game_builds').select(
            'id, user_id, title, description, genre, plays, created_at'
        ).order('created_at', desc=True).limit(50).execute()
        return jsonify(games=result.data or [])
    except Exception as e:
        return jsonify(error=str(e)), 500


@games_bp.route('/games/play', methods=['POST'])
def play_game():
    data = request.json or {}
    game_id = data.get('game_id')
    if not game_id:
        return jsonify(error='game_id required'), 400

    try:
        row = get_sb().table('game_builds').select('plays').eq('id', game_id).execute()
        current = (row.data[0]['plays'] or 0) if row.data else 0
        get_sb().table('game_builds').update({'plays': current + 1}).eq('id', game_id).execute()
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(error=str(e)), 500


@games_bp.route('/games/get/<game_id>', methods=['GET'])
def get_game(game_id):
    try:
        result = get_sb().table('game_builds').select('*').eq('id', game_id).execute()
        if not result.data:
            return jsonify(error='Game not found'), 404
        return jsonify(game=result.data[0])
    except Exception as e:
        return jsonify(error=str(e)), 500


@games_bp.route('/games/delete', methods=['POST'])
def delete_game():
    data = request.json or {}
    user_id = data.get('user_id')
    game_id = data.get('game_id')
    if not user_id or not game_id:
        return jsonify(error='user_id and game_id required'), 400

    try:
        get_sb().table('game_likes').delete().eq('game_id', game_id).execute()
        get_sb().table('game_builds').delete().eq('id', game_id).eq('user_id', user_id).execute()
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(error=str(e)), 500
