from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import food_plans_api_bp
import re
from datetime import date

# Save food plan 
@food_plans_api_bp.route('/', methods=['POST'])
@jwt_required()
def create_plan():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    total_weeks = 5
    meals = ['breakfast', 'lunch', 'dinner']
    recipe_ids = []
    
    def normalize_string(value):
        return re.sub(r"\s+", " ", value.strip()).lower()

    def normalize_value(value):
        if isinstance(value, str):
            return normalize_string(value)
        if isinstance(value, (int, float)):
            return value
        return value

    def normalize_food_plan(food_plan):
        if not isinstance(food_plan, list):
            return []

        normalized = []
        for plan in food_plan:
            if not isinstance(plan, dict):
                continue

            norm = {}
            for k, v in plan.items():
                if k == "weekly_meals":
                    norm[k] = normalize_weekly_meals(v)
                else:
                    norm[k] = normalize_value(v)

            normalized.append(norm)

            return normalized

    def normalize_weekly_meals(weekly_meals):
        if not isinstance(weekly_meals, list):
            return []

        normalized = []
        for day in weekly_meals:
            if not isinstance(day, dict):
                continue

            norm = {}
            for k, v in day.items():
                if k == "daily_meals":
                    norm[k] = normalize_daily_meals(v)
                else:
                    norm[k] = normalize_value(v)

            normalized.append(norm)

        return normalized

    def normalize_daily_meals(daily_meals):
        if not isinstance(daily_meals, list):
            return []

        normalized = []
        for meal in daily_meals:
            if not isinstance(meal, dict):
                continue

            norm = {}
            for k, v in meal.items():
                if k == "recipes":
                    norm[k] = normalize_recipes(v)
                else:
                    norm[k] = normalize_value(v)

            normalized.append(norm)

        return normalized

    def normalize_recipes(recipes):
        if not isinstance(recipes, list):
            return []

        normalized = []
        for recipe in recipes:
            if not isinstance(recipe, dict):
                continue

            norm = {}
            for k, v in recipe.items():
                norm[k] = normalize_value(v)

            normalized.append(norm)

        return normalized

    def validate_food_plan(data):
        food_plan = data.get('food_plan',[])
        total_weeks_plan = len(food_plan)

        if total_weeks_plan > 5 or total_weeks_plan <= 0:
            return f"Cant be empty and Only 5 weeks of food planning is allowed."
        
        for week in food_plan:
            week_no = week.get('week_no')
            if not week_no or not isinstance(week_no, int) or week_no <= 0 or week_no > 5:
                return f"week number ({week_no}) required and should be positive int less than 6"
            
            weekly_meals = week.get('weekly_meals')
            total_days = len(weekly_meals)
            if total_days > 7 :
                return f"Cant have {total_days} days in a week meals"

            if not weekly_meals or not isinstance(weekly_meals, list):
                return f"invalid weekly meals: missing or not a list type"
            
            for day in weekly_meals:
                day_no = day.get('day_no')
                if not day_no or not isinstance(day_no, int) or day_no <= 0 or day_no > 7:
                    return f"Invalid day_no. Should be positive int and not more than 7"
                
                daily_meals = day.get('daily_meals')
                total_meals = len(daily_meals)
                if total_meals > len(meals):
                    return f"Can't have {total_meals} meals in a day"

                if not daily_meals or not isinstance(daily_meals, list):
                    return f" invalid daily meals: missing or not a list type"
                
                for meal in daily_meals:
                    meal_type = meal.get('meal_type')
                    if not meal_type or not isinstance(meal_type, str) or (meal_type not in meals):
                        return f"Invalid meal type ({meal_type}): missing, should be string and one of the saved meals"
                    
                    recipes = meal.get('recipes')
                    total_recipes = len(recipes)
                    if not recipes or not isinstance(recipes, list):
                        return f"Invalid recipes: should be non empty list"
                    
                    for recipe in recipes:
                        if not isinstance(recipe, dict):
                            return f"Recipe is not in proper format. should be dictionary"
                        
                        recipe_id = recipe.get('recipe_id')
                        if not recipe_id or not isinstance(recipe_id, int) or recipe_id <= 0:
                            return f" Invalid recipe id {recipe_id}: missing or should be positive int"
                        
                        recipe_ids.append(recipe_id)

                        display_order = recipe.get('display_order')
                        if not display_order or not isinstance(display_order, int) or display_order <= 0 or display_order > total_recipes:
                            return f"Invalid display order ({display_order}): missing or should be + int less than total recipes in a meal"
                        
        return None
        
    try:
        # ----------------------------- normalize and validate data ---------------------------            
        data = request.get_json()
        food_plan = data.get("food_plan", [])
        norm_data = {}
        norm_data['food_plan'] = normalize_food_plan(food_plan)

        error = validate_food_plan(norm_data)
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

        print(" recipe_ids : ", recipe_ids)
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

        
        return jsonify({'error': 'data received in backend', 'submitted data': norm_data}), 400
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

    
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500