import os
import json
import re
import time
from flask import Blueprint, request, jsonify
import anthropic
from supabase import create_client

games_bp = Blueprint('games', __name__)

MODEL_PRIMARY = 'claude-opus-4-6'
MODEL_FALLBACK = 'claude-sonnet-4-6'
MODEL_TITLE = 'claude-haiku-4-5-20251001'

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


def _call_claude_with_retry(model, system, messages, max_tokens, max_retries=2):
    models_to_try = [model]
    if model == MODEL_PRIMARY:
        models_to_try.append(MODEL_FALLBACK)

    last_error = None
    for current_model in models_to_try:
        for attempt in range(max_retries):
            try:
                msg = get_claude().messages.create(
                    model=current_model,
                    max_tokens=max_tokens,
                    system=system,
                    messages=messages,
                )
                text = ''
                for block in msg.content:
                    if block.type == 'text':
                        text += block.text
                return text, current_model
            except anthropic.RateLimitError:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                last_error = 'Rate limited. Please wait a moment and try again.'
            except anthropic.AuthenticationError:
                last_error = 'API key is invalid or expired. Please check your Anthropic API key.'
                break
            except anthropic.BadRequestError as e:
                last_error = f'Bad request: {str(e)}'
                break
            except anthropic.APIError as e:
                if 'credit' in str(e).lower() or 'billing' in str(e).lower() or 'insufficient' in str(e).lower():
                    last_error = 'API credits depleted. Please top up your Anthropic account.'
                    break
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                last_error = f'API error: {str(e)}'
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                last_error = str(e)

    raise RuntimeError(last_error or 'All models failed')


GAME_SYSTEM_PROMPT = """You are a AAA-quality HTML5 game developer who builds games that feel like they belong on Steam or the App Store — not simple tech demos. Every game you create is a COMPLETE experience with depth, progression, and polish that makes players forget they're playing in a browser.

RETURN ONLY RAW HTML. No markdown. No code fences. No explanation text. Just the HTML file.

═══ QUALITY STANDARD ═══
Your games must feel PREMIUM. Think: "I can't believe this runs in a browser." Every game needs:

VISUAL EXCELLENCE:
- Rich color palettes with gradients, not flat single colors
- Layered parallax backgrounds (stars, clouds, grids) that create depth
- Particle systems everywhere: explosions, trails, ambient dust, sparks on impact
- Screen shake on impacts, flash effects on hits, slow-motion on kills
- Smooth easing on all movement (no linear jumps)
- Glowing effects using shadows (ctx.shadowBlur/shadowColor)
- Animated title screens with particle backgrounds, not plain text
- Death/game-over animations (fade, dissolve, explode)
- UI elements with rounded corners, gradients, subtle borders

AUDIO DESIGN (Web Audio API — procedural, no external files):
- Distinct sounds for: shooting, hitting, dying, collecting, leveling up, menu select
- Background music using oscillators (simple melody loop or ambient drone)
- Layer multiple oscillator types (sine, square, sawtooth) for richer sounds
- Volume envelope (attack/decay) on every sound so nothing clicks or pops

GAMEPLAY DEPTH:
- Multiple enemy types with different behaviors (chasers, shooters, tanks, swarmers)
- At least 3-5 power-ups or upgrades that change gameplay meaningfully
- Combo systems or multipliers that reward skilled play
- Progressive difficulty: new enemy types, faster spawns, new mechanics every few levels
- Mini-boss every 5 levels, major boss every 10 levels (for applicable genres)
- Lives system (3 lives default) with invincibility frames after hit
- High score tracking with localStorage persistence
- At least 3 distinct visual stages/environments that change as levels progress

GAME FEEL ("JUICE"):
- Enemies flash white when hit before dying
- Player blinks during invincibility frames
- Collectibles bob up and down with a gentle sine wave
- Score numbers float up from where points were earned (+100, +500)
- Camera/screen shake intensity scales with explosion size
- Freeze frames (2-3 frame pause) on big kills for impact
- Trail effects on fast-moving objects (bullets, player dash)

CONTROLS:
- Keyboard: Arrow keys OR WASD, Space to shoot/jump, P to pause, Enter to start/restart
- Touch: Virtual joystick (left side) + action button (right side) for mobile
- Controls must feel responsive with zero input lag

REQUIRED SCREENS:
1. Title screen: animated background, game title with glow effect, "Press ENTER or Tap to Start", high score display, brief controls hint
2. Gameplay: full HUD with score, level, lives (as hearts/icons not just numbers), combo counter if applicable
3. Level transition: brief "LEVEL X" announcement with style
4. Pause overlay: semi-transparent dark overlay, "PAUSED" text, resume instructions
5. Game over: final score, high score comparison, "NEW HIGH SCORE!" celebration if beaten, restart prompt
6. Boss warning: "WARNING" flash before boss encounters

TECHNICAL:
- Canvas-based rendering at 60fps via requestAnimationFrame
- Delta-time based movement (not frame-dependent)
- Responsive canvas that fills available space
- Efficient collision detection (distance-based for circles, AABB for rectangles)
- Object pooling for bullets/particles to prevent GC stutters
- Clean game state management (menu/playing/paused/gameover states)

═══ 3D / FIRST-PERSON GAMES (RAYCASTING) ═══
When the user asks for a first-person shooter, FPS, 3D dungeon, or anything first-person:
- Use RAYCASTING (like Wolfenstein 3D / DOOM) — cast rays from player viewpoint to render walls
- Textured or color-shaded walls with distance-based darkening (fog effect)
- Floor/ceiling rendering with gradient or checkerboard pattern
- Minimap in the corner showing the 2D level layout and player position
- Enemies rendered as scaled sprites that face the player (billboard sprites)
- Multiple weapon types (pistol, shotgun, rifle) with different fire rates and damage
- Weapon sprite/animation at bottom center of screen (bob while walking)
- Head-bob effect while moving for immersion
- Door mechanics (press E/Space near a door to open it)
- Pickup items on the ground (health, ammo, keys)
- Multiple maze-like levels with increasing complexity
- Enemy AI: patrol, chase when player is spotted, shoot back
- Crosshair in center of screen
- HUD: health bar, ammo count, current weapon, minimap, kill count
- Mouse look OR keyboard turning (left/right arrows or A/D), forward/back with W/S or up/down
- Muzzle flash effect when shooting
- Blood splatter particles when enemies are hit
- Ambient sound (footsteps while moving, enemy growls when nearby)
- Level generation can be procedural (random maze) or hand-crafted

For 3D racing: use pseudo-3D road rendering (road segments scaling toward horizon).
For 3D flight: use simple wireframe or filled polygon terrain with pitch/roll controls.

═══ FINAL RULE ═══
Build exactly what the user describes, but ALWAYS elevate it beyond what they asked for. If they say "snake game", build the most incredible snake game ever made in a browser — with neon trails, pulsing grid backgrounds, screen-shake when eating, multiple fruit types, speed zones, and a boss snake that appears every 10 levels. If they say "FPS", build a full Wolfenstein-quality raycaster with multiple weapons, enemy types, and procedural levels."""

TITLE_SYSTEM_PROMPT = """Given a game description, return a JSON object with a single key "title" — a short, catchy game title (2-4 words max). No explanation. Example: {"title": "Neon Blasters"}"""

REMIX_SYSTEM_PROMPT = """You are a AAA-quality HTML5 game developer. You will receive the full HTML of an existing game and a modification instruction.

RULES:
1. Return ONLY the complete modified HTML. No explanations. No markdown. No code fences. Raw HTML only.
2. Keep everything that works — only change what was requested.
3. When adding features, match the visual quality and polish level of the existing game.
4. If adding enemies, give them unique behaviors, not just reskins.
5. If adding power-ups, make them visually distinct with particle effects and sound.
6. If changing visuals, maintain the premium quality — gradients, glow effects, particles.
7. Make sure the game still runs perfectly after your changes.
8. ALWAYS add sound effects for any new gameplay elements you add."""


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
        raw_html, model_used = _call_claude_with_retry(
            MODEL_PRIMARY,
            GAME_SYSTEM_PROMPT,
            [{'role': 'user', 'content': full_prompt}],
            max_tokens=30000,
        )
        html = _strip_fences(raw_html)

        if not html or '<' not in html:
            return jsonify(error='Failed to generate game. Please try again.'), 500

        title = 'Untitled Game'
        try:
            title_text, _ = _call_claude_with_retry(
                MODEL_TITLE,
                TITLE_SYSTEM_PROMPT,
                [{'role': 'user', 'content': prompt}],
                max_tokens=100,
                max_retries=1,
            )
            title_data = _extract_json(title_text)
            title = (title_data or {}).get('title', 'Untitled Game')
        except Exception:
            pass

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

    except RuntimeError as e:
        return jsonify(error=str(e)), 500
    except Exception as e:
        msg = str(e)
        if 'credit' in msg.lower() or 'billing' in msg.lower():
            return jsonify(error='API credits depleted. Please top up your Anthropic account.'), 402
        if 'auth' in msg.lower() or 'key' in msg.lower():
            return jsonify(error='API key issue. Please check your Anthropic API key.'), 401
        return jsonify(error='Something went wrong generating your game. Please try again.'), 500


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
        raw_html, _ = _call_claude_with_retry(
            MODEL_PRIMARY,
            REMIX_SYSTEM_PROMPT,
            [{'role': 'user', 'content': user_prompt}],
            max_tokens=30000,
        )
        html = _strip_fences(raw_html)

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

    except RuntimeError as e:
        return jsonify(error=str(e)), 500
    except Exception as e:
        msg = str(e)
        if 'credit' in msg.lower() or 'billing' in msg.lower():
            return jsonify(error='API credits depleted. Please top up your Anthropic account.'), 402
        return jsonify(error='Something went wrong. Please try again.'), 500


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
