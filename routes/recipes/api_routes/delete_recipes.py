from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import recipes_api_bp

# Delete recipe - checked
@recipes_api_bp.route('/delete_recipe/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def delete_recipe(recipe_id):

    s_user_id = get_jwt_identity()
    #print("logged in user id : ",s_user_id)
    try:
        # get db connection
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        # Validate if rightful owner and is_active TRUE exists
        cursor.execute("""
            SELECT recipe_id, user_id, is_active 
            FROM recipes 
            WHERE recipe_id = %s AND user_id = %s AND is_active = 1
            """, (recipe_id, s_user_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Not a rightful Owner or recipe already deleted'}), 404

        # Call the procedure to delete the recipe
        cursor.callproc('delete_recipe',( s_user_id,recipe_id))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Recipe deleted successfully"}), 201

    except Error as err:
        return jsonify({'error': str(err)}), 500
