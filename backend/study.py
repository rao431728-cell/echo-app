import os
import io
import json
import re
import base64
from datetime import date, timedelta
from flask import Blueprint, request, jsonify, Response, stream_with_context
import anthropic
from supabase import create_client
from PyPDF2 import PdfReader

study_bp = Blueprint('study', __name__)

MODEL = 'claude-sonnet-4-6'

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


def _study_profile(user_id):
    res = get_sb().table('study_profiles').select('*').eq('user_id', user_id).execute()
    return res.data[0] if res.data else None


def _system_prompt(profile):
    p = profile or {}
    subjects = ', '.join(p.get('subjects', [])) or 'Not specified'
    level = p.get('education_level', 'Not specified')
    board = p.get('exam_board', 'Not applicable')
    streak = p.get('study_streak', 0)

    return f"""You are Echo Study, an elite AI tutor and study coach. You are patient, encouraging, and incredibly knowledgeable across all subjects and education levels — from primary school to university to professional qualifications.

Student profile:
- Subjects: {subjects}
- Education level: {level}
- Exam board: {board}
- Study streak: {streak} days

You adapt your teaching style to the student's level. For younger students, use simple language and fun examples. For advanced students, use precise academic language.

You can:
- Explain any concept clearly with real-world examples and analogies
- Create practice questions and MCQs
- Generate flashcards
- Build revision plans
- Quiz the student interactively
- Analyse uploaded notes and summarise them
- Identify knowledge gaps and focus on weak areas
- Give exam technique advice
- Motivate and encourage

Always check understanding by asking follow-up questions. Never just dump information — teach interactively.

When generating MCQs, always format them like this:
Q: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [letter]
Explanation: [why this is correct]

When explaining concepts, use this structure:
1. Simple one-line definition
2. Deeper explanation
3. Real-world example
4. Common misconceptions
5. Exam tip (if relevant)"""


@study_bp.route('/study/setup', methods=['POST'])
def setup():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    profile_data = {
        'user_id': user_id,
        'subjects': data.get('subjects', []),
        'education_level': data.get('education_level', ''),
        'exam_board': data.get('exam_board', ''),
        'study_streak': 0,
        'total_sessions': 0,
    }

    get_sb().table('study_profiles').upsert(profile_data, on_conflict='user_id').execute()
    return jsonify(ok=True)


@study_bp.route('/study/profile')
def get_profile():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    profile = _study_profile(user_id)
    if not profile:
        return jsonify(profile=None)

    sessions_res = get_sb().table('study_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(10).execute()
    sessions = sessions_res.data or []

    total_sessions = profile.get('total_sessions', 0)
    streak = profile.get('study_streak', 0)

    return jsonify(
        profile=profile,
        recent_sessions=sessions,
        total_sessions=total_sessions,
        streak=streak,
    )


def _extract_pdf_text(b64_data):
    pdf_bytes = base64.b64decode(b64_data)
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return '\n\n'.join(pages)


@study_bp.route('/study/chat', methods=['POST'])
def chat():
    data = request.json
    user_id = data.get('user_id')
    message = data.get('message', '')
    document_context = data.get('document_context', '')
    file_data = data.get('file_data')
    file_type = data.get('file_type')
    file_mime = data.get('file_mime')
    if not user_id or (not message and not file_data):
        return jsonify(error='user_id and message required'), 400

    profile = _study_profile(user_id)

    hist_res = get_sb().table('study_messages').select('*').eq('user_id', user_id).order('created_at').execute()
    history = hist_res.data or []
    recent = history[-20:]

    system = _system_prompt(profile)
    if document_context:
        system += f"\n\nThe student has shared the following document/notes for context:\n\n{document_context[:8000]}"

    messages = [{'role': m['role'], 'content': m['content']} for m in recent]

    if file_type == 'image' and file_data:
        user_content = []
        if message:
            user_content.append({'type': 'text', 'text': message})
        else:
            user_content.append({'type': 'text', 'text': 'Please analyse this image and help me study from it. Describe what you see and explain any concepts, questions, or notes shown.'})
        user_content.append({
            'type': 'image',
            'source': {
                'type': 'base64',
                'media_type': file_mime or 'image/jpeg',
                'data': file_data,
            },
        })
        messages.append({'role': 'user', 'content': user_content})
    elif file_type == 'pdf' and file_data:
        pdf_text = _extract_pdf_text(file_data)
        combined = message or 'Please analyse these notes and help me study from them.'
        if pdf_text:
            combined += f"\n\n[Uploaded PDF content]:\n{pdf_text[:12000]}"
        messages.append({'role': 'user', 'content': combined})
    else:
        messages.append({'role': 'user', 'content': message})

    stored_msg = message or ('[Sent an image]' if file_type == 'image' else '[Uploaded a PDF]')
    get_sb().table('study_messages').insert({'user_id': user_id, 'role': 'user', 'content': stored_msg}).execute()

    def generate():
        full_response = ''
        with get_claude().messages.stream(
            model=MODEL, max_tokens=4000,
            system=system,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"
        get_sb().table('study_messages').insert({
            'user_id': user_id, 'role': 'assistant', 'content': full_response,
        }).execute()

    return Response(stream_with_context(generate()), content_type='text/event-stream')


@study_bp.route('/study/chat/history')
def chat_history():
    user_id = request.args.get('user_id')
    res = get_sb().table('study_messages').select('role,content').eq('user_id', user_id).order('created_at').execute()
    return jsonify(messages=res.data or [])


@study_bp.route('/study/upload-document', methods=['POST'])
def upload_document():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name', 'Untitled')
    content = data.get('content', '')
    subject = data.get('subject', '')

    if not user_id or not content:
        return jsonify(error='user_id and content required'), 400

    get_sb().table('study_documents').insert({
        'user_id': user_id,
        'name': name,
        'content': content[:50000],
        'subject': subject,
    }).execute()

    prompt = f"""Analyse these student notes and provide:
1. A concise summary (3-5 sentences)
2. Key points (bullet list, max 8)
3. 5 suggested flashcards based on the content

Notes title: {name}
Subject: {subject or 'Not specified'}

Notes content:
{content[:8000]}

Return ONLY valid JSON:
{{
  "summary": "...",
  "key_points": ["point 1", "point 2", ...],
  "flashcards": [
    {{"question": "...", "answer": "...", "difficulty": 1}},
    ...
  ]
}}"""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=4000,
        messages=[{'role': 'user', 'content': prompt}],
    )

    result = _extract_json(msg.content[0].text)
    if result is None:
        return jsonify(error='Failed to analyse document'), 502

    return jsonify(ok=True, analysis=result)


@study_bp.route('/study/generate-flashcards', methods=['POST'])
def generate_flashcards():
    data = request.json
    user_id = data.get('user_id')
    topic = data.get('topic', '')
    subject = data.get('subject', '')
    document_content = data.get('document_content', '')
    count = data.get('count', 10)

    if not user_id:
        return jsonify(error='user_id required'), 400

    profile = _study_profile(user_id)
    level = profile.get('education_level', '') if profile else ''

    source = f"Document content:\n{document_content[:6000]}" if document_content else f"Topic: {topic}"

    prompt = f"""Generate {count} high-quality flashcards for studying.

Subject: {subject}
Education level: {level}
{source}

Return ONLY a valid JSON array:
[
  {{"question": "...", "answer": "...", "difficulty": 1}},
  ...
]

difficulty: 1 = easy, 2 = medium, 3 = hard
Make questions clear and specific. Answers should be concise but complete."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=4000,
        messages=[{'role': 'user', 'content': prompt}],
    )

    cards = _extract_json(msg.content[0].text)
    if not isinstance(cards, list):
        return jsonify(error='Failed to generate flashcards'), 502

    for card in cards:
        get_sb().table('study_flashcards').insert({
            'user_id': user_id,
            'subject': subject,
            'topic': topic,
            'question': card.get('question', ''),
            'answer': card.get('answer', ''),
            'difficulty': card.get('difficulty', 1),
            'next_review': str(date.today()),
        }).execute()

    return jsonify(ok=True, flashcards=cards)


@study_bp.route('/study/flashcards')
def get_flashcards():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    res = get_sb().table('study_flashcards').select('*').eq('user_id', user_id).order('created_at').execute()
    cards = res.data or []

    today = str(date.today())
    due = [c for c in cards if not c.get('next_review') or c['next_review'] <= today]

    return jsonify(flashcards=cards, due_today=due)


@study_bp.route('/study/flashcards/review', methods=['POST'])
def review_flashcard():
    data = request.json
    card_id = data.get('card_id')
    rating = data.get('rating', 'okay')

    if not card_id:
        return jsonify(error='card_id required'), 400

    today = date.today()
    if rating == 'hard':
        next_review = str(today + timedelta(days=1))
    elif rating == 'easy':
        next_review = str(today + timedelta(days=7))
    else:
        next_review = str(today + timedelta(days=3))

    get_sb().table('study_flashcards').update({
        'last_reviewed': str(today),
        'next_review': next_review,
        'times_reviewed': get_sb().table('study_flashcards').select('times_reviewed').eq('id', card_id).execute().data[0].get('times_reviewed', 0) + 1,
    }).eq('id', card_id).execute()

    return jsonify(ok=True, next_review=next_review)


@study_bp.route('/study/generate-mcqs', methods=['POST'])
def generate_mcqs():
    data = request.json
    user_id = data.get('user_id')
    topic = data.get('topic', '')
    subject = data.get('subject', '')
    count = data.get('count', 10)
    difficulty = data.get('difficulty', 'Mixed')
    document_content = data.get('document_content', '')

    if not user_id:
        return jsonify(error='user_id required'), 400

    profile = _study_profile(user_id)
    level = profile.get('education_level', '') if profile else ''
    board = profile.get('exam_board', '') if profile else ''

    source = f"Based on this document:\n{document_content[:6000]}" if document_content else f"Topic: {topic}"

    prompt = f"""Generate exactly {count} multiple choice questions.

Subject: {subject}
Education level: {level}
Exam board: {board}
Difficulty: {difficulty}
{source}

Return ONLY a valid JSON array:
[
  {{
    "question": "...",
    "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "answer": "A",
    "explanation": "..."
  }},
  ...
]

Make questions exam-style. Cover different aspects of the topic. Ensure only one correct answer per question. Distractors should be plausible."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=8000,
        messages=[{'role': 'user', 'content': prompt}],
    )

    mcqs = _extract_json(msg.content[0].text)
    if not isinstance(mcqs, list):
        return jsonify(error='Failed to generate MCQs'), 502

    return jsonify(ok=True, mcqs=mcqs)


@study_bp.route('/study/generate-revision-plan', methods=['POST'])
def generate_revision_plan():
    data = request.json
    user_id = data.get('user_id')
    subjects = data.get('subjects', [])
    exam_date = data.get('exam_date', '')
    hours_per_day = data.get('hours_per_day', 3)

    if not user_id:
        return jsonify(error='user_id required'), 400

    profile = _study_profile(user_id)
    level = profile.get('education_level', '') if profile else ''
    board = profile.get('exam_board', '') if profile else ''

    prompt = f"""Create a detailed revision plan.

Subjects: {', '.join(subjects) if subjects else 'All subjects'}
Exam date: {exam_date or 'In 4 weeks'}
Hours available per day: {hours_per_day}
Education level: {level}
Exam board: {board}

Return ONLY valid JSON:
{{
  "total_weeks": 4,
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Foundations and key concepts",
      "days": [
        {{
          "day": "Monday",
          "sessions": [
            {{
              "subject": "Maths",
              "topic": "Algebra basics",
              "type": "notes",
              "duration_minutes": 45
            }}
          ]
        }}
      ]
    }}
  ]
}}

type can be: notes, flashcards, past_papers, practice_questions, mind_maps, revision
Distribute subjects evenly. Build difficulty over weeks. Include breaks and variety. Be realistic about timing."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=8000,
        messages=[{'role': 'user', 'content': prompt}],
    )

    plan = _extract_json(msg.content[0].text)
    if plan is None:
        return jsonify(error='Failed to generate revision plan'), 502

    return jsonify(ok=True, plan=plan)


@study_bp.route('/study/explain', methods=['POST'])
def explain_concept():
    data = request.json
    user_id = data.get('user_id')
    concept = data.get('concept', '')
    subject = data.get('subject', '')

    if not concept:
        return jsonify(error='concept required'), 400

    profile = _study_profile(user_id) if user_id else None
    level = profile.get('education_level', '') if profile else ''
    board = profile.get('exam_board', '') if profile else ''

    prompt = f"""Explain this concept clearly:

Concept: {concept}
Subject: {subject}
Education level: {level}
Exam board: {board}

Structure your explanation:
1. Simple one-line definition
2. Deeper explanation with detail
3. Real-world example or analogy
4. Common misconceptions
5. Exam tip (if relevant to their level/board)

Be clear, engaging, and educational. Use language appropriate for their level."""

    msg = get_claude().messages.create(
        model=MODEL, max_tokens=4000,
        messages=[{'role': 'user', 'content': prompt}],
    )

    return jsonify(explanation=msg.content[0].text)


@study_bp.route('/study/complete-session', methods=['POST'])
def complete_session():
    data = request.json
    user_id = data.get('user_id')
    subject = data.get('subject', '')
    topic = data.get('topic', '')
    session_type = data.get('session_type', 'quiz')
    score = data.get('score')
    total_questions = data.get('total_questions')
    duration_minutes = data.get('duration_minutes', 0)

    if not user_id:
        return jsonify(error='user_id required'), 400

    get_sb().table('study_sessions').insert({
        'user_id': user_id,
        'subject': subject,
        'topic': topic,
        'session_type': session_type,
        'score': score,
        'total_questions': total_questions,
        'duration_minutes': duration_minutes,
    }).execute()

    profile = _study_profile(user_id)
    if profile:
        today_str = str(date.today())
        yesterday = str(date.today() - timedelta(days=1))
        last = profile.get('last_study_date')
        streak = profile.get('study_streak', 0)

        if last == yesterday or last is None:
            streak += 1
        elif last != today_str:
            streak = 1

        get_sb().table('study_profiles').update({
            'study_streak': streak,
            'last_study_date': today_str,
            'total_sessions': (profile.get('total_sessions', 0) or 0) + 1,
        }).eq('user_id', user_id).execute()

    return jsonify(ok=True)


@study_bp.route('/study/sessions')
def get_sessions():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    res = get_sb().table('study_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
    return jsonify(sessions=res.data or [])


@study_bp.route('/study/documents')
def get_documents():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400

    res = get_sb().table('study_documents').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
    return jsonify(documents=res.data or [])
