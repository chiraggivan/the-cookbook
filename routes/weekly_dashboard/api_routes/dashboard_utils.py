import math
import copy

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

# function to delete and insert new record for weekly dashboard
def set_weekly_dashboard(fp_id, fpw_id):
    food_plan_id = fp_id
    food_plan_week_id = fpw_id

    # delete the records of that day
    cursor.execute("""
        DELETE FROM food_plan_ingredient_records
        WHERE food_plan_week_id = %s
    """,(food_plan_week_id,))
    cursor.execute("SELECT food_plan_day_id FROM food_plan_days WHERE food_plan_week_id = %s AND is_active = 1",(food_plan_week_id,))
    days = cursor.fetchall()

    for day in days:
        food_plan_day_id = day['food_plan_day_id']
        cursor.execute("SELECT food_plan_meal_id FROM food_plan_meals WHERE food_plan_day_id = %s AND is_active = 1",(food_plan_day_id,))
        meals = cursor.fetchall()   

        for meal in meals:
            food_plan_meal_id = meal['food_plan_meal_id']
            cursor.execute("SELECT food_plan_recipe_id, recipe_id, display_order FROM food_plan_recipes WHERE food_plan_meal_id = %s AND is_active = 1",(food_plan_meal_id,))
            recipes = cursor.fetchall()

            for recipe in recipes:
                food_plan_recipe_id = recipe['food_plan_recipe_id']
                recipe_id = recipe['recipe_id']
                display_order = recipe['display_order']
                cursor.execute("SELECT ingredient_id, quantity, unit_id FROM recipe_ingredients WHERE recipe_id = %s AND is_active = 1",(recipe_id,))
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
                    cursor.execute("""
                        INSERT INTO food_plan_ingredient_records(food_plan_id, food_plan_week_id, food_plan_day_id, food_plan_meal_id, food_plan_recipe_id,
                                    recipe_id, ingredient_id, quantity, base_unit, display_order, is_active)
                        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)
                    """,(food_plan_id, food_plan_week_id, food_plan_day_id, food_plan_meal_id, food_plan_recipe_id,
                        recipe_id, ingredient_id, total_quantity, base_unit, display_order))
    conn.commit()
    return jsonify({'message': 'data reached backend'}), 200

# get easy text quantity 
def get_easy_quantity_text(data):
    units = ['kg','l','pc','bunch']
    # for unit in units:
    if data.get('base_unit') == 'kg':
        if data.get('cup_unit') == 'g' and data.get('cup_weight'):
            easyNumber = data.get('quantity')*1000 / data.get('cup_weight')
            wholeNo = int(easyNumber)
            deciNo = easyNumber - wholeNo  
            easyText = ''
            if data['quantity'] > 1:
                print("quantity :",data['quantity'])
                return str(math.ceil(data['quantity']*100)/100) + ' kilograms'    
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
                if deciNo > 0.0625: 
                    if wholeNo == 0: return '~ 2 tablespoons' 
                    else: return '~ ' +easyTextt+ ' cup & 2 tablespoons'     
                if deciNo == 0.0625:
                    if wholeNo == 0: return '1 tablespoon' 
                    else: return easyText + ' cup & 1 tablespoon'
                if deciNo > ((0.0625/3) *2):
                    if wholeNo == 0: return ' ~ 1 tablespoon' 
                    else : '~ '+easyText+ ' cup & 1 tablespoon'    
                if deciNo == ((0.0625/3) *2):
                    if wholeNo == 0: return '2 teaspoons' 
                    else: return easyText + ' cup & 2 teaspoons'
                if deciNo > ((0.0625/3) *1):
                    if wholeNo == 0: return ' ~ 2 teaspoons' 
                    else : '~ '+easyText+ ' cup & 2 tablespoons'    
                if deciNo == ((0.0625/3) *1):
                    if wholeNo == 0: return '1 teaspoon' 
                    else: return easyText + ' cup & 1 teaspoon'
                if deciNo < ((0.0625/3) *1):
                    if wholeNo == 0: return ' less than a teaspoon' 
                    else : '~ '+easyText+ ' cup & 1 teaspoon'            
            else: 
                if wholeNo == 1: return str(wholeNo) +' cup' 
                else : return str(wholeNo) +' cups'
        else:
            easyNumber = data.get('quantity')
            wholeNo = int(easyNumber)
            deciNo = easyNumber - wholeNo  
            easyText = ''

            if data['quantity'] >= 1:
                return str(math.ceil(data['quantity']*100)/100) + ' kilograms'
            else:
                return str(math.ceil(data['quantity']*1000)) + ' grams'
                
    elif data.get('base_unit') == 'l':
        easyNumber = data.get('quantity')
        wholeNo = int(easyNumber)
        deciNo = easyNumber - wholeNo  
        easyText = ''

        if data['quantity'] > 1:
            return str(math.ceil(data['quantity']*100)/100) + ' Litres'    
        
        if deciNo:
            if deciNo > 0.96:
                return '~ ' + (wholeNo + 1) + ' Litre'                          
            if deciNo == 0.96:
                return'4 cups'               
            if deciNo > 0.72:
                return '~ less than 4 cups'                         
            if deciNo == 0.720:
                if wholeNo == 0: return '1/2 cup'                 
            if deciNo == 0.5:
                return '1/2 Litre'                      
            if deciNo > 0.48:
                return 'slightly more than 2 Cups or nearly 1/2 Litre'                       
            if deciNo == 0.48:
                return '~ 2 Cups or ~ 1/2 Litre'                         
            if deciNo > 0.240:
                return str(math.ceil(data['quantity']*100))+ ' millilitres'     
            if deciNo == 0.240: 
                return '1 cup or 240 millilitres'  
            if deciNo > 0.120:
                return str(math.ceil(data['quantity']*100))+ ' millilitres'     
            if deciNo == 0.120: 
                return '1/2 cup or 120 ml'
            if deciNo > 0.060:
                return str(math.ceil(data['quantity']*100))+ ' ml'     
            if deciNo == 0.060: 
                return '4 tablespoons or 60 ml'
            if deciNo > 0.030:
                return 'slightly more than 2 tablespoons or '+ str(math.ceil(data['quantity']*100))+ ' ml'     
            if deciNo == 0.030: 
                return '2 tablespoons or 30 ml'
            if deciNo > 0.015:
                return 'slightly more than a tablespoon or '+ str(math.ceil(data['quantity']*100))+ ' ml'     
            if deciNo == 0.015: 
                return '1 tablespoon or 15 ml'
            if deciNo > 0.005:
                return 'less than a tablespoon or '+str(math.ceil(data['quantity']*100))+ ' ml'     
            if deciNo == 0.005: 
                return '1 teaspoon or 5 ml'
            if deciNo < 0.005:
                return 'less than a teaspoon'                
        else: 
            if wholeNo == 1: return str(wholeNo) +' Litre' 
            else : return str(wholeNo) +' Litres'

    elif data.get('base_unit') == 'pc' or data.get('base_unit') == 'bunch':
        easyNumber = data.get('quantity')
        wholeNo = int(easyNumber)
        deciNo = easyNumber - wholeNo  
        easyText = ''

        if deciNo:
            if deciNo > 0.75:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return 'less than 1 ' + data['name']
                    else: return '~ ' + str(wholeNo + 1) + ' ' + data['name'] +'s'  
                else:
                    if wholeNo == 0 : return 'less than 1 bunch'
                    else: return '~ ' + str(wholeNo + 1) + 'bunches'
            if deciNo == 0.75:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return '3/4 ' + data['name']
                    else: return str(wholeNo) + ' 3/4 ' + data['name'] +'s'
                else:
                    if wholeNo == 0 : return '3/4 bunch'
                    else: return str(wholeNo) + ' 3/4 bunches'                 
            if deciNo > 0.5:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return 'less than 3/4 ' + data['name']
                    else: return '~ ' + str(wholeNo) + ' 3/4 ' + data['name'] +'s' 
                else:     
                    if wholeNo == 0 : return 'less than 3/4 bunch'
                    else: return '~ ' + str(wholeNo + 1) +  ' 3/4 bunches'                   
            if deciNo == 0.50:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return '1/2 ' + data['name']
                    else: return str(wholeNo) + ' 1/2 ' + data['name'] +'s' 
                else:
                    if wholeNo == 0 : return '1/2 bunch'
                    else: return str(wholeNo) + ' 1/2 bunches'         
            if deciNo > 0.25:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return 'less than 1/2 ' + data['name']
                    else: return '~ ' + str(wholeNo) + ' 1/2 ' + data['name'] +'s'                      
                else:
                    if wholeNo == 0 : return 'less than 1/2 bunch'
                    else: return '~ ' + str(wholeNo + 1) +  ' 1/2 bunches'
            if deciNo == 0.25:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return '1/4 ' + data['name']
                    else: return str(wholeNo) + ' 1/4 ' + data['name'] +'s'     
                else:
                    if wholeNo == 0 : return '1/4 bunch'
                    else: return str(wholeNo) + ' 1/4 bunches'
            if deciNo < 0.25:
                if data.get('base_unit') == 'pc':
                    if wholeNo == 0 : return 'less than 1/4 ' + data['name']
                    else: return '~ ' + str(wholeNo ) + ' 1/4 ' + data['name'] +'s' 
                else:
                    if wholeNo == 0 : return 'less than 1/4 bunch'
                    else: return '~ ' + str(wholeNo + 1) +  ' 1/4 bunches'

        else:
            if data.get('base_unit') == 'pc':
                if wholeNo == 1 : return str(wholeNo) +' '+ data['name']  
                else: return str(wholeNo) + data['name'] +'s'      
            else:
                if wholeNo == 1 : return str(wholeNo) + ' bunch'  
                else: return str(wholeNo) + ' bunches'
            
    else:
        return 'nothing'
            