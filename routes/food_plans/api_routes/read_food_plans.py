from flask import jsonify
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import food_plans_api_bp

# Update food plan 
@food_plans_api_bp.route('/plan', methods=['GET'])
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
        food_plan_id = row['food_plan_id']

        data['food_plan_id'] = food_plan_id

        # get the food_plan_week_ids of the food_plan_id
        cursor.execute("SELECT food_plan_week_id, week_no FROM food_plan_weeks WHERE food_plan_id = %s AND is_active = 1 ORDER BY week_no",(food_plan_id,))
        rows = cursor.fetchall()
        if not rows:
            rows = []
            # cursor.close()
            # conn.close()
            # return jsonify({'error': 'Food plan week not found for the food plan of the user'}), 404
        food_plan_week_rows = rows

        food_plan = []
        for week in food_plan_week_rows:
            each_food_week_plan = {}
            each_food_week_plan['food_plan_week_id'] = week['food_plan_week_id']
            each_food_week_plan['week_no'] = week['week_no']
            cursor.execute("SELECT food_plan_day_id, day_no FROM food_plan_days WHERE food_plan_week_id = %s AND is_active = 1 ORDER BY day_no",(week['food_plan_week_id'],))
            rows = cursor.fetchall()
            if not rows:
                rows = []
                # cursor.close()
                # conn.close()
                # return jsonify({'error': 'Food plan day not found for the food plan week of the user'}), 404
            food_plan_day_rows = rows

            weekly_meals = []
            for day in food_plan_day_rows:
                each_food_day_plan = {}
                each_food_day_plan['food_plan_day_id'] = day['food_plan_day_id']
                each_food_day_plan['day_no'] = day['day_no']
                # cursor.execute("SELECT food_plan_meal_id, meal_type FROM food_plan_meals WHERE food_plan_day_id = %s AND is_active = 1",(day['food_plan_day_id'],))
                # Below cursor makes sure that if the recipe is deleted after it was put in to the food plan. then it this will take care of
                # making sure not to show meal_id or meal_type if that recipe was the only recipe in the meal and has been deleted
                cursor.execute("""
                    SELECT fpm.food_plan_meal_id, fpm.meal_type, count(fpr.recipe_id)
                    FROM food_plan_meals fpm 
                        JOIN food_plan_recipes fpr ON fpr.food_plan_meal_id = fpm.food_plan_meal_id and fpr.is_active = 1
                        JOIN recipes r ON r.recipe_id = fpr.recipe_id AND r.is_active = 1
                    WHERE fpm.food_plan_day_id = %s AND fpm.is_active = 1
                    GROUP BY fpm.food_plan_meal_id, fpm.meal_type;
                """,(day['food_plan_day_id'],))
                rows = cursor.fetchall()
                if not rows:
                    rows = []
                food_plan_meal_rows = rows

                daily_meals = []
                for meal in food_plan_meal_rows:
                    each_food_meal_plan = {}
                    each_food_meal_plan['food_plan_meal_id'] = meal['food_plan_meal_id']
                    each_food_meal_plan['meal_type'] = meal['meal_type']
                    cursor.execute("""
                        SELECT fpr.food_plan_recipe_id, fpr.recipe_id, fpr.display_order 
                        FROM food_plan_recipes fpr
                            JOIN recipes r ON fpr.recipe_id = r.recipe_id AND r.is_active = 1
                        WHERE fpr.food_plan_meal_id = %s AND fpr.is_active = 1 ORDER BY fpr.display_order
                    """,(meal['food_plan_meal_id'],))
                    rows = cursor.fetchall()
                    if not rows:
                        rows = []
                    food_plan_recipe_rows = rows

                    recipes = []
                    for recipe in food_plan_recipe_rows:
                        each_food_recipe_plan = {}
                        # Check is recipe exist, calculate price of recipe and is active. if NOT active then continue                        
                        cursor.execute("""
                            SELECT r.name AS recipe_name, COALESCE(SUM(ri.quantity * COALESCE(up.custom_price, i.default_price) * u.conversion_factor),0) AS price    
                            FROM recipes r 
                            JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id 
                            JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
                            JOIN units u ON ri.unit_id = u.unit_id
                            LEFT JOIN user_prices up ON up.user_id = %s 
                                AND up.ingredient_id = i.ingredient_id 
                                AND up.is_active = 1
                            WHERE ri.recipe_id = %s
                            AND ri.is_active = 1
                            AND r.is_active = 1
                            GROUP BY r.name
                        """,(s_user_id, recipe['recipe_id']))
                        row = cursor.fetchone()
                        if row is None:
                            continue
                        recipe_name = row['recipe_name']
                        cost = round(float(row['price']),2)
                        
                        each_food_recipe_plan = {
                            'food_plan_recipe_id': recipe['food_plan_recipe_id'],
                            'recipe_id': recipe['recipe_id'],
                            'recipe_name': recipe_name,
                            'cost': cost,
                            'display_order': recipe['display_order']
                        }

                        recipes.append(each_food_recipe_plan)
                    each_food_meal_plan['recipes'] = recipes

                    daily_meals.append(each_food_meal_plan)
                each_food_day_plan['daily_meals'] = daily_meals

                weekly_meals.append(each_food_day_plan)
            each_food_week_plan['weekly_meals'] = weekly_meals
            food_plan.append(each_food_week_plan)

        data['food_plan'] = food_plan   

        return jsonify({'food_plan_id': food_plan_id, 'food_plan': food_plan}), 200    

    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500