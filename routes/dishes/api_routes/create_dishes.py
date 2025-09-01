from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import dishes_api_bp

# Save recipe as dish
@dishes_api_bp.route('/dishes/<int:recipe_id>', methods=['POST'])
@jwt_required()
def save_dish(recipe_id):

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
        
        def normalize_ingredient_data(data):
            cleaned = {}

            # Check if 'recipe' exists and is a non-empty dictionary
            if not isinstance(data.get('recipe'), dict) or not data['recipe']:
                return None, "'Recipe' details are missing or invalid type"
            recipe = data.get('recipe')
            recipe_cleaned = {}
            # String fields: trim, collapse multiple spaces, convert to lowercase
            recipe_fields = ["comment", "total_cost", "recipe_id"]
            for field in recipe_fields:
                value = recipe.get(field)

                if isinstance(value, str):
                    # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                    recipe_cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
                else:
                    recipe_cleaned[field] = value  # keep as-is if not a string
            cleaned['recipe'] = recipe_cleaned

            m_fields = ['ingredients', 'steps']
            for x in m_fields:
                if not isinstance(data.get(x), list):
                    return None, f"{x} are missing or invalid type"
                var_data = data.get(x,[])
                var_cleaned = []
                if x == 'ingredients':
                    var_fields = ['cost','ingredient_id','name','price','quantity','unit','unit_id','unit_name','source']
                elif x == 'steps':
                    var_fields = ['step_order','step_text','estimate_time']
                for i in var_data:
                    var_field_cleaned = {}
                    for field in var_fields:
                        value = i.get(field)
                        if isinstance(value, str):
                            # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                            var_field_cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
                        else:
                            var_field_cleaned[field] = value  # keep as-is if not a string
                    var_cleaned.append(var_field_cleaned)
                cleaned[x] = var_cleaned

            return cleaned, None

        def validate_ingredient(data):
            
            recipe = data.get("recipe")
            # --- recipe_id ---
            recipe_id = recipe['recipe_id']
            if not isinstance(recipe_id, int) or recipe_id <= 0:
                return f"Invalid recipe id: must be a non-empty int> 0"
            
            # --- total_cost ---
            total_cost = recipe['total_cost']
            if not isinstance(total_cost, (int,float)) or total_cost <= 0:
                return f"Invalid total_cost: must be a non-empty int ≤ 10000000000"
            
            # --- comment ---
            comment = recipe['comment']
            if not isinstance(comment, str) or len(comment) > 500:
                return f"Invalid comment: must not be > 500 character"
            
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
            
            ingredients = data.get('ingredients',[])
            for ing in ingredients:
                # --- cost ---
                cost = ing['cost']
                if not isinstance(cost, (int,float)) or cost <= 0 or cost >1000000:
                    return f"Invalid cost: must be a int between 0 and 1000000"
                
            # --- ingredient_id ---
                ingredient_id = ing['ingredient_id']
                if not isinstance(ingredient_id, int) or ingredient_id <= 0:
                    return f"Invalid ingredient_id: must be > 0 "
                
            # --- price ---
                price = ing['price']
                if not isinstance(price,(int,float)) or price <= 0 or price >1000:
                    return f"Invalid price: must be a int between 0 and 1000"
                
            # --- quantity ---
                quantity = ing['quantity']
                if not isinstance(quantity, (int,float)) or quantity <= 0 or quantity >100000:
                    return f"Invalid quantity: must be a int between 0 and 100000"
                
            # --- unit_id ---
                unit_id = ing['unit_id']
                if not isinstance(unit_id, int) or unit_id <= 0:
                    return f"Invalid unit_id: must be a int > 0"
            
            # --- name ---
                name = ing['name']
                if not isinstance(name, str) or len(name) > 500:
                    return f"Invalid name: must be of length < 500"
            
            # --- unit ---
                unit = ing['unit']
                if not isinstance(unit, str) or len(unit) > 500:
                    return f"Invalid unit: must be of length < 500"

            # --- unit_name ---
                unit_name = ing['unit_name']
                if not isinstance(unit_name, str) or len(unit_name) > 500:
                    return f"Invalid unit_name: must be of length < 500"
            
            # --- source ---
                source = ing['source']
                if not isinstance(source, str) or len(source) > 500:
                    return f"Invalid source: must be of length < 500"

            return None 

        #return jsonify({'submitted_data': request.get_json()})
        data, error = normalize_ingredient_data(request.get_json())
        
        if error:
            return jsonify({'error': error}), 400
                
        error = validate_ingredient(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400  

        recipe_details = data.get('recipe')
        recipe_id = recipe_details['recipe_id']

        ingredients_details = data.get('ingredients',[])

        # connect to db
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

         # Check if recipe exists and belongs to user
        cursor.execute("""
            SELECT recipe_id FROM recipes 
            WHERE recipe_id = %s AND user_id = %s AND is_active = TRUE
        """, (recipe_id, s_user_id))
        recipe = cursor.fetchone()
        if not recipe:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Recipe not found or not authorized'}), 404

        # insert data into dishes
        cursor.execute("""
            INSERT INTO dishes(user_id, recipe_id, preparation_date, total_cost) 
            VALUES (%s,%s,CURRENT_TIMESTAMP,%s)
        """,(s_user_id, recipe_id,recipe_details['total_cost']))
        dish_id = cursor.lastrowid

        for ing in ingredient_details:
            cursor.execute("""
                INSERT INTO dish_ingredients(
                    dish_id, ingredient_id, quantity, unit_id, 
                    unit_name, total_ingredient_cost, source, base_price, base_unit)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,(dish_id, ing['ingredient_id'], ing['quantity'], ing['unit_id'], 
                ing['unit_name'], ing['price'], ing['source'], ing['cost'], ing['unit']))
        
        conn.commit()
        cursor.close()
        conn.close()        
        return jsonify({"message": 'Successfully save in dishes prepared'}), 200
        
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500
