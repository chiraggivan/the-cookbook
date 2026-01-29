from flask import request, jsonify
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity #, create_access_token, JWTManager
from . import user_ingredients_api_bp

# delete user ingredient
@user_ingredients_api_bp.route('/delete/<int:ing_id>', methods=['DELETE'])
@jwt_required()
def delete_user_ingredient(ing_id):
    
    user_id = get_jwt_identity()

    # check if user id found in token
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists & user is active
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1 ", (user_id,))
        user = cursor.fetchone()
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found or Admin privileges required'}), 403

        # validate is user ingredient id exists and rightly owned by user
        cursor.execute("SELECT name FROM user_ingredients WHERE user_ingredient_id = %s AND submitted_by = %s AND is_active = 1", (ing_id, user_id))
        ing_name = cursor.fetchone()
        if not ing_name:
            cursor.close()
            conn.close()
            return jsonify({'error': f'No such ingredient exists for the user'}), 403

        # return jsonify({"message": "ready to delete"}), 201
        # ------------------------------ Now delete the data thru procedure ------------------------------------------
        cursor.callproc('delete_user_ingredient', (
                    ing_id,
                    ing_name['name'], 
                    user_id
                ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Ingredient deleted successfully"}), 201

    except Error as err:
        if cursor:
            cursor.close()
        if conn:
            conn.rollback()
            conn.close()
        
        return jsonify({'error': str(err)}), 500