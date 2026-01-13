from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from mysql.connector import Error
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import dishes_api_bp


# Delete dishes prepared by user
@dishes_api_bp.route('/delete_dish/<int:dish_id>', methods=['DELETE'])
@jwt_required()
def delete_dishes(dish_id):

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT 1 FROM dishes 
            WHERE user_id = %s AND dish_id = %s AND is_active = 1
        """, (s_user_id, dish_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No particular active dish found for the user.'}), 404

        # Update dish, make is_active = 0
        cursor.execute("""
            UPDATE dishes
            SET is_active = 0, end_date = CURRENT_TIMESTAMP
            WHERE dish_id = %s
        """,(dish_id,))

        cursor.execute("""
            UPDATE dish_ingredients
            SET is_active = 0, end_date = CURRENT_TIMESTAMP
            WHERE dish_id = %s
        """,(dish_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message":"Dish deleted successfully"}), 201
    except Error as err:
        return jsonify({'error': str(err)}), 500
