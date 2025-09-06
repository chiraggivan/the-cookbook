from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import recipes_api_bp
import re


# search ingredients for recipe
@recipes_api_bp.route("/ingredients/search")
@jwt_required()
def search_ingredients():

    s_user_id = get_jwt_identity()
   
    q = request.args.get("q", "").strip().lower()
    print("user id:",s_user_id," value of q :", q)
    if not q:
        return jsonify([])

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT i.ingredient_id, i.name, COALESCE(up.custom_price , i.default_price) as price, i.base_unit
            FROM ingredients i LEFT JOIN user_prices up ON i.ingredient_id = up.ingredient_id 
            AND up.user_id = %s AND up.is_active = 1
            WHERE LOWER(i.name) LIKE %s
            AND (i.approval_status = "approved" OR i.submitted_by = %s)
            LIMIT 20
        """,( s_user_id, f"%{q}%", s_user_id))
        results = cursor.fetchall()
        #print("result: ", results)
        cursor.close()
        conn.close()
        return jsonify(results)

    except Exception as e:
        print("Error in search_ingredients:", e)
        return jsonify([])

# search units for selected ingredients
@recipes_api_bp.route("/ingredient-units")
@jwt_required()
def get_ingredient_units():
    s_user_id = get_jwt_identity()
    #print("user id is: ", s_user_id)
    ingredient_id = request.args.get("ingredient", type=int)
    #print(" value of ingredient id :", ingredient_id)
    if not ingredient_id:
        return jsonify([])

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT unit_id, unit_name, conversion_factor
            FROM units 
            WHERE ingredient_id = %s AND is_active = 1
        """,(ingredient_id,))
        results = cursor.fetchall()
        #print("result: ", results)
        cursor.close()
        conn.close()
        return jsonify(results)
    
    except Exception as e:
        print("Error in search ingredient units:", e)
        return jsonify([])

# Create new recipe
@recipes_api_bp.route('/new-recipe', methods=['POST'])
@jwt_required()
def create_recipe():

    s_user_id = get_jwt_identity()
    #print("json data : ", request.get_json())
    def to_int(value, field_name):
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid {field_name}: must be an integer")

    def to_float(value, field_name):
        try:
            return float(value)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid {field_name}: must be numeric")

    # convert units to single form. either kg, l, bunch, pc
    def normalize_unit(price, quantity, unit):
        # normalize quantity first
        if quantity != 1:
            price = round(price / quantity, 6)
            quantity = 1

        # conversion factors to a standard unit
        conversions = {
            "g":    (1000, "kg"),
            "oz":   (35.274, "kg"),
            "lbs":  (2.205, "kg"),

            "ml":   (1000, "l"),
            "fl.oz":(35.1951, "l"),
            "pint": (1.75975, "l")
        }

        factor, new_unit = conversions.get(unit, (1, unit))
        return price * factor, quantity, new_unit

    try:
        def normalize_ingredient_data(data):
            cleaned = {}
            
            # String fields: trim, collapse multiple spaces, convert to lowercase
            str_fields = ["name", "portion_size", "privacy", "description"]
            recipe_dict = data[0] 
            for field in str_fields:
                value = recipe_dict.get(field)
                if isinstance(value, str):
                    # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                    cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
                else:
                    cleaned[field] = value  # keep as-is if not a string
                    #return jsonify({"error": f"Expected string in {field} but recieved non string value", "submitted_data": request.get_json()}), 400
            
            # Handle ingredients (list of dicts)
            
            ingredients = recipe_dict.get("ingredients", [])
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
                cleaned["ingredients"] = []
            # Handle procedures(list of steps)
            
            steps = recipe_dict.get("steps",[])
            if isinstance(steps, list):
                normalized_steps = []
                for step in steps:
                    
                    if isinstance(step, str):

                        norm_step = re.sub(r"\s+", " ", step.strip()).lower()                        
                    else:
                       norm_step = step
                    normalized_steps.append(norm_step)
                cleaned['steps'] = normalized_steps
            else:
                cleaned['steps'] = []
            return cleaned
            
        def validate_ingredient(data):
            
            #print(data)
            recipe_dict  = data
            # --- name ---
            name = recipe_dict.get("name")
            if not name or not isinstance(name, str) or len(name) > 50:
                return f"Invalid name: must be a non-empty string ≤ 50 chars"
            
            # --- portion_size ---
            portion_size = recipe_dict.get("portion_size")
            if not portion_size or not isinstance(portion_size, str) or len(portion_size) > 50:
                return f"Invalid portion_size: must be a non-empty string ≤ 50 chars"
            
            # --- privacy ---
            privacy = recipe_dict.get("privacy")
            if not privacy or not isinstance(privacy, str) or privacy not in ('public', 'private') or len(privacy) > 10:
                return f"Invalid privacy: must be within (public, private)"
            
            # --- description ---
            description = recipe_dict.get("description")
            if not isinstance(description, str) or len(description) > 500:
                return f"Invalid description: must be a string ≤ 500 chars"

            # min 2 Ingredients validation for a recipe
            ingredients = recipe_dict.get("ingredients", [])
            if not isinstance(ingredients, list) or len(ingredients) < 2:
                return "Recipe must have at least 2 ingredients"

            # Normalize ingredients (list of dicts)
            ing_fields = ["ingredient_id", "quantity", "unit_id", "base_unit", "base_price"]
            ing_base_fields =["custom_price", "unit_supplied", "custom_quantity", "location"]
            
            for ing in ingredients:
                
                try:
                    ing_id = to_int(ing.get("ingredient_id"), "ingredient_id")
                    if not isinstance(ing_id, (int, float)) or ing_id <= 0 or ing_id >= 10**6:
                        return f"Invalid ingredient id: must be numeric > 0  and < 1000000"

                    quantity = to_float(ing.get("quantity"), "quantity")
                    if not isinstance(quantity, (int, float)) or quantity <= 0 or quantity >= 10**6:
                        return f"Invalid quantity: must be numeric > 0  and < 1000000"

                    unit_id = to_int(ing.get("unit_id"), "unit_id")
                    if not isinstance(unit_id, (int, float)) or unit_id <= 0 or unit_id >= 10**8:
                        return f"Invalid unit_id:{unit_id} must be numeric > 0  and < 100000000"
                       
                    if ing.get("base_price"):
                        base_price = to_float(ing.get("base_price"),"base_price")
                        if not isinstance(base_price, (int, float)) or base_price <= 0 or base_price >= 10**8:
                            return f"Invalid base_price: must be numeric > 0  and < 100000000"
                    
                    if ing.get("base_quantity"):
                        base_quantity = to_float(ing.get("base_quantity"),"base_quantity")
                        if not isinstance(base_quantity, (int, float)) or base_quantity <= 0 or base_quantity >= 10**6:
                            return f"Invalid base_quantity: must be numeric > 0  and < 1000000"
                    
                    # --- base_unit ---
                    if ing.get("base_unit"):
                        base_unit = ing.get("base_unit")
                        if not isinstance(base_unit, str) or base_unit not in ['kg', 'l', 'pc', 'bunch']:
                            return f"Invalid base_unit {base_unit}: must be within ['kg' 'l', 'pc', 'bunch']"    

                    # --- Location ---
                    if ing.get("location"):
                        location = ing.get("location")
                        if not isinstance(location, str) or len(location) > 50:
                            return f"Invalid location: must be a string ≤ 50 chars"

                    #print("no error found will loop again ")                
                except ValueError as e:
                    return str(e) 

                # # --- custom_quantity ---
                # custom_quantity = ing.get("custom_quantity")
                # if custom_quantity:
                #     if not isinstance(custom_quantity, (int, float)) or custom_quantity <= 0 or custom_quantity >= 10**6:
                #         return f"Invalid custom price: must be numeric > 0  and < 1000000"
            
                # # --- unit_supplied ---
                # unit_supplied = ing.get("unit_supplied")
                # if base_unit in ['kg', 'g', 'oz', 'lbs', ]:
                #     if unit_supplied not in ['kg', 'g', 'oz', 'lbs']:
                #         return f"Invalid unit supplied for ingredient : must be a in ['kg', 'g', 'oz', 'lbs']"
                
                # if base_unit in ['l', 'ml', 'pint', 'fl.oz']:
                #     if unit_supplied not in ['l', 'ml', 'pint', 'fl.oz']:
                #         return f"Invalid unit supplied for ingredient : must be a in [ 'l', 'ml', 'pint', 'fl.oz']"
                
                # if base_unit in ['pc']:
                #     if unit_supplied not in ['pc']:
                #         return f"Invalid unit supplied for ingredient : must be a in [ 'pc']"
                
                # if base_unit in ['bunch']:
                #     if unit_supplied not in ['bunch']:
                #         return f"Invalid unit supplied for ingredient : must be a in ['bunch']"

            # validate steps data
            steps = recipe_dict.get("steps")
            for step in steps:
                if not isinstance(step, (str, int, float)):
                    return "Error in normalizing steps: step must be str, int, or float."
                if isinstance(step, str) and len(step) > 100:
                    return "Error in normalizing steps: string step longer than 100 characters."

            # return none if validation doesnt throw any error
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
        steps = data['steps']
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
            print(f"ingredients with id {ing['ingredient_id']} and unit id match with units table")
            # check if json has any one of -- base_unit, base_price or base_quantity then validate if new base new unit provided is compatible with old one.
            # eg: old base unit in kg. so new base unit has to be in [kg, g, oz, lbs] as finally it will be storted as kg by applying conversion later while inserting
            if ing.get('base_unit'):
                
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
                    return jsonify({'error': f"Ingredient details for id {ing['ingredient_id']} not found in db"}), 404

                groups = {
                    "kg": ["kg", "g", "oz", "lbs"],
                    "g": ["kg", "g", "oz", "lbs"],
                    "oz": ["kg", "g", "oz", "lbs"],
                    "lbs": ["kg", "g", "oz", "lbs"],
                    "l": ["l", "ml", "fl.oz", "pint"],
                    "ml": ["l", "ml", "fl.oz", "pint"],
                    "fl.oz": ["l", "ml", "fl.oz", "pint"],
                    "pint": ["l", "ml", "fl.oz", "pint"],
                    "pc": ["pc"],
                    "bunch": ["bunch"]
                }

                if ing['base_unit'] not in groups.get(ing_data['base_unit'], []):
                    return jsonify({'error': f"base unit of ingredient {ing['ingredient_id']} not matched with stored data"}), 400

                
                # base_unit = ing_data['base_unit']
                # price = ing_data['price']
                # f_base_price = ing['base_price']    
                # if round(float(price),6) != round(float(ing['base_price']),6):
                #     cursor.close()
                #     conn.close()
                #     return jsonify({'error': f"base price : price = {round(price,6)} ing['base_price'] = {round(f_base_price,6)} of ingredient {ing['ingredient_id']} not matched with stored data"}), 400    

        # validate steps for recipe_procedures
        
        # return jsonify({'message': "Every thing accepted and ready to insert recipe", 'submitted_data': data}), 200


        # ---------------- Data checked and ready to be inserted. About to actually insert data in db ---------------------------
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

            # Update user_prices if base_unit/base_price/base_quantity is provided and different
            if ing.get('base_unit'):
                base_price, base_quantity, base_unit = normalize_unit(ing['base_price'],ing['base_quantity'],ing['base_unit'])
            
                cursor.callproc('update_insert_user_price', (
                    s_user_id, 
                    ing['ingredient_id'], 
                    base_price, 
                    base_quantity,
                    base_unit, 
                    ing['location'] 
                ))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'{name} : Recipe created successfully', 'recipe_id': recipe_id}), 201

    except Exception as e:
        print("Error while trying to create recipe:", e)
        return jsonify([])
        
