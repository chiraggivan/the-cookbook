from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import food_plans_api_bp
from .utils import (normalize_string, normalize_value, normalize_plan, normalize_food_plan, normalize_weekly_meals, 
                    normalize_daily_meals, normalize_recipes, validate_food_plan, total_weeks, meals)
import re
from datetime import date

# Save food plan 
@food_plans_api_bp.route('/', methods=['POST'])
@jwt_required()
def create_food_plan():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
        
    try:
        # ----------------------------- normalize and validate data ---------------------------            
        data = request.get_json()
        data = normalize_plan(data)
        
        error, recipe_ids = validate_food_plan(data, meals)
        if error:
            return jsonify({"error": error}), 400  

        # --------------------------- connect db and verify data --------------------------
        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # check user is valid and active
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        # print(" recipe_ids : ", recipe_ids)
        # check recipe_id is valid, is_active and owned by user
        for recipe_id in recipe_ids:
            cursor.execute("""
                SELECT 1 FROM recipes WHERE recipe_id = %s AND user_id = %s AND is_active = 1
            """,(recipe_id, s_user_id))
            if  cursor.fetchone() is None:
                cursor.close()
                conn.close()
                return jsonify({
                    'error': f'Recipe id {recipe_id} missing or not active or not owned',
                    'submitted_data': data
                    }), 409

        return jsonify({'error': 'data received in backend', 'submitted data': data}), 400
        # ------------------ Inserting data in db  ------------------------
        cursor.execute("""
            INSERT INTO food_plans (user_id, total_weeks)
            VALUES (%s,%s)
        """,(s_user_id, total_weeks))
        food_plan_id = cursor.lastrowid

        weeks = data.get('food_plan')
        for week in weeks:
            week_no = week['week_no']
            cursor.execute("""
                INSERT INTO food_plan_weeks(food_plan_id, week_no)
                VALUES (%s,%s)
            """,(food_plan_id, week_no))
            food_plan_week_id = cursor.lastrowid

            for week_meal in week['weekly_meals']:
                day_no = week_meal['day_no']
                cursor.execute("""
                    INSERT INTO food_plan_days(food_plan_week_id, day_no)
                    VALUES (%s,%s)
                """,(food_plan_week_id, day_no))
                food_plan_day_id = cursor.lastrowid

                for day_meal in week_meal['daily_meals']:
                    meal_type = day_meal['meal_type']
                    cursor.execute("""
                        INSERT INTO food_plan_meals(food_plan_day_id, meal_type)
                        VALUES (%s,%s)
                    """,(food_plan_day_id, meal_type))
                    food_plan_meal_id = cursor.lastrowid

                    for recipe in day_meal['recipes']:
                        cursor.execute("""
                            INSERT INTO food_plan_recipes(food_plan_meal_id, recipe_id, display_order)
                            VALUES (%s, %s, %s)
                        """, (food_plan_meal_id, recipe['recipe_id'], recipe['display_order']))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'Food Plan created successfully!!!!!'}), 201
    
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500
