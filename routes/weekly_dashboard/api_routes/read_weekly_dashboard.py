from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import weekly_dashboard_api_bp
from mysql.connector import Error
import copy

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
    finalData ={}

    # get easy quantity text
    def get_easy_quantity(data):
        units = ['kg','l','pc','bunch']
        # for unit in units:
        if data.get('base_unit') == 'kg':
            if data.get('cup_unit') == 'g' and data.get('cup_weight'):
                easyNumber = data.get('quantity')*1000 / data.get('cup_weight')
                wholeNo = int(easyNumber)
                deciNo = easyNumber - wholeNo  
                print(data['name'] , ' cup weight : ', data['cup_weight'], 'easyNumber is: ' ,easyNumber ) 
                easyText = ''
                if wholeNo > 0: 
                    easyText = str(wholeNo) + ''
                if deciNo:
                    if deciNo > 0.75:
                        if wholeNo == 0: return '~ ' + (wholeNo + 1) + ' cups' 
                        else: return '~ ' + (wholeNo + 1) + ' cup'                         
                    if deciNo == 0.75:
                        if wholeNo == 0: return'3/4 cup' 
                        else : return easyText+' 3/4 cups'                    
                    if deciNo > 0.5:
                        if wholeNo == 0: return '~ 3/4 cup' 
                        else : return '~ ' + easyText + ' 3/4 cups'                        
                    if deciNo == 0.5:
                        if wholeNo == 0: return '1/2 cup' 
                        else : return easyText + ' 1/2 cups'                        
                    if deciNo > 0.25:
                        if wholeNo == 0: return '~ 1/2 cup' 
                        else : return '~ ' + easyText + ' 1/2 cups'                       
                    if deciNo == 0.25:
                        if wholeNo == 0: return '1/4 cup or 4 tablespoons' 
                        else : return easyText + '1/4 cups or '+ easyText+ ' cup & 4 tablespoons'                        
                    if deciNo > 0.125:
                        if wholeNo == 0: return '~ 1/4 cup or ~ 4 tablespoons' 
                        else: return '~ ' +easyText+ '1/4 cups or ~ '+easyText+ ' cup & 4 tablespoons'                        
                    if deciNo == 0.125:
                        if wholeNo == 0: return '2 tablespoons' 
                        else: return easyText + ' cup & 2 tablespoons'                        
                    if deciNo < 0.125:
                        if wholeNo == 0: return '~ less than 2 tablespoons' 
                        else : '~ '+easyText+ ' cup & 2 tablespoons'                
                else: 
                    if wholeNo == 1: return str(wholeNo) +' cup' 
                    else : return str(wholeNo) +' cups'
                    
                
        else:
            return 'nothing'
                         



    # function to fill gaps in days
    def fill_missing_days(data, start=1, end=7):
        day_map = {d["day_no"]: d for d in data}
        result = []
        for day in range(start, end + 1):
            result.append(
                day_map.get(day, {"day_no": day, "day_cost": 0})
            )
        return result
    
    # funcgtion to fill gaps in meals
    def fill_missing_meals(data):
        food_plan = copy.deepcopy(data)
        days = [1,2,3,4,5,6,7]
        meals = ['breakfast', 'lunch', 'dinner']
        weeklyData = []
        for d in days:
            day = {
                "name": dayIs(d),
                "meals": []
            }
            day_data = [row for row in food_plan if row.get("day_no") == d]
            day_cost = 0
            for row in day_data:
                day_cost += row.get('quantity',0)*row.get('base_price',0)
            day['cost'] = day_cost

            for m in meals:
                meal = {
                    "name": m,
                    "recipes": []
                }
                meal_data = [y for y in day_data if y.get("meal_type") == m]
                meal_cost = 0
                for row in meal_data:
                    meal_cost += row.get('quantity',0)*row.get('base_price',0)
                meal['cost'] = meal_cost

                recipes = []
                for r in meal_data:
                    recipe_name = r.get("recipe_name")
                    if recipe_name and recipe_name not in recipes:
                        recipes.append(recipe_name)

                meal["recipes"] = recipes
                day["meals"].append(meal)
            weeklyData.append(day)
        return weeklyData

    # function to get day name by day no
    def dayIs(no):
        dayNo = no
        if dayNo == 1:
            return 'Monday'
        elif dayNo == 2:
            return 'Tuesday'
        elif dayNo == 3:
            return 'Wednesday'
        elif dayNo == 4:
            return 'Thursday'
        elif dayNo == 5:
            return 'Friday'
        elif dayNo == 6:
            return 'Saturday'
        elif dayNo == 7:
            return 'Sunday'
        else:
            return 'Day'
    
    try:
        data = request.get_json()
        week_no = int(data.get('week_no'))
        food_plan_id = int(data.get('food_plan_id'))
            
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
        
        # get food_plan_week_id for user with week no and food plan id in food_plan_weeks table
        cursor.execute("""
            SELECT fpw.food_plan_week_id 
            FROM food_plan_weeks fpw 
                JOIN food_plans fp ON fp.food_plan_id = fpw.food_plan_id AND fp.user_id = %s AND fp.is_active = 1
            WHERE fpw.week_no = %s AND fpw.food_plan_id = %s AND fpw.is_active = 1        
        """,(s_user_id, week_no, food_plan_id))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'food plan week not found'}), 404

        food_plan_week_id = row['food_plan_week_id'] # print("food_plan_week_id is :", food_plan_week_id)
        
        # retrive data from food plan ingredient records table along with its referenced table
        cursor.execute("""
            SELECT fpir.food_plan_week_id, fpw.week_no, fpir.food_plan_day_id, fpd.day_no, fpir.food_plan_meal_id, fpm.meal_type, fpir.food_plan_recipe_id,
                fpir.recipe_id, r.name as recipe_name, fpir.ingredient_id, i.name as ingredient_name, fpir.quantity, fpir.base_unit, 
                COALESCE(up.custom_price, i.default_price) as base_price, i.cup_weight, i.cup_unit
            FROM food_plan_ingredient_records fpir
                JOIN food_plan_weeks fpw ON fpw.food_plan_week_id = fpir.food_plan_week_id AND fpw.is_active = 1
                JOIN food_plan_days fpd ON fpd.food_plan_day_id = fpir.food_plan_day_id AND fpd.is_active = 1
                JOIN food_plan_meals fpm ON fpm.food_plan_meal_id = fpir.food_plan_meal_id AND fpm.is_active = 1
                JOIN recipes r ON r.recipe_id = fpir.recipe_id AND r.is_active = 1
                JOIN ingredients i ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1 
                LEFT JOIN user_prices up ON up.ingredient_id = i.ingredient_id AND up.user_id = %s AND up.is_active = 1
            WHERE fpir.food_plan_id = %s AND fpir.food_plan_week_id = %s 
        """,(s_user_id, food_plan_id, food_plan_week_id))
        dashData = cursor.fetchall()
        if not dashData or dashData == []:
            return jsonify({'message': 'no data found for dashboard', 'data': 'none'}), 200
        for r in dashData:
            r['base_price'] = round(float(r['base_price']),2)
            r['quantity'] = round(float(r['quantity']),8)
            # r['easy_quantity'] = get_easy_quantity(r)
        finalData['dashData'] = dashData
    
        # get all aggregate values
        cursor.execute("""
            SELECT COUNT(DISTINCT fpir.food_plan_meal_id)  AS total_meals, 
                    COUNT(DISTINCT fpir.food_plan_recipe_id)  AS total_items,
                    COUNT(DISTINCT fpir.recipe_id) AS total_recipes, 
                    COUNT(DISTINCT fpir.ingredient_id) AS total_ingredients,
                    ROUND(SUM(fpir.quantity * COALESCE(up.custom_price, i.default_price)), 2) AS cost
            FROM food_plan_ingredient_records fpir
                JOIN ingredients i ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1 
                LEFT JOIN user_prices up ON up.ingredient_id = i.ingredient_id AND up.user_id = %s AND up.is_active = 1
            WHERE fpir.food_plan_id = %s AND fpir.food_plan_week_id = %s
        """,(s_user_id, food_plan_id, food_plan_week_id))
        aggData = cursor.fetchone()
        if not aggData:
            return jsonify({'error': 'error while finding aggregate data.'}), 
        if aggData and aggData['cost'] is not None:
            aggData['cost'] = float(aggData['cost'])
        finalData['aggData'] = aggData
        
        # ingredients and its cost  
        cursor.execute("""
            SELECT  i.name,  SUM(fpir.quantity) AS quantity, COALESCE(up.custom_price, i.default_price) as ingredient_cost, fpir.base_unit, 
                ROUND(SUM(fpir.quantity * COALESCE(up.custom_price, i.default_price)), 2) AS cost,  
                COUNT(DISTINCT fpir.food_plan_recipe_id) AS total_dishes, 
                COUNT(DISTINCT fpir.recipe_id) AS total_recipes, i.cup_weight, i.cup_unit  
            FROM food_plan_ingredient_records fpir
                JOIN ingredients i  ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1
                JOIN food_plans fp  ON fp.food_plan_id = fpir.food_plan_id AND fp.is_active = 1
                LEFT JOIN user_prices up  ON up.user_id = %s
                    AND up.ingredient_id = fpir.ingredient_id
                    AND up.is_active = 1
            WHERE fpir.food_plan_id = %s AND fpir.food_plan_week_id = %s AND fpir.is_active = 1
            GROUP BY  i.ingredient_id, i.name, fpir.base_unit, ingredient_cost, i.cup_weight, i.cup_unit 
            ORDER BY quantity DESC;
        """,(s_user_id, food_plan_id, food_plan_week_id)) 
        ingredientCostList = cursor.fetchall()
        if not ingredientCostList or ingredientCostList ==[]:
            return jsonify({'error': 'error while finding ingredient cost list data.'}), 404
        for r in ingredientCostList:
            r['cost'] = float(r['cost'])
            r['quantity'] = float(r['quantity'])
            r['ingredient_cost'] = float(r['ingredient_cost'])

        for i in ingredientCostList:
            if i.get('cup_weight'):
                i['cup_weight'] = float(i['cup_weight'])
            i['easy_quantity'] = get_easy_quantity(i)

        finalData['ingredientCostList'] = ingredientCostList

        # recipes and its cost
        cursor.execute("""
            SELECT distinct(fpir.recipe_id) , r.name, ROUND(SUM(fpir.quantity * COALESCE(up.custom_price, i.default_price)), 2) as recipe_cost
            FROM food_plan_ingredient_records fpir
                JOIN recipes r ON fpir.recipe_id = r.recipe_id AND r.is_active =1
                JOIN ingredients i  ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1
                LEFT JOIN user_prices up  ON up.user_id = %s AND up.ingredient_id = fpir.ingredient_id AND up.is_active = 1
            WHERE fpir.food_plan_id = %s AND fpir.food_plan_week_id = %s AND fpir.is_active = 1
            GROUP BY fpir.food_plan_recipe_id, fpir.recipe_id
            ORDER BY recipe_cost DESC
        """,(s_user_id, food_plan_id, food_plan_week_id)) 
        recipeCostList = cursor.fetchall()
        if not recipeCostList or recipeCostList ==[]:
            return jsonify({'error': 'error while finding recipe cost list data.'}), 404
        for r in recipeCostList:
            r['recipe_cost'] = float(r['recipe_cost'])
        finalData['recipeCostList'] = recipeCostList

        #meals and its cost
        cursor.execute("""
            SELECT fpm.meal_type , ROUND(SUM(fpir.quantity * COALESCE(up.custom_price, i.default_price)), 2) as meal_cost
            FROM food_plan_ingredient_records fpir
                JOIN food_plan_meals fpm ON fpir.food_plan_meal_id = fpm.food_plan_meal_id AND fpm.is_active =1
                JOIN ingredients i  ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1
                LEFT JOIN user_prices up  ON up.user_id = %s AND up.ingredient_id = fpir.ingredient_id AND up.is_active = 1
            WHERE fpir.food_plan_id = %s AND fpir.food_plan_week_id = %s AND fpir.is_active = 1
            GROUP BY fpm.meal_type
            ORDER BY meal_cost DESC;
        """,(s_user_id, food_plan_id, food_plan_week_id)) 
        mealCostList = cursor.fetchall()
        if not mealCostList or mealCostList ==[]:
            return jsonify({'error': 'error while finding meal cost list data.'}), 404
        for r in mealCostList:
            r['meal_cost'] = float(r['meal_cost'])
        finalData['mealCostList'] = mealCostList

        #day and its cost
        cursor.execute("""
            SELECT fpd.day_no, ROUND(SUM(fpir.quantity * COALESCE(up.custom_price, i.default_price)), 2) as day_cost
            FROM food_plan_ingredient_records fpir
                JOIN food_plan_days fpd ON fpir.food_plan_day_id = fpd.food_plan_day_id AND fpd.is_active =1
                JOIN ingredients i  ON i.ingredient_id = fpir.ingredient_id AND i.is_active = 1
                LEFT JOIN user_prices up  ON up.user_id = %s AND up.ingredient_id = fpir.ingredient_id AND up.is_active = 1
            WHERE fpir.food_plan_id = %s AND fpir.food_plan_week_id = %s AND fpir.is_active = 1
            GROUP BY fpd.day_no
            ORDER BY fpd.day_no;
        """,(s_user_id, food_plan_id, food_plan_week_id)) 
        dayCostList = cursor.fetchall()
        if not dayCostList or dayCostList ==[]:
            return jsonify({'error': 'error while finding day cost list data.'}), 404
        for r in dayCostList:
            r['day_cost'] = float(r['day_cost'])
        dayCostList = fill_missing_days(dayCostList)
        finalData['dayCostList'] = dayCostList

        # create dictonary to show food plan of whole even empty days or meals
        weeklyData = fill_missing_meals(dashData)
        finalData['weeklyData'] = weeklyData

        return jsonify({'message': 'fetched data ', 'data': finalData}), 200

    except Error as err:
        if conn:
            conn.rollback()
        return jsonify({'error': str(err)}), 500
    except Exception as err:
        if conn:
            conn.rollback()
        return jsonify({'error': str(err)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

