from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import dishes_api_bp
import re
from datetime import date

# Save recipe as dish
@dishes_api_bp.route('/', methods=['POST'])
@jwt_required()
def create_dish():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    # return jsonify({'error': 'data received in backend', 'submitted data': request.get_json()}), 400
    try:
        
        def normalize_ingredient_data(data):
            cleaned = {}

            # Check if data exists, is a non-empty dictionary and if component exists as list
            if not isinstance(data, dict) or not data.get('components',[]):
                return None, "Recipe details are missing or invalid type"
        
            # String fields: trim, collapse multiple spaces, convert to lowercase
            recipe_fields = ["recipe_id", "recipe_name", "portion_size", "preparation_date", "time_prepared", "meal", "recipe_by", "comment", "total_cost" ]
            for field in recipe_fields:
                value = data.get(field)

                if isinstance(value, str):
                    # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                    cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
                else:
                    cleaned[field] = value  # keep as-is if not a string
            # cleaned[field] = recipe_cleaned
            
            components = data['components']
            cleaned_components = []
            for component in components:
                if not component.get('ingredients',[]):
                    return None, "ingredients are missing or invalid type"

                component_fields = ['component_text', 'display_order']
                cleaned_component ={}
                for field in component_fields:
                    value = component.get(field)
                    if isinstance(value, str):
                        # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                        cleaned_component[field] = re.sub(r"\s+", " ", value.strip()).lower()
                    else:
                        cleaned_component[field] = value  # keep as-is if not a string
                
                ingredients = component['ingredients']
                cleaned_ingredients = []
                for ingredient in ingredients:
                    ingredient_fields = ['ingredient_id', 'name', 'quantity', 'unit_id', 'unit_name', 'cost', 'base_price', 'base_unit', 'display_order' ]
                    cleaned_ingredient ={}
                    for field in ingredient_fields:
                        value = ingredient.get(field)
                        if isinstance(value, str):
                            # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                            cleaned_ingredient[field] = re.sub(r"\s+", " ", value.strip()).lower()
                        else:
                            cleaned_ingredient[field] = value  # keep as-is if not a string
                    
                    cleaned_ingredients.append(cleaned_ingredient)
                
                cleaned_component['ingredients'] = cleaned_ingredients            
                cleaned_components.append(cleaned_component)

            cleaned['components'] = cleaned_components

            return cleaned, None

        def validate_ingredient(data):
            
            # recipe = data.get("recipe")
            # --- recipe_id ---
            recipe_id = data['recipe_id']
            if not isinstance(recipe_id, int) or recipe_id <= 0:
                return f"Invalid recipe id: must be a non-empty int> 0"
            
            # --- recipe_name ---
            recipe_name = data['recipe_name']
            if not recipe_name or not isinstance(recipe_name, str) or len(recipe_name) > 50:
                return f"Invalid recipe name: must be a non-empty string ≤ 50 chars"
            
            # --- portion_size ---
            portion_size = data['portion_size']
            if not portion_size or not isinstance(portion_size, str) or len(portion_size) > 50:
                return f"Invalid portion_size: must be a non-empty string ≤ 50 chars"

            # --- preparation_date ---
            preparation_date = data['preparation_date']
            if not isinstance(preparation_date, str) or len(preparation_date) > 50:
                return f"Invalid preparation_date: must be a non-empty string ≤ 50 chars"

            # --- time_prepared ---
            time_prepared = data['time_prepared']
            if not isinstance(time_prepared, str) or len(time_prepared) > 50:
                return f"Invalid time_prepared: must be a non-empty string ≤ 50 chars"

            # --- meal ---
            meal = data['meal']
            if not isinstance(meal, str) or len(meal) > 16:
                return f"Invalid time_prepared: must be a non-empty string ≤ 16 chars"
            
            # --- recipe_by ---
            recipe_by = data['recipe_by']
            if not isinstance(recipe_by, int) or recipe_by <= 0:
                return f"Invalid recipe by: must be a non-empty int> 0"

            # --- total_cost ---
            total_cost = data['total_cost']
            if not isinstance(total_cost, (int,float)) or total_cost <= 0 or total_cost > 10000000000:
                return f"Invalid total_cost: must be a non-empty int ≤ 10000000000"
            
            # --- comment ---
            comment = data['comment']
            if not isinstance(comment, str) or len(comment) > 500:
                return f"Invalid comment: must not be > 500 character"

            components = data['components']
            # find total ingredients
            total_ingredients = 0
            for component in components:
                total_ingredients = total_ingredients + len(component['ingredients'])
            print("total ingredients are : ", total_ingredients)

            for component in components:
                # --- component_text ---
                component_text = component['component_text']
                if not isinstance(component_text, str) or len(component_text) > 255:
                    return f"Invalid component_text : must be of length < 255"
                
                # --- display_order --- 
                display_order = component['display_order']
                if not isinstance(display_order, int) or display_order < 0 or display_order >= len(components):
                    return f"Invalid display_order: must be a integer >= 0 and  less than {len(components)}"

                # --- ingredients ---
                ingredients = component['ingredients']
                for ing in ingredients:
                    # --- cost ---
                    base_price = ing['base_price']
                    if not isinstance(base_price, (int,float)) or base_price <= 0 or base_price >1000000:
                        return f"Invalid base_price: must be a int between 0 and 1000000"
                
                    # --- ingredient_id ---
                    ingredient_id = ing['ingredient_id']
                    if not isinstance(ingredient_id, int) or ingredient_id <= 0:
                        return f"Invalid ingredient_id: must be > 0 "

                    # --- name ---
                    name = ing['name']
                    if not isinstance(name, str) or len(name) > 255:
                        return f"Invalid name: must be of length < 255"
                    
                    # --- cost ---
                    cost = ing['cost']
                    if not isinstance(cost,(int,float)) or cost <= 0 or cost > 100000:
                        return f"Invalid cost: must be a int between 0 and 100000"
                    
                    # --- quantity ---
                    quantity = ing['quantity']
                    if not isinstance(quantity, (int,float)) or quantity <= 0 or quantity > 100000:
                        return f"Invalid quantity: must be a int between 0 and 100000"
                    
                    # --- unit_id ---
                    unit_id = ing['unit_id']
                    if not isinstance(unit_id, int) or unit_id <= 0:
                        return f"Invalid unit_id: must be a int > 0"
                
                    # --- base_unit ---
                    base_unit = ing['base_unit']
                    if not isinstance(base_unit, str) or len(base_unit) > 1000000:
                        return f"Invalid base unit: must be of length < 1000000"

                    # --- unit_name ---
                    unit_name = ing['unit_name']
                    if not isinstance(unit_name, str) or len(unit_name) > 500:
                        return f"Invalid unit_name: must be of length < 500"
                    
                    # --- display_order ---
                    display_order = ing['display_order']
                    if not isinstance(display_order, int) or display_order < 0 or display_order > total_ingredients:
                       return f"Invalid display_order for ingredients: must be a int > 0 and less than {total_ingredients + 1}" 

            steps = data.get('steps',[])
            if steps:
                for step in steps:
                    # --- step_order ---
                    step_order = step['step_order']
                    if not isinstance(step_order, int) or step_order <= 0 or step_order >1000:
                        return f"Invalid step_order: must be a int between 0 and 1000"
                    
                    # --- step_text ---
                    step_text = step['step_text']
                    if not isinstance(step_text, str) or len(step_text) > 500:
                        return f"Invalid step_text: must be of length < 500"

                    # --- estimated_time ---
                    estimated_time = step['estimated_time']
                    if not isinstance(estimated_time, int) or estimated_time <= 0 :
                        return f"Invalid estimated_time: must be a int > 0"
            
            return None 

        #return jsonify({'submitted_data': request.get_json()})
        data, error = normalize_ingredient_data(request.get_json())
        
        if error:
            return jsonify({'error': error}), 400
        
        error = validate_ingredient(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400  

        # ---------------------- data normalised and validated  ---------------------------------
        return jsonify({'error': 'data received in backend', 'submitted data': data}), 400        
        recipe_details = data
        recipe_id = recipe_details['recipe_id']
        recipe_name = recipe_details['recipe_name']
        portion_size = recipe_details['portion_size']
        recipe_by = recipe_details['recipe_by']
        components = recipe_details['components']
        preparation_date = recipe_details['preparation_date']
        if preparation_date is None:
            preparation_date = date.today()
        time_perpared = recipe_details['time_perpared']
        meal = recipe_details['meal']
        total_cost = recipe_details['total_cost']
        comment = recipe_details['comment']

        # ingredients_details = data.get('ingredients',[])

        # connect to db
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

         # Check if recipe exists and belongs to user
        cursor.execute("""
            SELECT 1 FROM recipes 
            WHERE recipe_id = %s AND name = %s AND portion_size = %s AND user_id = %s AND is_active = TRUE
        """, (recipe_id, recipe_name, portion_size, recipe_by))
        recipe = cursor.fetchone()
        if not recipe:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Recipe not found or not authorized'}), 404

        # Validate ingredients(base unit and base price coming from body is correct)
        for component in components:
            ingredients = component.get('ingredients')
            for ing in ingredients:
                # Validate unit fers the ingredient                
                cursor.execute("""SELECT 1 FROM units u JOIN ingredients i ON u.ingredient_id = i.ingredient_id
                                WHERE u.unit_id = %s AND i.ingredient_id = %s AND i.name = %s AND u.unit_name = %s
                                """, (ing['unit_id'], ing['ingredient_id'], ing['name'], ing['unit_name']))
                if not cursor.fetchone():
                    cursor.close()
                    conn.close()
                    return jsonify({'error': f"Unit ID {ing['unit_id']} not matching with unit name- {ing['unit_name']}, ingredient ID {ing['ingredient_id']}, name - {ing['name']}"}), 400   
        
        # --------------  Data checked against DB rules and about to be inserted in db  ---------------------
        # insert data into dishes table
        cursor.execute("""
            INSERT INTO dishes(user_id, recipe_id, recipe_name, portion_size, preparation_date, time_prepared, total_cost, meal, recipe_by, comment) 
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,(s_user_id, recipe_id, recipe_name, portion_size, preparation_date, time_prepared, total_cost, meal, recipe_by, comment))
        dish_id = cursor.lastrowid

        # insert data into dish_ingredients table
        for component in components:
            component_text = component['component_text']
            comp_display_order = component['display_order']

            for ing in component['ingredients']:
                cursor.execute("""
                    INSERT INTO dish_ingredients(
                        dish_id, component_text, component_display_order, ingredient_id, ingredient_name, 
                        ingredient_display_order, quantity, unit_id, unit_name, cost, base_price, base_unit)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,(dish_id, component_text, component_display_order, ing['ingredient_id'], ing['name'], 
                    ing['display_order'], ing['quantity'], ing['unit_id'], ing['unit_name'], ing['cost'], ing['base_price'], ing['base_unit']))
        
        conn.commit()
        cursor.close()
        conn.close()        
        return jsonify({"message": 'Successfully save in dishes prepared'}), 200
        
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500
