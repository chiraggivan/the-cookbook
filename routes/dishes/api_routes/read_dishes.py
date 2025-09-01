from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import dishes_api_bp

# Get dishes prepared by user
@dishes_api_bp.route('/dishes', methods=['GET'])
@jwt_required()
def get_dishes():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
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

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT dish_id FROM dishes 
            WHERE user_id = %s AND is_active = TRUE
        """, (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No dishes found for the user.'}), 404

        # Get all the dishes for the users
        cursor.execute("""
            SELECT d.dish_id, r.recipe_id, r.name, r.portion_size, d.preparation_date, d.total_cost
            FROM dishes d JOIN recipes r ON d.recipe_id = r.recipe_id
            WHERE d.user_id = %s AND d.is_active = 1
        """,(s_user_id,))
        recipes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(recipes)
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get dish details for selected dish
@dishes_api_bp.route('/dishes/<int:dish_id>', methods=['GET'])
@jwt_required()
def get_dish_details(dish_id):

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
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

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT dish_id FROM dishes 
            WHERE user_id = %s AND dish_id = %s AND is_active = TRUE
        """, (s_user_id, dish_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No dishes found for the user.'}), 404

        # Get the details of the dish for the user
        cursor.execute("""
            SELECT i.name, di.quantity, di.unit_name, di.total_ingredient_cost as cost, CONCAT(FORMAT(di.base_price, 2),'/',di.base_unit) as at
            FROM dish_ingredients di 
            JOIN ingredients i ON di.ingredient_id = i.ingredient_id
            JOIN dishes d ON di.dish_id = d.dish_id
            JOIN users u ON d.user_id = u.user_id
            WHERE di.dish_id = %s AND u.user_id = %s
        """,(dish_id, s_user_id))
        dish_details = cursor.fetchall()

        cursor.execute("""
            SELECT d.dish_id, r.recipe_id, r.name, r.portion_size, d.preparation_date, d.total_cost
            FROM dishes d JOIN recipes r ON d.recipe_id = r.recipe_id
            WHERE d.user_id = %s AND dish_id = %s AND d.is_active = 1
        """,(s_user_id,dish_id))
        dish = cursor.fetchone()

        cursor.close()
        conn.close()
        return jsonify({
            "dish": dish, 
            "dish_details": dish_details
        })
    except Error as err:
        return jsonify({'error': str(err)}), 500
