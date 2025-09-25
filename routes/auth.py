# routes/auth.py
from flask import Blueprint, render_template, request, jsonify, session
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import create_access_token


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Serve the login HTML page
@auth_bp.route("/login", methods=['GET'])
def login_page():
    return render_template("auth/login.html")

# Login endpoint to generate JWT
@auth_bp.route('/login', methods=['POST'])
def login():
    #check if username and password is provided
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400

    #try connecting db
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)

    #check if user and password matches in db
    cursor.execute("SELECT user_id, password, role FROM users WHERE username = %s AND is_active = TRUE", (data['username'],))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user or not checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=str(user['user_id']), additional_claims={"role": user['role']})
    session['user_id'] = user['user_id']
    return jsonify({'access_token': access_token}), 200
