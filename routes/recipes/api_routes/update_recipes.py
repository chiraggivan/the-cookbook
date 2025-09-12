from flask import Blueprint, render_template, request, jsonify
from db import get_db_connection
from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from . import recipes_api_bp

# get recipe details but also make sure owner is logged in
@recipes_api_bp.route('/recipe/edit/<int:recipe_id>', methods=['GET'])
@jwt_required()
def get_recipe_details_for_update(recipe_id):

    s_user_id = get_jwt_identity()
    #print("logged in user id : ",s_user_id)
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # check is the recipe owner is same as logged in users.
        cursor.execute("""
            SELECT 1 FROM recipes WHERE user_id =%s AND recipe_id = %s
        """,(s_user_id, recipe_id))
        isOwner = cursor.fetchone()
        if not isOwner:
            cursor.close()
            conn.close()
            return jsonify({'error':'you dont owe the recipe. please login with correct credentials'}), 403

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

#get units of ingredients from unit table.
@recipes_api_bp.route('/units/<int:ingredient_id>', methods=["GET"])
@jwt_required()
def get_units(ingredient_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)#print("type of ing is :", type(ingredient_id))
    cursor.execute("SELECT unit_id, unit_name FROM units WHERE ingredient_id = %s AND is_active = 1",(ingredient_id,))
    units = cursor.fetchall()
    cursor.close()
    conn.close()
    print("units :", units)
    return jsonify(units), 200

# update privacy only(PUT)
@recipes_api_bp.route('/update-privacy/<int:recipe_id>', methods=['PUT'])
@jwt_required()
def update_privacy(recipe_id):

    s_user_id = int(get_jwt_identity())
    print("logged in user id : ",s_user_id, " ", type(s_user_id))
    try:
        # get data , normalize and validate 
        data = request.get_json()
        privacy = data.get("privacy")
        if privacy not in ['private', 'public']:
            return jsonify({"error": "privacy not matched to the allowed values"}), 400  
        
        # get db connection
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1" , (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        # Check if recipe exists and belongs to user
        cursor.execute("""
            SELECT user_id FROM recipes 
            WHERE recipe_id = %s  AND is_active = TRUE
        """, (recipe_id,))
        recipeOwner = cursor.fetchone()
        print("recipeOwner user_id : ", recipeOwner["user_id"], " ", type(recipeOwner["user_id"]))
        if not recipeOwner["user_id"]:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Recipe not found'}), 404
        if recipeOwner["user_id"] != s_user_id:
            cursor.close()
            conn.close()
            return jsonify({'error': 'You are not authorised to change privacy setting.'}), 403

        # update privacy after recipe id and user id are checked and verified 
        cursor.execute("""
            UPDATE recipes SET privacy = %s WHERE recipe_id = %s AND user_id = %s
        """,(privacy,recipe_id,s_user_id))
        if cursor.rowcount > 0 :
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({"message": "Recipe's privacy updated successfully"}), 200
        else:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Recipe DID NOT updated successfully'}), 200


    except Exception as err:
        if conn and conn.is_connected():
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({'error': str(err)}), 500

# Update recipe (PATCH)
@recipes_api_bp.route('/update-recipe/<int:recipe_id>', methods=['PATCH'])
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
        #Check if any data provided
        if not data:
            return jsonify({'error': 'No data provided'}), 400
  
        error = validate_recipe_and_ingredient_data(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400  
        # -------------------------- normailisation and validation done -----------------------
        
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
