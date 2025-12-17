from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import food_plans_api_bp
from .utils import (normalize_string, normalize_value, normalize_plan, normalize_food_plan, normalize_weekly_meals, 
                    normalize_daily_meals, normalize_recipes, validate_food_plan, total_weeks, meals)
import re
from datetime import date

# Update food plan 
@food_plans_api_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_plan():
    
    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)

    try:           
        # ----------------------------- normalize and validate data ---------------------------            
        data = request.get_json()
        food_plan_id = data.get('food_plan_id')
        if not food_plan_id:
            return jsonify({'error':'Update data incorrect. food plan id missing'}), 400
        data = normalize_plan(data)

        error, recipe_ids = validate_food_plan(data, meals)
        if error:
            return jsonify({"error": error}), 400  

        food_plan_day_id = []
        food_plan_meal_id = []
        food_plan_recipe_id =[]

        for week in data['food_plan']:
            for day in week['weekly_meals']:
                if day.get('food_plan_day_id'):
                    food_plan_day_id.append(day['food_plan_day_id'])
                
                for meal in day.get('daily_meals'):
                    if meal.get('food_plan_meal_id'):
                        food_plan_meal_id.append(meal['food_plan_meal_id'])
                    
                    for recipe in meal.get('recipes'):
                        if recipe.get('food_plan_recipe_id'):
                            food_plan_recipe_id.append(recipe['food_plan_recipe_id'])

        print("Food plan id :", food_plan_id)
        print("Food plan day ids :", food_plan_day_id)
        print("Food plan meal ids :", food_plan_meal_id)
        print("Food plan recipe ids :", food_plan_recipe_id)
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

        # check food_plan_id valid for user 
        cursor.execute("SELECT 1 FROM food_plans WHERE user_id = %s AND food_plan_id = %s AND is_active = 1",(s_user_id,food_plan_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan not found.'}), 404

        # check if food_plan_id and food_plan_day_id match in table
        for value in food_plan_day_id:
            cursor.execute("SELECT 1 FROM food_plan_days WHERE food_plan_day_id = %s AND food_plan_id = %s AND is_active = 1",(value, food_plan_id))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan id AND food plan day id not found.'}), 404

        # check if food_plan_day_id and food_plan_meal_id match in table
        for value in food_plan_meal_id:
            cursor.execute("SELECT 1 FROM food_plan_meals WHERE food_plan_meal_id = %s AND food_plan_day_id IN %s AND is_active = 1",(value, food_plan_day_id))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan day id AND food plan meal id not found.'}), 404

        # check if food_plan_meal_id and food_plan_recipe_id match in table
        for value in food_plan_recipe_id:
            cursor.execute("SELECT 1 FROM food_plan_recipes WHERE food_plan_recipe_id = %s AND food_plan_meal_id IN %s AND is_active = 1",(value, food_plan_meal_id))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan meal id AND food plan recipe id not found.'}), 404

        return jsonify({'error': 'data received in backend', 'submitted data': data}), 400
        # ------------------ Inserting data in db  ------------------------
        cursor.execute("""
            INSERT INTO food_plans (user_id, total_weeks)
            VALUES (%s,%s)
        """,(s_user_id, total_weeks))
        food_plan_id = cursor.lastrowid

        for week in weeks:
            week_no = week['week_no']
            for week_meal in week['weekly_meals']:
                day_no = week_meal['day_no']
                
                cursor.execute("""
                    INSERT INTO food_plan_days(food_plan_id, week_no, day_no)
                    VALUES (%s,%s)
                """,(food_plan_id, week_no, day_no))
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
