from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import weekly_dashboard_api_bp
from mysql.connector import Error

# save food plan day's day in food_plan_ingredient_records table for dashboard 
@weekly_dashboard_api_bp.route('/save_day_recipes_details', methods=['POST'])
@jwt_required()
def set_weekly_dashboard():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    data = {}
    conn = None
    cursor = None
    
    try:
        data = request.get_json()

        dayData = data
        food_plan_id = dayData['food_plan_id']
        food_plan_week_id = dayData['food_plan_week_id']
        food_plan_day_id = dayData['food_plan_day_id']
        meals = dayData['daily_meals']
        #----------------------------------------------- connect to db and verify data -----------------------------------

        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # check user is valid and active
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'User not found'}), 404

        # check if food_plan_id, food_plan_week_id, food_plan_day_id belong to the same use 
        cursor.execute("""
            SELECT 1 
            FROM users u JOIN food_plans fp ON u.user_id = fp.user_id AND u.user_id = %s AND u.is_active = 1
                JOIN food_plan_weeks fpw ON fp.food_plan_id = fpw.food_plan_id AND fp.food_plan_id = %s AND fp.is_active = 1
                JOIN food_plan_days fpd ON fpw.food_plan_week_id = fpd.food_plan_week_id AND fpw.food_plan_week_id = %s AND fpw.is_active = 1
                    AND fpd.food_plan_day_id = %s AND fpd.is_active = 1
        """,(s_user_id,food_plan_id, food_plan_week_id, food_plan_day_id))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'No such data found for the user.'}), 404
    
        # -------------------------------------------------- Insert, update, delete  in db --------------------------------

        # delete the records of that day
        cursor.execute("""
            DELETE FROM food_plan_ingredient_records
            WHERE food_plan_day_id = %s
        """,(food_plan_day_id,))

        # insert record in food_plan_ingredient_records table
        for meal in meals:
            food_plan_meal_id = meal['food_plan_meal_id']
            recipes = meal['recipes']

            for recipe in recipes:
                food_plan_recipe_id = recipe['food_plan_recipe_id']
                recipe_id = recipe['recipe_id']
                display_order = recipe['display_order']

                cursor.execute("""
                    SELECT ingredient_id, quantity, unit_id FROM recipe_ingredients WHERE recipe_id = %s AND is_active = 1
                """,(recipe_id,))
                ingredient_rows = cursor.fetchall()

                for row in ingredient_rows:
                    ingredient_id = row['ingredient_id']
                    quantity = row['quantity']
                    unit_id = row['unit_id']

                    cursor.execute("SELECT unit_id, unit_name, conversion_factor FROM units WHERE ingredient_id = %s AND is_active = 1",(ingredient_id,))
                    unit_rows = cursor.fetchall()

                    base_unit_row = next((r for r in unit_rows if r['conversion_factor'] == 1),  None)
                    base_unit = base_unit_row['unit_name'] if base_unit_row else None 

                    conversion_factor_row = next((r for r in unit_rows if r['unit_id'] == unit_id), None)
                    conversion_factor = conversion_factor_row['conversion_factor'] if conversion_factor_row else None

                    total_quantity = conversion_factor*quantity

                    # print("[food_plan_id is :", food_plan_id, ", food_plan_week_id is :", food_plan_week_id ,", food_plan_day_id is :", food_plan_day_id,
                    #         ", food_plan_meal_id is :", food_plan_meal_id, ", recipe_id is :", recipe_id, ", ingredient_id is :", ingredient_id,
                    #         ", quantity is :", total_quantity, ", base_unit is :", base_unit, "]" )

                    cursor.execute("""
                        INSERT INTO food_plan_ingredient_records(food_plan_id, food_plan_week_id, food_plan_day_id, food_plan_meal_id, food_plan_recipe_id,
                                    recipe_id, ingredient_id, quantity, base_unit, display_order, is_active)
                        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)
                    """,(food_plan_id, food_plan_week_id, food_plan_day_id, food_plan_meal_id, food_plan_recipe_id,
                        recipe_id, ingredient_id, total_quantity, base_unit, display_order))

        conn.commit()
        return jsonify({'message': 'data reached backend'}), 200

    except Error as err:
        if conn:
            conn.rollback()
        return jsonify({'error': str(err)}), 500
    except Exception as err:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Unexpected error'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

#get the data for dashboard
@weekly_dashboard_api_bp.route('/get_weekly_dashboard', methods=['POST'])
@jwt_required()
def get_weekly_dashboard():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    conn = None
    cursor = None
    
    try:
        data = request.get_json()
        week_no = int(data.get('week_no'))
        food_plan_id = int(data.get('food_plan_id'))
        print("week is :",  week_no)
        print("plan id : ", food_plan_id)
            
        if week_no < 1 or week_no > 6:
            return jsonify({'error': 'Invalid week number'}), 500


        #----------------------------------------------- connect to db and verify data -----------------------------------

        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # check user is valid and active
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'User not found'}), 404
        
        # get food_plan_week_id for week no and food plan id in food_plan_weeks table
        cursor.execute("SELECT food_plan_week_id FROM food_plan_weeks WHERE week_no = %s AND food_plan_id = %s AND is_active = 1",(week_no, food_plan_id))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'food plan week not found'}), 404

        food_plan_week_id = row['food_plan_week_id'] # print("food_plan_week_id is :", food_plan_week_id)
        
        # retrive data from food plan ingredient records table 
        cursor.execute("""
            SELECT fpir.food_plan_week_id, fpw.week_no, fpir.food_plan_day_id, fpd.day_no, fpir.food_plan_meal_id, fpm.meal_type, fpir.food_plan_recipe_id,
                fpir.recipe_id, r.name as recipe_name, fpir.ingredient_id, i.name as ingredient_name, fpir.quantity, fpir.base_unit, COALESCE(up.custom_price, i.default_price) as base_price
            FROM food_plan_ingredient_records fpir
                JOIN food_plan_weeks fpw ON fpw.food_plan_week_id = fpir.food_plan_week_id AND fpw.is_active = 1
                JOIN food_plan_days fpd ON fpd.food_plan_day_id = fpir.food_plan_day_id AND fpd.is_active = 1
                JOIN food_plan_meals fpm ON fpm.food_plan_meal_id = fpir.food_plan_meal_id AND fpm.is_active = 1
                JOIN recipes r ON r.recipe_id = fpir.recipe_id AND r.is_active = 1
                JOIN ingredients i ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1 
                LEFT JOIN user_prices up ON up.ingredient_id = i.ingredient_id AND up.user_id = %s AND up.is_active = 1
            WHERE fpir.food_plan_week_id = %s 
        """,(s_user_id, food_plan_week_id))
        dashData = cursor.fetchall()
        if not dashData or dashData == []:
            return jsonify({'error': 'no data found for dashboard'}), 404
        for r in dashData:
            r['base_price'] = round(float(r['base_price']),2)
            r['quantity'] = round(float(r['quantity']),8)
        
        # get all aggregate values
        cursor.execute("""
            SELECT COUNT(DISTINCT food_plan_meal_id)  AS total_meals, COUNT(DISTINCT food_plan_recipe_id)      AS total_items,
                    COUNT(DISTINCT recipe_id)   AS total_recipes,    COUNT(DISTINCT ingredient_id)   AS total_ingredients,
                    SUM(quantity) AS total_quantity, MIN(quantity)  AS min_quantity, MAX(quantity) AS max_quantity
            FROM food_plan_ingredient_records fpir
                JOIN food_plan_weeks fpw ON fpw.food_plan_week_id = fpir.food_plan_week_id AND fpw.is_active = 1
                JOIN food_plan_days fpd ON fpd.food_plan_day_id = fpir.food_plan_day_id AND fpd.is_active = 1
                JOIN food_plan_meals fpm ON fpm.food_plan_meal_id = fpir.food_plan_meal_id AND fpm.is_active = 1
                JOIN recipes r ON r.recipe_id = fpir.recipe_id AND r.is_active = 1
                JOIN ingredients i ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1 
                LEFT JOIN user_prices up ON up.ingredient_id = i.ingredient_id AND up.user_id = %s AND up.is_active = 1
            WHERE fpir.food_plan_week_id = %s
        """)





        return jsonify({'message': 'fetched data ', 'data': rows}), 200

    except Error as err:
        if conn:
            conn.rollback()
        return jsonify({'error': str(err)}), 500
    except Exception as err:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Unexpected error'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
