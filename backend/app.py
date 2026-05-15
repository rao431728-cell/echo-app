import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from fitness import fitness_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(fitness_bp)

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
    app.run(debug=True, port=5001)
