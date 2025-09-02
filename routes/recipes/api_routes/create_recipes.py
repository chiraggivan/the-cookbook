from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import recipes_api_bp

# search ingredients for recipe
@recipes_api_bp.route("/ingredients/search")
@jwt_required()
def search_ingredients():

    s_user_id = get_jwt_identity()
    print("user id is: ", s_user_id)
    q = request.args.get("q", "").strip().lower()
    print(" value of q :", q)
    if not q:
        return jsonify([])

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT ingredient_id, name
            FROM ingredients
            WHERE LOWER(name) LIKE %s
            AND (approval_status = "approved" OR submitted_by = %s)
            LIMIT 20
        """,(f"%{q}%", s_user_id))
        results = cursor.fetchall()
        print("result: ", results)
        cursor.close()
        conn.close()
        return jsonify(results)

    except Exception as e:
        print("Error in search_ingredients:", e)
        return jsonify([])

# Create new recipe
@recipes_api_bp.route('/recipes', methods=['POST'])
@jwt_required()
def create_recipe():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
        def normalize_ingredient_data(data):
            cleaned = {}

            # String fields: trim, collapse multiple spaces, convert to lowercase
            str_fields = ["name", "portion_size", "privacy", "description"]
            for field in str_fields:
                value = data.get(field)

                if isinstance(value, str):
                    # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                    cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
                else:
                    cleaned[field] = value  # keep as-is if not a string
                    #return jsonify({"error": f"Expected string in {field} but recieved non string value", "submitted_data": request.get_json()}), 400
            
            # Handle ingredients (list of dicts)
            ingredients = data.get("ingredients", [])
            if isinstance(ingredients, list):
                normalized_ingredients = []
                for ing in ingredients:
                    if isinstance(ing, dict):
                        norm_ing = {}
                        for k, v in ing.items():
                            if isinstance(v, str):
                                norm_ing[k] = re.sub(r"\s+", " ", v.strip()).lower()
                            else:
                                norm_ing[k] = v
                        normalized_ingredients.append(norm_ing)
                cleaned["ingredients"] = normalized_ingredients
            else:
                return jsonify({"error": "ingredients field is not a proper type", "submitted_data": data}), 400 
            
            return cleaned
            
        def validate_ingredient(data):
            # --- name ---
            name = data.get("name")
            if not name or not isinstance(name, str) or len(name) > 50:
                return f"Invalid name: must be a non-empty string ≤ 50 chars"
            
            # --- portion_size ---
            portion_size = data.get("portion_size")
            if not portion_size or not isinstance(portion_size, str) or len(portion_size) > 50:
                return f"Invalid portion_size: must be a non-empty string ≤ 50 chars"
            
            # --- privacy ---
            privacy = data.get("privacy")
            if not privacy or not isinstance(privacy, str) or privacy not in ('public', 'private') or len(privacy) > 10:
                return f"Invalid privacy: must be within (public, private)"
            
            # --- description ---
            description = data.get("description")
            if not isinstance(description, str) or len(description) > 500:
                return f"Invalid description: must be a string ≤ 500 chars"

            # min 2 Ingredients validation for a recipe
            ingredients = data.get("ingredients", [])
            if not isinstance(ingredients, list) or len(ingredients) < 2:
                return "Recipe must have at least 2 ingredients"

            # Normalize ingredients (list of dicts)
            ing_fields = ["ingredient_id", "quantity", "unit_id", "base_unit", "base_price"]
            ing_base_fields =["custom_price", "unit_supplied", "custom_quantity", "location"]

            for ing in ingredients:
                # --- ingredient id ---
                ing_id = ing.get("ingredient_id")
                if not isinstance(ing_id, (int, float)) or ing_id <= 0 or ing_id >= 10**6:
                    return f"Invalid ingredient id: must be numeric > 0  and < 1000000"
                
                # --- quantity ---
                quantity = ing.get("quantity")
                if not isinstance(quantity, (int, float)) or quantity <= 0 or quantity >= 10**6:
                    return f"Invalid quantity: must be numeric > 0  and < 1000000"
                
                # --- unit id ---
                unit_id = ing.get("unit_id")
                if not isinstance(unit_id, (int, float)) or unit_id <= 0 or unit_id >= 10**8:
                    return f"Invalid unit_id:{unit_id} must be numeric > 0  and < 100000000"
               
                # --- base_unit ---
                base_unit = ing.get("base_unit")
                if not base_unit or not isinstance(base_unit, str) or len(base_unit) > 10 :
                    return f"Invalid base_unit {base_unit}: must be within ['kg' 'l', 'pc', 'bunch']"

                if base_unit not in ['kg', 'l', 'pc', 'bunch']:
                    return f"Invalid base unit  for ingredient : must be a in ['kg', 'l', 'pc', 'bunch']"
   
                # --- base_price ---
                base_price = ing.get("base_price")
                if not isinstance(base_price, (int, float)) or unit_id <= 0 or unit_id >= 10**8:
                    return f"Invalid base_price: must be numeric > 0  and < 100000000"
               
                # --- custom_price ---
                custom_price = ing.get("custom_price")
                if custom_price:
                    if not isinstance(custom_price, (int, float)) or custom_price <= 0 or custom_price >= 10**6:
                        return f"Invalid custom price: must be numeric > 0  and < 1000000"
                
                # --- custom_quantity ---
                custom_quantity = ing.get("custom_quantity")
                if custom_quantity:
                    if not isinstance(custom_quantity, (int, float)) or custom_quantity <= 0 or custom_quantity >= 10**6:
                        return f"Invalid custom price: must be numeric > 0  and < 1000000"
            
                # --- unit_supplied ---
                unit_supplied = ing.get("unit_supplied")
                if base_unit in ['kg', 'g', 'oz', 'lbs', ]:
                    if unit_supplied not in ['kg', 'g', 'oz', 'lbs']:
                        return f"Invalid unit supplied for ingredient : must be a in ['kg', 'g', 'oz', 'lbs']"
                
                if base_unit in ['l', 'ml', 'pint', 'fl.oz']:
                    if unit_supplied not in ['l', 'ml', 'pint', 'fl.oz']:
                        return f"Invalid unit supplied for ingredient : must be a in [ 'l', 'ml', 'pint', 'fl.oz']"
                
                if base_unit in ['pc']:
                    if unit_supplied not in ['pc']:
                        return f"Invalid unit supplied for ingredient : must be a in [ 'pc']"
                
                if base_unit in ['bunch']:
                    if unit_supplied not in ['bunch']:
                        return f"Invalid unit supplied for ingredient : must be a in ['bunch']"

                # --- Location ---
                location = ing.get("location")
                if not isinstance(location, str) or len(location) > 50:
                    return f"Invalid location: must be a string ≤ 50 chars"

            return None 

        data = normalize_ingredient_data(request.get_json())
        
        error = validate_ingredient(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400  
        
        name = data['name']
        portion_size = data['portion_size']
        privacy = data['privacy']
        description = data['description']
        ingredients = data['ingredients']
        # ------------------validation of every field of data done, now connect with db -------------------------------
        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        # Check for existing recipe with same name and portion_size
        cursor.execute("""
            SELECT recipe_id FROM recipes 
            WHERE name = %s AND portion_size = %s AND user_id = %s AND is_active = TRUE
            """, (name, portion_size, s_user_id))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                'error': 'Recipe with same name and portion size already exists',
                'submitted_data': data
                }), 409

        # Validate ingredients(base unit and base price coming from body is correct)
        for ing in ingredients:
            # Validate unit refers the ingredient                
            cursor.execute("SELECT 1 FROM units WHERE unit_id = %s AND ingredient_id = %s", (ing['unit_id'], ing['ingredient_id']))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': f"Unit ID {ing['unit_id']} not valid for ingredient ID {ing['ingredient_id']}"}), 400   

            # get the base price, base unit for the ingredient which user might have changed(only base price) which is also active
            cursor.execute("""
                SELECT i.ingredient_id, COALESCE(up.custom_price, i.default_price) AS price, i.base_unit as base_unit
                FROM ingredients i  LEFT JOIN user_prices up
                ON i.ingredient_id = up.ingredient_id AND up.user_id = %s AND up.is_active = 1
                WHERE i.ingredient_id = %s
                AND i.is_active = 1
            """, (s_user_id, ing['ingredient_id']))

            ing_data = cursor.fetchone()
            if not ing_data:
                cursor.close()
                conn.close()
                return jsonify({'error': f"Ingredient ID {ing['ingredient_id']} not found"}), 404

            base_unit = ing_data['base_unit']
            price = ing_data['price']
            f_base_price = ing['base_price']
            if base_unit != ing['base_unit']:
                cursor.close()
                conn.close()
                return jsonify({'error': f"base unit of ingredient {ing['ingredient_id']} not matched with stored data"}), 400    
            if round(float(price),6) != round(float(ing['base_price']),6):
                cursor.close()
                conn.close()
                return jsonify({'error': f"base price : price = {round(price,6)} ing['base_price'] = {round(f_base_price,6)} of ingredient {ing['ingredient_id']} not matched with stored data"}), 400    

        #return jsonify({'message': "Every thing accepted and ready to insert recipe", 'submitted_data': data}), 400
        
        # Insert into recipes
        cursor.execute("""
            INSERT INTO recipes (name, portion_size, user_id, privacy, description, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
            """, (name, portion_size, s_user_id, privacy, description))
        recipe_id = cursor.lastrowid

        # Insert into recipe_ingredients
        for ing in ingredients:
            cursor.execute("""
                INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id, is_active)
                VALUES (%s, %s, %s, %s, TRUE)
            """, (recipe_id, ing['ingredient_id'], ing['quantity'], ing['unit_id']))
              
        # Update user_prices if custom_price is provided and different 
        for ing in ingredients:
            if ing['custom_quantity'] != 1 or ing['base_unit'] != ing['unit_supplied'] or ing['base_price'] != ing['custom_price']: 

                if ing['custom_quantity'] != 1: 
                    custom_price = ing['custom_price']/ing['custom_quantity']
                    custom_quantity = 1
                else:
                    custom_price = ing['custom_price']
                    custom_quantity = ing['custom_quantity']
                
                if ing['unit_supplied'] == 'kg':
                    unit_supplied = 'kg'
                elif ing['unit_supplied'] == 'g':
                    custom_price = custom_price*1000
                    unit_supplied = 'kg'
                elif ing['unit_supplied'] == 'oz':
                    custom_price = custom_price*35.274
                    unit_supplied = 'kg'
                elif ing['unit_supplied'] == 'lbs':
                    custom_price = custom_price*2.205
                    unit_supplied = 'kg'

                elif ing['unit_supplied'] == 'l':
                    unit_supplied = 'l'
                elif ing['unit_supplied'] == 'ml':
                    custom_price = custom_price*1000
                    unit_supplied = 'l'
                elif ing['unit_supplied'] == 'fl.oz':
                    custom_price = custom_price*35.1951
                    unit_supplied = 'l'
                elif ing['unit_supplied'] == 'pint':
                    custom_price = custom_price*1.75975
                    unit_supplied = 'l'
                elif ing['unit_supplied'] == 'pc':
                    unit_supplied = 'pc'
                elif ing['unit_supplied'] == 'bunch':
                    unit_supplied = 'bunch'
            
                cursor.callproc('update_insert_user_price', (
                    s_user_id, 
                    ing['ingredient_id'], 
                    custom_price, 
                    custom_quantity,
                    unit_supplied, 
                    ing['location'] 
                ))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'{name} : Recipe created successfully', 'recipe_id': recipe_id}), 201

    except Error as err:
        if conn and conn.is_connected():
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({'error': str(err)}), 500
