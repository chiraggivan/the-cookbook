from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import food_plans_api_bp
from .utils import (normalize_string, normalize_value, normalize_plan, normalize_food_plan, normalize_weekly_meals, 
                    normalize_daily_meals, normalize_recipes, validate_food_plan, total_weeks, meals)
import re
from datetime import date

# Update food plan 
@food_plans_api_bp.route('/old_update', methods=['PUT'])
@jwt_required()
def update_food_plan():
    
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

        # check if the supplied day , meal, recipe ids for update are genuine and valid and exist in db
        food_plan_week_rows = set()
        food_plan_day_rows = set()
        food_plan_meal_rows = set()
        food_plan_recipe_rows = set()

        for week in data['food_plan']:
            week_no = week.get('week_no')
            if week.get('food_plan_week_id'):
                food_plan_week_rows.add((week['food_plan_week_id'], food_plan_id, week_no))

            for day in week['weekly_meals']:
                day_no = day.get('day_no')
                if day.get('food_plan_day_id'):
                    food_plan_day_rows.add((day.get('food_plan_day_id'), week['food_plan_week_id'], day_no))
                
                for meal in day.get('daily_meals'):
                    meal_type = meal.get('meal_type')
                    if meal.get('food_plan_meal_id'):
                        food_plan_meal_rows.add((meal['food_plan_meal_id'], day.get('food_plan_day_id'), meal_type))
                    
                    for recipe in meal.get('recipes'):
                        recipeId = recipe.get('recipe_id')
                        if recipe.get('food_plan_recipe_id'):
                            food_plan_recipe_rows.add((recipe['food_plan_recipe_id'], meal['food_plan_meal_id']))

        print("Food plan id :", food_plan_id)
        print("Food plan week ids :", food_plan_week_rows)
        print("Food plan day ids :", food_plan_day_rows)
        print("Food plan meal ids :", food_plan_meal_rows)
        print("Food plan recipe ids :", food_plan_recipe_rows)
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
        cursor.execute("SELECT 1 FROM food_plans WHERE user_id = %s AND food_plan_id = %s AND is_active = 1",(s_user_id, food_plan_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan not found.'}), 404
        
        # check if food_plan_id, food_plan_week_id, week_no match in table
        for week_id, plan_id, week_no in food_plan_week_rows:
            cursor.execute("""SELECT 1 FROM food_plan_weeks WHERE food_plan_week_id = %s AND food_plan_id = %s 
                            AND week_no = %s AND is_active = 1""",(week_id, plan_id, week_no))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan id AND - food plan week id, week no - not found.'}), 404

        # check if food_plan_week_id, food_plan_day_id, day_no match in table
        for day_id, week_id, day_no in food_plan_day_rows:
            cursor.execute("""SELECT 1 FROM food_plan_days WHERE food_plan_day_id = %s AND food_plan_week_id = %s 
                            AND day_no = %s AND is_active = 1""",(day_id, week_id, day_no))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan week id AND - food plan day id, day no - not found.'}), 404

        # check if food_plan_day_id and food_plan_meal_id match in table
        for meal_id,day_id,meal_type in food_plan_meal_rows:
            cursor.execute("""SELECT 1 FROM food_plan_meals WHERE food_plan_meal_id = %s AND food_plan_day_id IN %s 
                            AND meal_type = %s AND is_active = 1""",(meal_id, day_id, meal_type))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan day id AND food plan meal id not found.'}), 404

        # check if food_plan_meal_id and food_plan_recipe_id match in table
        for recipes_id, meal_id in food_plan_recipe_rows:
            cursor.execute("SELECT 1 FROM food_plan_recipes WHERE food_plan_recipe_id = %s AND food_plan_meal_id IN %s AND is_active = 1",(recipes_id, meal_id))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan meal id AND food plan recipe id not found.'}), 404

        return jsonify({'error': 'data received in backend', 'submitted data': data}), 400
        # ---------------------------------------------    Inserting data in db      -------------------------------------------------------

        # make all the data wrt this food_plan inactive

        # update food_plan_weeks and make all the rows for the food_plan inactive 
        cursor.execute("UPDATE food_plan_weeks SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE food_plan_id = %s",(food_plan_id,))

        cursor.execute("SELECT food_plan_week_id FROM food_plan_weeks WHERE food_plan_id = %s",(food_plan_id,))
        week_ids = [row[0] for row in cursor.fetchall()] # fetchall will give list of tulips like : [(1,),(2,),(3,)] but we need [1,2,3]

        # update food_plan_days and make all the rows for the day_ids as inactive 
        cursor.execute("UDPATE food_plan_days SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE food_plan_week_id IN %s",(week_ids,))

        cursor.execute("SELECT food_plan_day_id FROM food_plan_days WHERE food_plan_week_id IN %s",(week_ids,))
        day_ids = [row[0] for row in cursor.fetchall()] # fetchall will give list of tulips like : [(1,),(2,),(3,)] but we need [1,2,3]

        # update food_plan_meals and make all the rows for the day_ids as inactive 
        cursor.execute("UDPATE food_plan_meals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE food_plan_day_id IN %s",(day_ids,))

        cursor.execute("SELECT food_plan_meal_id FROM food_plan_meals WHERE food_plan_day_id IN %s",(day_ids,))
        meal_ids = [row[0] for row in cursor.fetchall()]

        # update food_plan_recipes and make all the rows for the meal_ids as inactive
        cursor.execute("UPDATE food_plan_recipes SET is_active = 0, display_order = -1, updated_at = CURRENT_TIMESTAMP WHERE food_plan_meal_id IN %s",(meal_ids,))

        # update or insert the data depending on the data
        weeks = data.get('food_plan',[])
        for week in weeks:
            week_no = week['week_no']

            if week.get('food_plan_week_id'):
                cursor.execute("""UPDATE food_plan_weeks SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                WHERE food_plan_week_id = %s""",(week['food_plan_week_id'],))
                food_plan_week_id = week['food_plan_week_id']
            else:
                cursor.execute("""INSERT INTO food_plan_weeks(food_plan_id, week_no)
                                VALUES (%s,%s)""",(food_plan_id, week_no))
                food_plan_week_id = cursor.lastrowid

            for day in week['weekly_meals']:
                day_no = day['day_no']

                if day.get('food_plan_day_id'):
                    cursor.execute("""UPDATE food_plan_days SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                    WHERE food_plan_day_id = %s""",(day['food_plan_day_id'],))
                    food_plan_day_id = day['food_plan_day_id']
                else:
                    cursor.execute("""INSERT INTO food_plan_days(food_plan_week_id, day_no)
                                    VALUES (%s,%s)""",(food_plan_week_id, day_no))
                    food_plan_day_id = cursor.lastrowid

                for meal in day['daily_meals']:
                    meal_type = meal['meal_type']

                    if meal.get('food_plan_meal_id'):
                        cursor.execute("""UPDATE food_plan_meals SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                        WHERE food_plan_meal_id =%s""",(meal['food_plan_meal_id'],))
                        food_plan_meal_id = meal['food_plan_meal_id']                        
                    else:
                        cursor.execute("""INSERT INTO food_plan_meals(food_plan_day_id, meal_type)
                                        VALUES (%s,%s)""",(food_plan_day_id, meal_type))
                        food_plan_meal_id = cursor.lastrowid

                    for recipe in meal['recipes']:
                        recipe_id = recipe['recipe_id']
                        display_order = recipe['display_order']

                        # if recipe.get('food_plan_recipe_id'):
                        #     cursor.execute("""UPDATE food_plan_recipes 
                        #                     SET recipe_id = %s, display_order = %s, updated_at = CURRENT_TIMESTAMP, is_active = 1 
                        #                     WHERE food_plan_recipe_id = %s""",(recipe_id, display_order, recipe['food_plan_recipe_id']))
                        # else:
                        cursor.execute("""
                            INSERT INTO food_plan_recipes(food_plan_meal_id, recipe_id, display_order)
                            VALUES (%s, %s, %s)
                        """,(food_plan_meal_id, recipe_id, display_order))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'Food Plan updated successfully!!!!!'}), 201
    
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500

@food_plans_api_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_day_food_plan():
    
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

        # check if the supplied day , meal, recipe ids for update are genuine and valid and exist in db
        food_plan_week_rows = set()
        food_plan_day_rows = set()
        food_plan_meal_rows = set()
        food_plan_recipe_rows = set()

        for week in data['food_plan']:
            week_no = week.get('week_no')
            if week.get('food_plan_week_id'):
                food_plan_week_rows.add((week['food_plan_week_id'], food_plan_id, week_no))

            for day in week['weekly_meals']:
                day_no = day.get('day_no')
                if day.get('food_plan_day_id'):
                    food_plan_day_rows.add((day.get('food_plan_day_id'), week.get('food_plan_week_id'), day_no))
                
                for meal in day.get('daily_meals'):
                    meal_type = meal.get('meal_type')
                    if meal.get('food_plan_meal_id'):
                        food_plan_meal_rows.add((meal['food_plan_meal_id'], day.get('food_plan_day_id'), meal_type))
                    
                    for recipe in meal.get('recipes'):
                        recipeId = recipe.get('recipe_id')
                        if recipe.get('food_plan_recipe_id'):
                            food_plan_recipe_rows.add((recipe['food_plan_recipe_id'], meal.get('food_plan_meal_id')))

        print("Food plan id :", food_plan_id)
        print("Food plan week ids :", food_plan_week_rows)
        print("Food plan day ids :", food_plan_day_rows)
        print("Food plan meal ids :", food_plan_meal_rows)
        print("Food plan recipe ids :", food_plan_recipe_rows)
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
        cursor.execute("SELECT 1 FROM food_plans WHERE user_id = %s AND food_plan_id = %s AND is_active = 1",(s_user_id, food_plan_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan not found.'}), 404
        
        # check if food_plan_id, food_plan_week_id, week_no match in table
        for week_id, plan_id, week_no in food_plan_week_rows:
            cursor.execute("""SELECT 1 FROM food_plan_weeks WHERE food_plan_week_id = %s AND food_plan_id = %s 
                            AND week_no = %s""",(week_id, plan_id, week_no))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan id AND - food plan week id, week no - not found.'}), 404

        # check if food_plan_week_id, food_plan_day_id, day_no match in table
        for day_id, week_id, day_no in food_plan_day_rows:
            cursor.execute("""SELECT 1 FROM food_plan_days WHERE food_plan_day_id = %s AND food_plan_week_id = %s 
                            AND day_no = %s""",(day_id, week_id, day_no))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan week id AND - food plan day id, day no - not found.'}), 404

        # check if food_plan_day_id and food_plan_meal_id match in table
        for meal_id,day_id,meal_type in food_plan_meal_rows:
            cursor.execute("""SELECT 1 FROM food_plan_meals WHERE food_plan_meal_id = %s AND food_plan_day_id = %s 
                            AND meal_type = %s""",(meal_id, day_id, meal_type))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan day id AND food plan meal id not found.'}), 404

        # check if food_plan_meal_id and food_plan_recipe_id match in table
        for recipes_id, meal_id in food_plan_recipe_rows:
            cursor.execute("SELECT 1 FROM food_plan_recipes WHERE food_plan_recipe_id = %s AND food_plan_meal_id = %s",(recipes_id, meal_id))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Combined Food plan meal id AND food plan recipe id not found.'}), 404

        # return jsonify({'error': 'data received in backend', 'submitted data': data}), 400
        # ---------------------------------------------    Inserting data in db      -------------------------------------------------------

        # make all the data wrt this food_plan inactive for the selected day

        food_plan = data['food_plan']
        if food_plan_id is not None:
            for plan in food_plan:
                week_no = plan['week_no']
                cursor.execute("SELECT food_plan_week_id FROM food_plan_weeks WHERE food_plan_id = %s AND week_no = %s",(food_plan_id, week_no))
                row = cursor.fetchone()
                if row['food_plan_week_id'] is not None:
                    weekly_meals = plan['weekly_meals']
                    for week in weekly_meals:
                        day_no = week['day_no']
                        cursor.execute("SELECT food_plan_day_id FROM food_plan_days WHERE food_plan_week_id = %s AND day_no = %s",(row['food_plan_week_id'], day_no))
                        row = cursor.fetchone()
                        if row['food_plan_day_id'] is not None:
                            cursor.execute("""UPDATE food_plan_days 
                                            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                                            WHERE food_plan_day_id = %s""",(row['food_plan_day_id'],))

                            cursor.execute("""SELECT food_plan_meal_id FROM food_plan_meals WHERE food_plan_day_id = %s AND is_active = 1""",(row['food_plan_day_id'],))
                            rows = cursor.fetchall()
                            if rows:
                                for row in rows:
                                    cursor.execute("""UPDATE food_plan_meals
                                                    SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                                                    WHERE food_plan_meal_id = %s""",(row['food_plan_meal_id'],))
                                    
                                    cursor.execute("""SELECT food_plan_recipe_id FROM food_plan_recipes WHERE food_plan_meal_id = %s AND is_active = 1""",(row['food_plan_meal_id'],))
                                    rows = cursor.fetchall()
                                    if rows:
                                        for row in rows:
                                            cursor.execute("""UPDATE food_plan_recipes
                                                            SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                                                            WHERE food_plan_recipe_id = %s""",(row['food_plan_recipe_id'],))
        
        # conn.commit()
        # cursor.close()
        # conn.close()
        # return jsonify({'error': 'db table updated with is_active made 0 in 3 tables'}), 400

        # update or insert the data depending on the data
        weeks = data.get('food_plan',[])
        for week in weeks:
            week_no = week['week_no']

            if week.get('food_plan_week_id'):
                cursor.execute("""UPDATE food_plan_weeks SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                WHERE food_plan_week_id = %s""",(week['food_plan_week_id'],))
                food_plan_week_id = week['food_plan_week_id']
            else:
                cursor.execute("SELECT food_plan_week_id FROM food_plan_weeks WHERE food_plan_id = %s AND week_no = %s",(food_plan_id, week_no))
                row = cursor.fetchone()
                if row['food_plan_week_id'] is None:
                    cursor.execute("""INSERT INTO food_plan_weeks(food_plan_id, week_no)
                                    VALUES (%s,%s)""",(food_plan_id, week_no))
                    food_plan_week_id = cursor.lastrowid
                else:
                    cursor.execute("""UPDATE food_plan_weeks SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                    WHERE food_plan_week_id = %s""",(row['food_plan_week_id'],))
                    food_plan_week_id = row['food_plan_week_id']                

            for day in week['weekly_meals']:
                day_no = day['day_no']

                if day.get('food_plan_day_id'):
                    cursor.execute("""UPDATE food_plan_days SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                    WHERE food_plan_day_id = %s""",(day['food_plan_day_id'],))
                    food_plan_day_id = day['food_plan_day_id']
                else:
                    cursor.execute("SELECT food_plan_day_id FROM food_plan_days WHERE food_plan_week_id = %s AND day_no = %s",(food_plan_week_id, day_no))
                    row = cursor.fetchone()
                    if row['food_plan_day_id'] is None:
                        cursor.execute("""INSERT INTO food_plan_days(food_plan_week_id, day_no)
                                        VALUES (%s,%s)""",(food_plan_week_id, day_no))
                        food_plan_day_id = cursor.lastrowid
                    else:
                        cursor.execute("""UPDATE food_plan_days SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                        WHERE food_plan_day_id = %s""",(row['food_plan_day_id'],))
                        food_plan_day_id = row['food_plan_day_id']                    

                for meal in day['daily_meals']:
                    meal_type = meal['meal_type']

                    if meal.get('food_plan_meal_id'):
                        cursor.execute("""UPDATE food_plan_meals SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                        WHERE food_plan_meal_id =%s""",(meal['food_plan_meal_id'],))
                        food_plan_meal_id = meal['food_plan_meal_id']                        
                    else:
                        cursor.execute("SELECT food_plan_meal_id FROM food_plan_meals WHERE food_plan_day_id = %s AND meal_type = %s",(food_plan_day_id, meal_type))
                        row = cursor.fetchone()
                        if row['food_plan_meal_id'] is None:
                            cursor.execute("""INSERT INTO food_plan_meals(food_plan_day_id, meal_type)
                                            VALUES (%s,%s)""",(food_plan_day_id, meal_type))
                            food_plan_meal_id = cursor.lastrowid
                        else:
                            cursor.execute("""UPDATE food_plan_meals SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                                            WHERE food_plan_meal_id =%s""",(row['food_plan_meal_id'],))
                            food_plan_meal_id = row['food_plan_meal_id']

                    for recipe in meal['recipes']:
                        recipe_id = recipe['recipe_id']
                        display_order = recipe['display_order']
                        # insert new rows everytime for update. old rows will help in future to track old food plan by reverse engineering 
                        cursor.execute("""
                            INSERT INTO food_plan_recipes(food_plan_meal_id, recipe_id, display_order)
                            VALUES (%s, %s, %s)
                        """,(food_plan_meal_id, recipe_id, display_order))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'Food Plan updated successfully!!!!!', 'updated_data': weeks}), 201
    
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500

# search ingredients for recipe
@food_plans_api_bp.route("/recipes/search")
@jwt_required()
def search_ingredients():

    s_user_id = get_jwt_identity()
   
    q = request.args.get("q", "").strip().lower()
    #print("user id:",s_user_id," value of q :", q)
    if not q:
        return jsonify([])

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT r.recipe_id, r.name AS recipe_name, COALESCE(SUM(ri.quantity * COALESCE(up.custom_price, i.default_price) * u.conversion_factor),0) AS price    
            FROM recipes r 
                JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id 
                JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
                JOIN units u ON ri.unit_id = u.unit_id
                LEFT JOIN user_prices up ON up.user_id = %s 
                    AND up.ingredient_id = i.ingredient_id 
                    AND up.is_active = 1
            WHERE LOWER(r.name) like LOWER(%s) AND ri.is_active = 1 AND r.is_active = 1 AND r.user_id = %s
            GROUP BY r.recipe_id, r.name
            LIMIT 20
        """,( s_user_id, f"%{q}%", s_user_id))
        results = cursor.fetchall()
        print("result: ", results)
        for row in results:
            row['price'] = round(float(row['price']),2)
        # print("result: ", results)
        cursor.close()
        conn.close()
        return jsonify(results)

    except Exception as e:
        print("Error in search_ingredients:", e)
        return jsonify([])
