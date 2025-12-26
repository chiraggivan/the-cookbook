from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import dishes_api_bp

# Get dishes prepared by user
@dishes_api_bp.route('/my_dishes', methods=['GET'])
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
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found  or active'}), 404

        # # validate if dishes exists for the user
        # cursor.execute("""
        #     SELECT dish_id FROM dishes 
        #     WHERE user_id = %s AND is_active = TRUE
        # """, (s_user_id,))
        # if not cursor.fetchone():
        #     cursor.close()
        #     conn.close()
        #     return jsonify({'error': 'No dishes found for the user.'}), 404

        # Get all the dishes for the users
        cursor.execute("""
            SELECT dish_id, recipe_id, recipe_name, portion_size, preparation_date, total_cost, comment, time_prepared, meal, recipe_by, created_at
            FROM dishes 
            WHERE user_id = %s AND is_active = 1
            ORDER BY created_at DESC
        """,(s_user_id,))
        dishes = cursor.fetchall()
        for dish in dishes:
            dish['preparation_date'] = dish['preparation_date'].isoformat()
            dish["created_at"] = dish["created_at"].isoformat()
            dish['time_prepared'] =  str(dish['time_prepared'])
            dish['total_cost'] = float(dish['total_cost'])
        cursor.close()
        conn.close()
        return jsonify(dishes), 200
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get dish details for selected dish
@dishes_api_bp.route('/dish/<int:dish_id>', methods=['GET'])
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
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found or active'}), 404

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT 1 FROM dishes 
            WHERE user_id = %s AND dish_id = %s AND is_active = 1
        """, (s_user_id, dish_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No dishes found for the user.'}), 404
        
        # Get the details of the dish for the user
        cursor.execute("""
            SELECT component_display_order, component_text, ingredient_display_order, ingredient_id, ingredient_name, quantity,
                unit_id, unit_name, cost, base_price, base_unit
            FROM dish_ingredients
            WHERE dish_id = %s AND is_active = 1
        """,(dish_id,))
        dish_details = cursor.fetchall()
        for detail in dish_details:
            detail['base_price'] = float(detail['base_price'])
            detail['quantity'] = float(detail['quantity'])
            detail['cost'] = float(detail['cost'])
        
        cursor.execute("""
            SELECT dish_id, recipe_id, recipe_name, portion_size, preparation_date, total_cost, comment, time_prepared, meal, recipe_by, created_at
            FROM dishes 
            WHERE dish_id = %s AND is_active = 1
        """,(dish_id,))
        dish = cursor.fetchone()
        dish['preparation_date'] = dish['preparation_date'].isoformat()
        dish["created_at"] = dish["created_at"].isoformat()
        dish['time_prepared'] =  str(dish['time_prepared'])
        dish['total_cost'] = float(dish['total_cost'])

        cursor.close()
        conn.close()
        return jsonify({
            "dish": dish, 
            "dish_details": dish_details
        })
    except Error as err:
        return jsonify({'error': str(err)}), 500
