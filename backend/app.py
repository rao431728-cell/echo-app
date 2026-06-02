import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from fitness import fitness_bp
from study import study_bp
from games import games_bp
from stripe_bp import stripe_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(fitness_bp)
app.register_blueprint(study_bp)
app.register_blueprint(games_bp)
app.register_blueprint(stripe_bp)

@app.route('/api/health')
def health():
    return jsonify(status='ok')

@app.route('/api/auth/user', methods=['POST'])
def auth_user():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify(error='user_id required'), 400
    return jsonify(ok=True, user_id=user_id)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
