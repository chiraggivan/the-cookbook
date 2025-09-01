from flask import Flask, jsonify, request, g, render_template
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from bcrypt import hashpw, checkpw, gensalt
import mysql.connector
from datetime import timedelta
from mysql.connector import Error
import re

from config import Config
from db import get_db_connection
from routes.auth import auth_bp

from routes.recipes import recipes_html_bp,  recipes_api_bp

app = Flask(__name__)
app.config.from_object(Config)
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(recipes_html_bp, url_prefix="/recipes")
app.register_blueprint(recipes_api_bp, url_prefix="/recipes")

jwt = JWTManager(app)

# Get all the recipe of a certain user
@app.route('/<int:user_id>/recipes', methods=['GET'])
@jwt_required()
def get_user_recipes(user_id):

    s_user_id = get_jwt_identity()
    #print("logged in user id : ",s_user_id)
    if not s_user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    
    # if logged in user_id SAME as searched user
    if s_user_id == user_id:            
        return get_my_recipes() 

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # verify user exists
        cursor.execute("""
            SELECT username FROM users WHERE user_id = %s 
        """,(user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'No such user exists.'}), 400        

        # Get all the public recipe of user
        cursor.execute("""
            SELECT r.recipe_id, r.name, r.user_id, r.portion_size, r.description, u.username
            FROM recipes r 
            JOIN users u ON r.user_id = u.user_id
            WHERE r.is_active = TRUE
            AND r.user_id = %s
            AND r.privacy = 'public' 
        """,(user_id,))
            
        recipes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(recipes)

    except Error as err:
        return jsonify({'error': str(err)}), 500


# Delete recipe - checked
@app.route('/my_recipes/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def delete_recipe(recipe_id):

    s_user_id = get_jwt_identity()
    #print("logged in user id : ",s_user_id)
    try:
        # get db connection
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

        # Validate if rightful owner and is_active TRUE exists
        cursor.execute("""
            SELECT recipe_id, user_id, is_active 
            FROM recipes 
            WHERE recipe_id = %s AND user_id = %s AND is_active = 1
            """, (recipe_id, s_user_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Not a rightful Owner or recipe already deleted'}), 404

        # Call the procedure to delete the recipe
        cursor.callproc('delete_recipe',( s_user_id,recipe_id))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Recipe deleted successfully"}), 201

    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get recipe ingredient
@app.route('/recipe/<int:recipe_id>', methods=['GET'])
@jwt_required()
def get_recipe_details(recipe_id):

    s_user_id = get_jwt_identity()
    #print("logged in user id : ",s_user_id)
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        #Get recipe info
        cursor.execute("""
            SELECT r.recipe_id, r.name, r.portion_size, r.description, r.privacy, r.created_at, r.user_id, u.username
            FROM recipes r JOIN users u ON r.user_id = u.user_id 
            WHERE r.recipe_id = %s 
            AND r.is_active = 1
            AND (r.user_id = %s
            OR r.privacy = 'public')
            """,(recipe_id, s_user_id))
        recipe = cursor.fetchone()
        if not recipe:
            cursor.close()
            conn.close()
            return jsonify({'error':'Recipe not found.'}), 404

        # Get recipe ingredients and its price
        cursor.execute("""
            SELECT 
                i.ingredient_id,
                i.name,
                ri.recipe_ingredient_id,
                ri.quantity,
                u.unit_id,
                u.unit_name,
                ri.quantity * COALESCE(up.custom_price, i.default_price) * u.conversion_factor AS price,
                COALESCE(up.custom_price, i.default_price) AS cost,
                COALESCE(up.base_unit, i.base_unit) AS unit
            FROM recipe_ingredients ri 
            JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
            JOIN units u ON ri.unit_id = u.unit_id
            LEFT JOIN user_prices up ON up.user_id = %s 
                AND up.ingredient_id = i.ingredient_id 
                AND up.is_active = TRUE
            WHERE ri.recipe_id = %s
            AND ri.is_active = TRUE
            """,(s_user_id, recipe_id))
        ingredients = cursor.fetchall()

        # Get recipe steps
        cursor.execute("""
            SELECT step_order, step_text, estimated_time
            FROM recipe_procedures
            WHERE recipe_id = %s
            AND is_active = 1
            ORDER BY step_order
            """,(recipe_id,))
        steps = cursor.fetchall()

        cursor.close()
        conn.close()
        return jsonify({
            'recipe': recipe,
            'ingredients': ingredients,
            'steps': steps
            })
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Create new recipe
@app.route('/recipes', methods=['POST'])
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

# Update recipe (PATCH)
@app.route('/recipes/<int:recipe_id>', methods=['PATCH'])
@jwt_required()
def update_recipe(recipe_id):

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
        def normalize_recipe_and_ingredient_data(data):
            cleaned = {}

            # String fields: trim, collapse multiple spaces, convert to lowercase
            recipe_fields = ["name", "portion_size", "privacy", "description"]
            for field in recipe_fields:
                value = data.get(field)

                if not value or value is None :
                    continue
                elif isinstance(value, str):
                    # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                    val = re.sub(r"\s+", " ", value.strip()).lower()
                    if val == "":
                        continue
                    else:
                        cleaned[field] = val
                else:
                    cleaned[field] = value  # keep as-is if not a string
                    #return jsonify({"error": f"Expected string in {field} but recieved non string value", "submitted_data": request.get_json()}), 400
            
            # check fields of update ingredients and normalize required fields only
            update_ingredient_fields =["recipe_ingredient_id", "ingredient_id", "quantity", "unit_id", "base_price", "base_quantity", "base_unit", "place"]
            update_ingredients = data.get('update_ingredients')
            if update_ingredients is None:
                cleaned["update_ingredients"] = []
            elif isinstance(update_ingredients, list):
                cleaned_update_ingredients = []
                for up_ing in update_ingredients:
                    cleaned_up_ing = {}
                    for field in update_ingredient_fields:
                        value = up_ing.get(field)

                        if not value or value is None:
                            continue
                        elif isinstance(value, str):
                            # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                            val = re.sub(r"\s+", " ", value.strip()).lower()
                            if val == "":
                                continue
                            else:
                                cleaned_up_ing[field] = val                
                        else:
                            cleaned_up_ing[field] = value
                            #return jsonify({"error": f"Expected string, integer or float in {field} but recieved non string value", "submitted_data": request.get_json()}), 400
                    cleaned_update_ingredients.append(cleaned_up_ing)
                cleaned["update_ingredients"] = cleaned_update_ingredients

            # check fields of add ingredients and normalize required fields only
            add_ingredient_fields =["ingredient_id", "quantity", "unit_id", "base_price", "base_quantity", "base_unit"]
            add_ingredients = data.get('add_ingredients')
            if add_ingredients is None:     
                cleaned["add_ingredients"] = []
            elif isinstance(add_ingredients, list):
                cleaned_add_ingredients = []
                for add_ing in add_ingredients:
                    cleaned_add_ing = {}
                    for field in add_ingredient_fields:
                        value = add_ing.get(field)
                        if value is None:
                            continue
                        elif isinstance(value, str):
                            # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                            cleaned_add_ing[field] = re.sub(r"\s+", " ", value.strip()).lower()                 
                        else:
                            cleaned_add_ing[field] = value
                    cleaned_add_ingredients.append(cleaned_add_ing)

                    value = add_ing.get('place')
                    if isinstance(value,str):
                        cleaned_add_ing['place'] = re.sub(r"\s+", " ", value.strip()).lower()  
                    else:
                        cleaned_add_ing['place'] = value                                           

                cleaned["add_ingredients"] = cleaned_add_ingredients

            # check fields of remove ingredients and normalize required fields only
            remove_ingredient_fields =["recipe_ingredient_id"]
            remove_ingredients = data.get('remove_ingredients')
            if remove_ingredients is None:
                cleaned["remove_ingredients"] = []

            elif isinstance(remove_ingredients, list):
                cleaned_remove_ingredients = []

                for remove_ing in remove_ingredients:
                    cleaned_remove_ing = {}

                    for field in remove_ingredient_fields:
                        value = remove_ing.get(field)
                        if value is None:
                            continue
                        elif isinstance(value, str):
                            # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                            cleaned_remove_ing[field] = re.sub(r"\s+", " ", value.strip()).lower()                 
                        else:
                            cleaned_remove_ing[field] = value                
                    cleaned_remove_ingredients.append(cleaned_remove_ing)            
                cleaned["remove_ingredients"] = cleaned_remove_ingredients
            return cleaned, None
        
        def validate_recipe_and_ingredient_data(data):
            
            name = data.get("name")
            portion_size = data.get("portion_size")
            privacy = data.get("privacy")
            description = data.get("description")

            # --- name ---
            if name is not None:
                if not isinstance(name, str) or len(name) < 1 or len(name) > 50:
                    return f"Invalid name: {name} must be a non-empty string ≤ 50 chars"
            
            # --- portion_size ---
            if portion_size is not None:
                if not isinstance(portion_size, str) or len (portion_size) < 1 or len(portion_size) > 20:
                    return f"Invalid portion_size: must be a non-empty string ≤ 20 chars"
            
            # --- privacy ---
            if privacy is not None:
                if not isinstance(privacy, str) or privacy not in ('public', 'private'):
                    return f"Invalid privacy: must be within (public, private)"
            
            # --- description ---
            if description is not None:
                if not isinstance(description, str) or len(description) > 500:
                    return f"Invalid description: must be a string ≤ 500 chars"

            # --- Ingredients  with field details
            update_ingredients = data.get("update_ingredients",[])
            add_ingredients = data.get("add_ingredients",[])
            remove_ingredients = data.get("remove_ingredients",[])

            
            # --- for updating ingredients - fields validation
            ingredient_groups = {
                "update_ingredients": update_ingredients,
                "add_ingredients": add_ingredients
            }
            
            for group_name, ingredients in ingredient_groups.items():
                if ingredients:  # only check if list is not empty
                    for ing in ingredients:
                        if group_name == 'add_ingredients':
                            ingredient_id = ing.get('ingredient_id')
                            quantity = ing.get('quantity')
                            unit_id = ing.get('unit_id')
                            if ingredient_id is None or quantity is None or unit_id is None:
                                return f"Need ingredient_id, quantity and unit id to add new igredient in recipe." 
                        if group_name == 'update_ingredients':
                            recipe_ingredient_id = ing.get("recipe_ingredient_id")
                            if recipe_ingredient_id is None or not isinstance(recipe_ingredient_id,int):
                                return f"Invalid recipe ingredient id. Must be int > 0"            

                        ingredient_id = ing.get("ingredient_id")
                        if ingredient_id is not None:
                            if ingredient_id =="" or not isinstance(ingredient_id,int) or ingredient_id <= 0:
                                return f"Invalid ingredient id '{ingredient_id}': must be int > 0"

                        quantity = ing.get("quantity")
                        if quantity is not None:
                            if not isinstance(quantity, (int,float)) or quantity <= 0:
                                return f"Invalid quantity: must be numeric > 0"

                        unit_id = ing.get("unit_id")
                        if unit_id is not None:
                            if not isinstance(unit_id, (int)) or unit_id <= 0:
                                return f"Invalid unit id: must be int > 0"

                        # if any data provided for tsp, tbsp or cup
                        if any(ing.get(key) for key in ["base_price", "base_unit", "base_quantity"]):
                            # Check that all three are provided
                            if not all(ing.get(key) is not None for key in ["base_price", "base_unit", "base_quantity"]):
                                return f"'base price', 'base unit' and 'base quantity' must all be provided together"

                            custom_price = ing.get("base_price")
                            base_unit = ing.get("base_unit")
                            base_quantity = ing.get("base_quantity")
                            place = ing.get("place")

                            if custom_price is not None:
                                if not isinstance(custom_price, (int,float)) or custom_price <= 0:
                                    return f"Invalid custom_price: must be numeric > 0"
                            
                            if base_unit is not None:
                                if not isinstance(base_unit, str) or base_unit not in ['kg', 'g', 'oz', 'lbs','l', 'ml', 'pint', 'fl.oz', 'pc', 'bunch']:
                                    return f"Invalid base_unit: must be one of these: ['kg', 'g', 'oz', 'lbs','l', 'ml', 'pint', 'fl.oz', 'pc', 'bunch']"

                            if base_quantity is not None:
                                if not isinstance(base_quantity, (int,float)) or base_quantity <= 0:
                                    return f"Invalid base_quantity: must be numeric > 0"
                            
                            if place:
                                if not isinstance(place, str) or len(place) > 25:
                                    return f"Invalid place: must be a string ≤ 25 chars"

            for ing in data.get('remove_ingredients',[]):
                value = ing.get('recipe_ingredient_id')
                if value is None:
                    continue

                if not isinstance(value,int) or value <=0:
                    return f"Invalid recipe ingredient id: must be an int > 0"
                
            return None

        data, error = normalize_recipe_and_ingredient_data(request.get_json())
        if error:
            return jsonify({"error": error}), 400  
        error = validate_recipe_and_ingredient_data(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400  
        # -------------------------- normailisation and validation done -----------------------
        #Check if any data provided
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # get db connection
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

        # Check if recipe exists and belongs to user
        cursor.execute("""
            SELECT name, portion_size FROM recipes 
            WHERE recipe_id = %s AND user_id = %s AND is_active = TRUE
        """, (recipe_id, s_user_id))
        recipe = cursor.fetchone()
        if not recipe:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Recipe not found or not authorized'}), 404

        # Initialize update fields
        update_fields = []
        update_values = []
        current_name = recipe['name']
        current_portion_size = recipe['portion_size']

        # Handle recipe fields update
        if 'name' in data and data['name'] and isinstance(data['name'], str):
            print("name :", data['name'])  #  ----------------------PRINT--------------------------------------
            update_fields.append("name = %s")
            update_values.append(data['name'])
            current_name = data['name']
        if 'portion_size' in data and data['portion_size'] and isinstance(data['portion_size'], str):
            print("portion_size :", data['portion_size']) #  ----------------------PRINT--------------------------------------
            update_fields.append("portion_size = %s")
            update_values.append(data['portion_size'])
            current_portion_size = data['portion_size']
        if 'privacy' in data and data['privacy'] in ('public', 'private'):
            print("privacy :", data['privacy']) #  ----------------------PRINT--------------------------------------
            update_fields.append("privacy = %s")
            update_values.append(data['privacy'])
        if 'description' in data:
            print("description :", data['description']) #  ----------------------PRINT--------------------------------------
            update_fields.append("description = %s")
            update_values.append(data['description'] if data['description'] is not None else None)

        # Check for duplicate name and portion_size
        if 'name' in data or 'portion_size' in data:
            cursor.execute("""
                SELECT recipe_id FROM recipes 
                WHERE name = %s AND portion_size = %s AND user_id = %s AND is_active = TRUE AND recipe_id != %s
            """, (current_name, current_portion_size, s_user_id, recipe_id))
            if cursor.fetchone(): 
                cursor.close()
                conn.close()
                return jsonify({
                    'error': 'Recipe with same name and portion size already exists',
                    'submitted_data': data
                }), 409
        # ---------------------------------------------------------------------------------
        # add_ingredients and update_ingredients are being check if valid with db
        for action, ingredients in [
            ('add', data.get('add_ingredients', [])),
            ('update', data.get('update_ingredients', []))
        ]:
            for ing in ingredients:
                if action == 'update':
                    # check is recipe ingredient id exists in recipe ingredients table ONLY for update
                    cursor.execute("""
                        SELECT ingredient_id, quantity, unit_id 
                        FROM recipe_ingredients
                        WHERE recipe_ingredient_id = %s and recipe_id = %s and is_active = TRUE
                    """,(ing.get('recipe_ingredient_id'),recipe_id))   
                    row = cursor.fetchone()
                    if not row:
                        cursor.close()
                        conn.close()
                        return jsonify({'error': f"Can't find recipe ingredient id {ing.get('recipe_ingredient_id')} with action as {action}", "submitted_data":data}), 404  
                    
                    old_ing_id = row['ingredient_id']
                    old_quantity = row['quantity']
                    old_unit_id = row['unit_id']
                    print("----------------") #  ----------------------PRINT--------------------------------------
                    print("recipe_ingredient_id : ", ing.get('recipe_ingredient_id')) #  ----------------------PRINT--------------------------------------
                    print("old ing id :", old_ing_id) #  ----------------------PRINT--------------------------------------
                    print("old quantity:", old_quantity) #  ----------------------PRINT--------------------------------------
                    print("old unit id :", old_unit_id) #  ----------------------PRINT--------------------------------------
                    print("----------------") #  ----------------------PRINT--------------------------------------
                # check if new ingredient id exists in ingredients table
                if 'ingredient_id' in ing:
                    cursor.execute("""SELECT base_unit FROM ingredients 
                        WHERE ingredient_id = %s AND is_active = TRUE AND (approval_status = "approved" OR submitted_by = %s)
                    """, (ing['ingredient_id'],s_user_id))
                    row = cursor.fetchone()
                    if not row:
                        cursor.close()
                        conn.close()
                        return jsonify({'error': f"Can't find ingredient id {ing.get('ingredient_id')}","submitted_data":data}), 404
                    main_base_unit = row['base_unit']

                # check if ingredient id and unit id exists in units table
                if ing.get('ingredient_id') is None:
                    ing['ingredient_id'] = old_ing_id
                if ing.get('unit_id') is None:
                    ing['unit_id'] = old_unit_id
                if ing.get('quantity') is None:
                    ing['quantity'] = old_quantity
                
                cursor.execute("""SELECT 1 FROM units WHERE ingredient_id = %s AND unit_id =%s""",(ing['ingredient_id'],ing['unit_id']))
                if not cursor.fetchone():
                    cursor.close()
                    conn.close()
                    return jsonify({'error': f"ingredient id {ing['ingredient_id']} and unit id {ing['unit_id']} not matched in units table.", "submitted_data":data}), 404

                # check if the base_unit provided is acceptable eg- for base_unit in ingredients table in 'kg', 
                #       acceptable base unit is ['kg','g','oz','lbs'] and similar for 'l' its ['l','ml','fl.oz','pint']
                #       for 'pc' and 'bunch' base unit must be same.
                if ing.get('base_unit') is not None:
                    cursor.execute("""SELECT base_unit FROM ingredients WHERE ingredient_id = %s""",(ing['ingredient_id'],))
                    check_base = cursor.fetchone()['base_unit']
                    if check_base == 'kg':
                        if ing['base_unit'] not in ['kg','g','oz','lbs']:
                            return jsonify({'error': f"new base_unit Can't be {ing['base_unit']}. should be one of [kg, g, oz, lbs]", "submitted_data":data}), 404
                    if check_base == 'l':
                        if ing['base_unit'] not in ['l','ml','fl.oz','pint']:
                            return jsonify({'error': f"new base_unit Can't be {ing['base_unit']}. should be one of [l, ml, fl.oz, pint]", "submitted_data":data}), 404
                    if check_base == 'pc':
                        if ing['base_unit'] not in ['pc']:
                            return jsonify({'error': f"new base_unit Can't be {ing['base_unit']}. should be pc", "submitted_data":data}), 404
                    if check_base == 'bunch':
                        if ing['base_unit'] not in ['bunch']:
                            return jsonify({'error': f"new base_unit Can't be {ing['base_unit']}. should be bunch", "submitted_data":data}), 404
                
        # Remove ingredients
        for ing in data.get('remove_ingredients', []):
            value = ing.get('recipe_ingredient_id')
            if value is None:
                continue
            cursor.execute("""SELECT 1 FROM recipe_ingredients 
                WHERE recipe_id = %s AND recipe_ingredient_id = %s AND is_active = TRUE
            """,(recipe_id, value))
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": f"Invalid recipe ingredient id {value} : this does not below to the recipe id {recipe_id}"}), 400 
                                     
        #return jsonify({"msg": "every ingredient check and data ready to to be inserted for update", "submitted_data":data}), 200
        # Update recipe table if any fields are provided
        print("update_fields :", update_fields) #  ----------------------PRINT--------------------------------------
        if update_fields:
            update_values.append(recipe_id)
            update_values.append(s_user_id)
            print("update_values :", update_values) #  ----------------------PRINT--------------------------------------
            cursor.execute(f"""
                UPDATE recipes 
                SET {', '.join(update_fields)} 
                WHERE recipe_id = %s AND user_id = %s AND is_active = TRUE
            """, update_values)
            cursor.execute("""
                SELECT 1 FROM recipes
                WHERE recipe_id = %s AND user_id = %s
            """,(update_values[1], update_values[2]))
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Recipe not found or not authorized'}), 404
                
        # Remove ingredients if any fields are provided
        for ing in data.get('remove_ingredients', []):
            cursor.execute("""
                UPDATE recipe_ingredients 
                SET is_active = FALSE, end_date = CURRENT_TIMESTAMP 
                WHERE recipe_id = %s AND recipe_ingredient_id = %s AND is_active = TRUE
            """, (recipe_id, ing['recipe_ingredient_id']))
        
        # update/add ingredients if any fields are provided
        for action, ingredients in [
            ('add', data.get('add_ingredients', [])),
            ('update', data.get('update_ingredients', []))
        ]:
            for ing in ingredients:

                if action == 'add':
                    #Check if ingredient exists in recipe_ingredients and is inactive
                    #cursor = conn.cursor(MySQLdb.cursors.DictCursor)
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute("""
                        SELECT recipe_ingredient_id FROM recipe_ingredients 
                        WHERE recipe_id = %s AND ingredient_id = %s AND is_active = 0
                    """, (recipe_id, ing['ingredient_id']))
                    row = cursor.fetchone()
                    if row:
                        ri_id = row["recipe_ingredient_id"]
                        cursor.execute("""
                            UPDATE recipe_ingredients 
                            SET quantity = %s, unit_id = %s, is_active = TRUE, end_date = NULL
                            WHERE recipe_ingredient_id = %s
                        """, (ing['quantity'], ing['unit_id'], ri_id))
                    else:
                        cursor.execute("""
                            INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id, is_active)
                            VALUES (%s, %s, %s, %s, TRUE)
                        """, (recipe_id, ing['ingredient_id'], ing['quantity'], ing['unit_id']))
                else:  # update
                    cursor.execute("""
                        UPDATE recipe_ingredients 
                        SET ingredient_id = %s, quantity = %s, unit_id = %s
                        WHERE recipe_ingredient_id = %s AND is_active = TRUE
                    """, (ing['ingredient_id'], ing['quantity'], ing['unit_id'], ing['recipe_ingredient_id']))
                    
                # if base unit doesnt match with original base unit then convert custom price and unit. eg:  if main unit is kg and
                # supplied base_unit in g, oz, or lbs then convert it into kg. similar for litre for ml, fl.oz and pint
                # but leave pc and bunch as it is.
                if ing.get('base_price'):
                    cursor.execute("""
                        SELECT default_price, base_unit FROM ingredients 
                        WHERE ingredient_id = %s AND (approval_status = 'approved' OR submitted_by = %s)
                    """,(ing['ingredient_id'],s_user_id))
                    row = cursor.fetchone()
                    default_price = row.get('default_price')
                    actual_base_unit = row.get('base_unit')

                    cursor.execute("""
                        SELECT custom_price FROM user_prices WHERE ingredient_id = %s  AND user_id = %s AND is_active = 1
                    """,(ing['ingredient_id'], s_user_id))
                    row = cursor.fetchone()
                    if row:
                        default_price = row['custom_price']

                    if ing['base_quantity'] != 1 or ing['base_unit'] != actual_base_unit or ing['base_price'] != default_price: 

                        if ing['base_quantity'] != 1: 
                            base_price = ing['base_price']/ing['base_quantity']
                            base_quantity = 1
                        else:
                            base_price = ing['base_price']
                            base_quantity = ing['base_quantity']
                        
                        if ing['base_unit'] == 'kg':
                            base_unit = 'kg'
                        elif ing['base_unit'] == 'g':
                            base_price = base_price*1000
                            base_unit = 'kg'
                        elif ing['base_unit'] == 'oz':
                            base_price = base_price*35.274
                            base_unit = 'kg'
                        elif ing['base_unit'] == 'lbs':
                            base_price = base_price*2.205
                            base_unit = 'kg'

                        elif ing['base_unit'] == 'l':
                            base_unit = 'l'
                        elif ing['base_unit'] == 'ml':
                            base_price = base_price*1000
                            base_unit = 'l'
                        elif ing['base_unit'] == 'fl.oz':
                            base_price = base_price*35.1951
                            base_unit = 'l'
                        elif ing['base_unit'] == 'pint':
                            base_price = base_price*1.75975
                            base_unit = 'l'
                        elif ing['base_unit'] == 'pc':
                            base_unit = 'pc'
                        elif ing['base_unit'] == 'bunch':
                            base_unit = 'bunch'   

                        if ing.get('place') is None:
                            place = ""
                        else:
                            place = ing['place']

                        # Update user_prices if custom_price is provided                    
                        cursor.callproc('update_insert_user_price', (
                            s_user_id,
                            ing['ingredient_id'],
                            base_price,
                            base_quantity,
                            base_unit,
                            place
                        ))

        

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Recipe updated successfully'}), 200

    except Error as err:
        if conn and conn.is_connected():
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({'error': str(err), 'submitted_data': data}), 500

# Get dishes prepared by user
@app.route('/dishes', methods=['GET'])
@jwt_required()
def get_dishes():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
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

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT dish_id FROM dishes 
            WHERE user_id = %s AND is_active = TRUE
        """, (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No dishes found for the user.'}), 404

        # Get all the dishes for the users
        cursor.execute("""
            SELECT d.dish_id, r.recipe_id, r.name, r.portion_size, d.preparation_date, d.total_cost
            FROM dishes d JOIN recipes r ON d.recipe_id = r.recipe_id
            WHERE d.user_id = %s AND d.is_active = 1
        """,(s_user_id,))
        recipes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(recipes)
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get dish details for selected dish
@app.route('/dishes/<int:dish_id>', methods=['GET'])
@jwt_required()
def get_dish_details(dish_id):

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
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

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT dish_id FROM dishes 
            WHERE user_id = %s AND dish_id = %s AND is_active = TRUE
        """, (s_user_id, dish_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No dishes found for the user.'}), 404

        # Get the details of the dish for the user
        cursor.execute("""
            SELECT i.name, di.quantity, di.unit_name, di.total_ingredient_cost as cost, CONCAT(FORMAT(di.base_price, 2),'/',di.base_unit) as at
            FROM dish_ingredients di 
            JOIN ingredients i ON di.ingredient_id = i.ingredient_id
            JOIN dishes d ON di.dish_id = d.dish_id
            JOIN users u ON d.user_id = u.user_id
            WHERE di.dish_id = %s AND u.user_id = %s
        """,(dish_id, s_user_id))
        dish_details = cursor.fetchall()

        cursor.execute("""
            SELECT d.dish_id, r.recipe_id, r.name, r.portion_size, d.preparation_date, d.total_cost
            FROM dishes d JOIN recipes r ON d.recipe_id = r.recipe_id
            WHERE d.user_id = %s AND dish_id = %s AND d.is_active = 1
        """,(s_user_id,dish_id))
        dish = cursor.fetchone()

        cursor.close()
        conn.close()
        return jsonify({
            "dish": dish, 
            "dish_details": dish_details
        })
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Delete dishes prepared by user
@app.route('/dishes/<int:dish_id>', methods=['DELETE'])
@jwt_required()
def delete_dishes(dish_id):

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
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

        # validate if dishes exists for the user
        cursor.execute("""
            SELECT dish_id FROM dishes 
            WHERE user_id = %s AND dish_id = %s AND is_active = TRUE
        """, (s_user_id, dish_id))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'No particular dish found for the user.'}), 404

        # Delete dish for the user
        cursor.execute("""
            UPDATE dishes
            SET is_active = 0, end_date = CURRENT_TIMESTAMP
            WHERE dish_id = %s
        """,(dish_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message":"Dish deleted successfully"}), 201
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Save recipe as dish
@app.route('/dishes/<int:recipe_id>', methods=['POST'])
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

# add new ingredient by admin
@app.route('/ingredients', methods=['POST'])
@jwt_required()
def create_ingredients():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try:
        def normalize_ingredient_data(data):
            cleaned = {}

            # String fields: trim, collapse multiple spaces, convert to lowercase
            str_fields = ["name", "unit", "weight_unit", "weighing_instrument"]
            for field in str_fields:
                value = data.get(field)
                if isinstance(value, str):
                    # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                    cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
                else:
                    cleaned[field] = value  # keep as-is if not a string

            # Numeric fields: just copy
            num_fields = ["price", "quantity", "weight_quantity"]
            for field in num_fields:
                cleaned[field] = data.get(field)

            return cleaned

        def validate_ingredient(data):
            # --- name ---
            name = data.get("name")
            if not name or not isinstance(name, str) or len(name) > 50:
                return f"Invalid name: must be a non-empty string ≤ 50 chars"
            
            # --- quantity ---
            quantity = data.get("quantity")
            if quantity is None or not isinstance(quantity, (int, float)):
                return f"Invalid quantity: must be numeric"
            if quantity <= 0 or quantity >= 10**6: 
                return f"Invalid quantity: {quantity} exceeds limit (max 999999.99)"
            
            # --- unit ---
            allowed_units = ['kg', 'g', 'l', 'ml', 'pint', 'pc', 'bunch', 'oz', 'fl.oz', 'lbs']
            unit = data.get("unit")
            if unit not in allowed_units:
                return f"Invalid unit: must be one of {allowed_units}"
            
            # --- price ---
            price = data.get("price")
            if price is None or not isinstance(price, (int, float)):
                return f"Invalid price: must be numeric"
            if price <= 0 or price >= 10**6:  
                return f"Invalid price: {price} exceeds limit (max 999999.99)"

            return None 

        data = normalize_ingredient_data(request.get_json())
        #data = request.get_json()

        error = validate_ingredient(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400            
                
        name = data['name']
        price = data['price']
        unit = data['unit']
        quantity = data['quantity']
        weight_quantity = 0
        weight_unit =''
        weighing_instrument = ''

        # if any data provided for tsp, tbsp or cup
        if any(data.get(key) for key in ["weight_quantity", "weight_unit", "weighing_instrument"]):
            # Check that all three are provided
            if not all(data.get(key) for key in ["weight_quantity", "weight_unit", "weighing_instrument"]):
                return jsonify({'error': 'weight_quantity, weight_unit, and weighing_instrument must all be provided together',
                    'submitted_data': data
                    }), 400

            weight_quantity = data.get("weight_quantity") 
            if weight_quantity is not None:
                weight_quantity = float(weight_quantity)
            weight_unit = data.get("weight_unit")
            weighing_instrument = data.get("weighing_instrument")

            if unit not in ['kg','g', 'oz', 'lbs'] and weight_unit:
                return jsonify({'error': 'weight unit only when base unit is (kg, g, oz, lbs)',
                    'submitted_data': data
                    }), 400

            if weight_unit:
                if weight_unit not in ['kg','g', 'oz', 'lbs']:
                  return jsonify({'error': 'weight unit only in (kg, g, oz, lbs)',
                    'submitted_data': data
                    }), 400  

            # Validate types and values
            if not isinstance(weight_quantity, (int, float)) or weight_quantity <= 0 or weight_quantity > 10**6:
                return jsonify({'error': 'weight_quantity must be an integer or float and more than 0 and less than 99999.99999',
                    'submitted_data': data}), 400

            valid_instruments = {"cup", "tbsp", "tsp"}
            if not isinstance(weighing_instrument, str) or weighing_instrument not in valid_instruments:
                return jsonify({'error': f'weighing_instrument must be one of {valid_instruments}',
                    'submitted_data': data}), 400
        
        #connec to db
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate validate is user available and approval_status accordingly
        cursor.execute("SELECT role FROM users WHERE user_id = %s", (s_user_id,))
        role = cursor.fetchone()
        if not role:
            cursor.close()
            conn.close()
            return jsonify({'error': 'No such user found'}), 404

        role = role['role']
        if role =='admin':
            approval_status = 'approved'
        elif role == 'user':
            approval_status = 'pending'
        else:
            cursor.close()
            conn.close()
            return jsonify({'error': f'Invalid role: {role}'}), 400
        
        # check if ingredient name already exists
        cursor.execute("""
            SELECT name
            FROM ingredients
            WHERE name = %s
        """,(name,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'{name} Ingredient already exist. Please use another name.',
                'submitted_data': data}), 404
        
        # convert data for unit in 1 kg
        if unit in ['kg','g', 'oz', 'lbs']:

            if unit == 'g':
                new_quantity = quantity/1000
                new_unit = 'kg'
            elif unit == 'oz':
                new_quantity = quantity/35.274
                new_unit = 'kg'
            elif unit == 'lbs':
                new_quantity = quantity/2.205
                new_unit = 'kg'
            else:
                new_quantity = quantity
                new_unit = 'kg'

            if new_quantity != 1 :
                new_price = price/new_quantity
                new_quantity = 1
            else:
                new_price = price

            #return jsonify({'message': 'user checked, role found, ingredient not present in db. About to insert in table','submitted_data': data}), 400
            # Inserting ingredient data in db
            cursor.execute("""
                INSERT INTO ingredients(name, base_unit, default_price, is_active, submitted_by, approval_status, approval_date) 
                VALUES( %s, %s, %s, 1, %s, %s, CURRENT_TIMESTAMP)
            """,(name, new_unit, new_price, s_user_id, approval_status))
            
            ingredient_id = cursor.lastrowid
            #return jsonify({'message':f'About to call insert_units_depending_on_base_unit({ingredient_id}, {weight_quantity}, {weight_unit}, {weighing_instrument}, {s_user_id})', 'submitted_data': data}), 200
            cursor.callproc('insert_units_depending_on_base_unit',(ingredient_id, weight_quantity, weight_unit, weighing_instrument, s_user_id))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'message':f'{name} added successfully as ingredient.'}), 200

        elif unit in ['l','ml', 'pint', 'fl.oz']:
            # covert data for unit in 1 litre
            if unit == 'ml':
                new_quantity = quantity/1000
                new_unit = 'l'
            elif unit == 'pint':
                new_quantity = quantity*0.5683
                new_unit = 'l'
            elif unit == 'fl.oz':
                new_quantity = quantity*0.028413
                new_unit = 'l'
            else:
                new_quantity = quantity
                new_unit = 'l'

            if new_quantity != 1 :
                new_price = price/new_quantity
                new_quantity = 1
            else:
                new_price = price 
            
            #return jsonify({'message': f'new quantity is {new_quantity} new price is {new_price} and new unit is {new_unit} ','submitted_data': data}), 400
            # Inserting ingredient data in db
            cursor.execute("""
                INSERT INTO ingredients(name, base_unit, default_price, is_active, submitted_by, approval_status, approval_date) 
                VALUES( %s, %s, %s, 1, %s, %s, CURRENT_TIMESTAMP)
                """,(name, new_unit, new_price, s_user_id, approval_status))
            ingredient_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (%s, 'l', 1.000000, CURRENT_TIMESTAMP)""",(ingredient_id,))
            cursor.execute("""
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (%s, 'ml', 0.001000, CURRENT_TIMESTAMP)""",(ingredient_id,))
            cursor.execute("""
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (%s, 'tsp', 0.005000, CURRENT_TIMESTAMP)""",(ingredient_id,))
            cursor.execute("""
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (%s, 'tbsp', 0.015000, CURRENT_TIMESTAMP)""",(ingredient_id,))
            cursor.execute("""
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (%s, 'cup', 0.240000, CURRENT_TIMESTAMP)""",(ingredient_id,))

            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'message':f'{name} added successfully as ingredient.'}), 200

        elif unit in ['pc','bunch']:
            if quantity != 1 :
                new_price = price/quantity
                new_quantity = 1
            else:
                new_quantity = quantity
                new_price = price 
            
            #return jsonify({'message': f'{name}: new quantity is {new_quantity} new price is {new_price} and unit is {unit} with approval status : {approval_status}','submitted_data': data}), 400
            cursor.execute("""
                INSERT INTO ingredients(name, base_unit, default_price, is_active, submitted_by, approval_status, approval_date) 
                VALUES( %s, %s, %s, 1, %s, %s, CURRENT_TIMESTAMP)
                """,(name, unit, new_price, s_user_id, approval_status))
            ingredient_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (%s, %s, 1.000000, CURRENT_TIMESTAMP)""",(ingredient_id, unit))
                
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err),
            'submitted_data': data}), 500

# Add or update user_price table
@app.route('/user_prices', methods=['POST'])
@jwt_required()
def add_update_user_price():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    try: 
        data = request.get_json()
        user_id = s_user_id
        ingredient_id = data['ingredient_id']
        price = data['price']
        quantity = data['quantity']
        base_unit = data['base_unit']
        place = data['place']

        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        cursor.callproc('update_insert_user_price', (user_id, ingredient_id, price, quantity, base_unit, place))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Price updated successfully'}), 201
    except Error as err:
        return jsonify({'error': str(err)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')