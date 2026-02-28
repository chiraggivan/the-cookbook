# routes/auth.py
from flask import Blueprint, render_template, request, jsonify, session, current_app
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import create_access_token, get_jwt_identity 
from google.oauth2 import id_token
from google.auth.transport import requests
# from app import app

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Serve the login HTML page
@auth_bp.route("/login", methods=['GET'])
def login_page():
    return render_template("auth/google_auth.html", config=current_app.config) # change here for changing it to old style login

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
    
    access_token = create_access_token(
        identity=str(user['user_id']), 
        additional_claims={
            "role": user['role'],
            # "email": user['email']
        }
    )
    session['user_id'] = user['user_id']
    session['role'] = user['role']
    return jsonify({'access_token': access_token}), 200

@auth_bp.route('/google', methods=['POST'])
def google_login():
    data = request.get_json()
    credential = data.get('credential')
    
    if not credential:
        return jsonify({"error": "Missing credential"}), 400
    
    try:
        # Verify the Google ID token
        id_info = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            current_app.config['GOOGLE_CLIENT_ID']
        )
        
        # Extract Google data
        google_sub = id_info['sub']
        email = id_info['email']
        name = id_info.get('name', '')
        picture = id_info.get('picture', '')
        email_verified = id_info.get('email_verified', False)
        #print("id_info :", id_info) 

    except ValueError as e:
        # Invalid token
        current_app.logger.error(f"Google token verification failed: {str(e)}")
        return jsonify({"error": "Invalid Google token"}), 401
    
    # Connect to DB
    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Look up user by email 
        cursor.execute("""
            SELECT user_id, email, google_sub, role, is_active 
            FROM users 
            WHERE email = %s
        """, (email,))
        user = cursor.fetchone()
        
        if user:
            if user['is_active'] == 0:
                return jsonify({"error": "Account is inactive"}), 403
            
            if not user['google_sub']:
                cursor.execute("""
                    UPDATE users 
                    SET google_sub = %s, last_login_at = NOW()
                    WHERE user_id = %s
                """, (google_sub, user['user_id']))
                conn.commit()
            else:
                cursor.execute("""
                    UPDATE users 
                    SET last_login_at = NOW()
                    WHERE user_id = %s
                """, (user['user_id'],))
                conn.commit()
            
        else:
            # New user → create
            cursor.execute("""
                INSERT INTO users (
                    email, email_verified, google_sub, display_name, picture_url,
                    role, is_active, last_login_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, 'user', 1, NOW(), NOW())
            """, (email, 1 if email_verified else 0, google_sub, name, picture))
            conn.commit()
            
            # Get the new user_id
            user_id = cursor.lastrowid
            
            # Optional: fetch the new user for JWT
            cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
        
        # Issue JWT
        access_token = create_access_token(
            identity=str(user['user_id']),
            additional_claims={
                "role": user['role'],
                "email": user['email']
            }
        )

        # create session variable
        session['user_id'] = user['user_id']
        session['role'] = user['role']
        session['email'] = user['email']
        
        return jsonify({
            "access_token": access_token,
            "message": "Login successful"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Google login error: {str(e)}")
        conn.rollback()
        return jsonify({"error": "Server error"}), 500
        
    finally:
        cursor.close()
        conn.close()

