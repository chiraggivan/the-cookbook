from flask import jsonify#, request#, Blueprint, render_template
from db import get_db_connection
from mysql.connector import Error
#from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt #, JWTManager,  create_access_token
from . import ingredients_api_bp

# Delete ingredient
@ingredients_api_bp.route('/delete_ingredient/<int:ingredient_id>', methods=['DELETE'])
@jwt_required()
def delete_recipe(ingredient_id):    
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get("role", "user")
    # check if user id found in token
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    # check if user is having role as admin
    if not (user_role == "admin"):
        return jsonify({"error": "Admin privileges required"}), 403

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists & user has the privilege to delete the ingredient
        cursor.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user or not(user['role'] == 'admin'):
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found or Admin privileges required'}), 403

        # validate is ingredient id exists
        cursor.execute("SELECT 1 FROM ingredients WHERE ingredient_id = %s AND is_active = 1", (ingredient_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'No active ingredient exists with the id {ingredient_id}'}), 403

        # soft delete the ingredient from db
        cursor.execute("""
            UPDATE ingredients 
            SET is_active = 0, end_date = CURRENT_TIMESTAMP, notes = "Soft deleted by user : %s"
            WHERE ingredient_id = %s 
        """,(user_id, ingredient_id))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Ingredient deleted successfully"}), 201

    except Error as err:
        return jsonify({'error': str(err)}), 500

# Reactivate deleted ingredient
@ingredients_api_bp.route('/activate_ingredient/<int:ingredient_id>', methods=['DELETE'])
@jwt_required()
def activate_recipe(ingredient_id):    
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get("role", "user")
    # check if user id found in token
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    # check if user is having role as admin
    if not (user_role == "admin"):
        return jsonify({"error": "Admin privileges required"}), 403
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists & user has the privilege to delete the ingredient
        cursor.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user or not(user['role'] == 'admin'):
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found or Admin privileges required'}), 403

        # validate is ingredient id exists
        cursor.execute("SELECT 1 FROM ingredients WHERE ingredient_id = %s AND is_active = 0", (ingredient_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'No ingredient exists with the id {ingredient_id} that is not active.'}), 403

        # soft delete the ingredient from db
        cursor.execute("""
            UPDATE ingredients 
            SET is_active = 1, end_date = NULL, notes = "Soft deleted by user : %s"
            WHERE ingredient_id = %s 
        """,(user_id, ingredient_id))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Ingredient deleted successfully"}), 201

    except Error as err:
        return jsonify({'error': str(err)}), 500



