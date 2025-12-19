from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity

# Update food plan 
@food_plans_api_bp.route('/food_plan', methods=['GET'])
@jwt_required()
def get_food_plan():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    data = {}

    try:
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
        
        # get the food_plan_id for the user
        cursor.execute("SELECT food_plan_id FROM food_plans WHERE user_id = %s AND is_active = 1", (s_user_id,))
        row = cursor.fetchone()
        if row is None:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan not found for the user'}), 404
        food_plan_id = row[0]

        data['food_plan_id'] = food_plan_id

        # get the food_plan_week_ids of the food_plan_id
        cursor.execute("SELECT food_plan_week_id, week_no FROM food_plan_weeks WHERE food_plan_id = %s ORDER BY week_no",(food_plan_id,))
        rows = cursor.fetchall()
        if not rows:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan week not found for the food plan of the user'}), 404
        food_plan_week_rows = rows

        food_plan = []
        for week_id, week_no in food_plan_week_rows:
            each_food_week_plan = {}
            each_food_week_plan['food_plan_week_id'] = week_id
            each_food_week_plan['week_no'] = week_no
            cursor.execute("SELECT food_plan_day_id, day_no FROM food_plan_days WHERE food_plan_week_id = %s",(week_id,))
            rows = cursor.fetchall()
            if not rows:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Food plan day not found for the food plan week of the user'}), 404
            food_plan_day_rows = rows

            weekly_meals = []
            for day_id, day_no in food_plan_day_rows:
                each_food_day_plan = {}
                each_food_day_plan['food_plan_day_id'] = day_id
                each_food_day_plan['day_no'] = day_no
                cursor.execute("SELECT food_plan_meal_id, meal_type FROM food_plan_meals WHERE food_plan_day_id = %s",(day_id,))
                rows = cursor.fetchall()
                if not rows:
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Food plan meal not found for the food plan day of the user'}), 404
                food_plan_meal_rows = rows

                daily_meals = []
                for meal_id, meal_type in food_plan_meal_rows:
                    each_food_meal_plan = {}
                    each_food_meal_plan['food_plan_meal_id'] = meal_id
                    each_food_meal_plan['meal_type'] = meal_type
                    cursor.execute("SELECT food_plan_recipe_id, recipe_id, display_order FROM food_plan_recipes WHERE food_plan_meal_id = %s ORDER BY display_order",(meal_id,))
                    rows = cursor.fetchall()
                    if not rows:
                        cursor.close()
                        conn.close()
                        return jsonify({'error': 'Food plan meal not found for the food plan day of the user'}), 404
                    food_plan_recipe_rows = rows

                    recipes = []
                    for food_plan_recipe_id, recipe_id, display_order in food_plan_recipe_rows:
                        each_food_recipe_plan = {}
                        # Check is recipe exist and is active. if NOT active then continue
                        cursor.execute("SELECT name FROM recipes WHERE recipe_id = %s AND is_active = 1",(recipe_id,))
                        row = cursor.fetchone()
                        if row is None:
                            continue
                        recipe_name = row[0]
                        each_food_recipe_plan = {
                            'food_plan_recipe_id': food_plan_recipe_id,
                            'recipe_id': recipe_id,
                            'recipe_name': recipe_name,
                            'display_order': display_order
                        }

                        recipes.append(each_food_recipe_plan)
                    each_food_meal_plan['recipes'] = recipes

                    daily_meals.append(each_food_meal_plan)
                each_food_day_plan['daily_meals'] = daily_meals

                weekly_meals.append(each_food_day_plan)
            each_food_week_plan['weekly_meals'] = weekly_meals
            food_plan.append(each_food_week_plan)

        data['food_plan'] = food_plan       

    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500