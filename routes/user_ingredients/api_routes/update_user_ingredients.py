from flask import request, jsonify
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity #, create_access_token, JWTManager
from . import user_ingredients_api_bp
import re

# Update food plan 
@user_ingredients_api_bp.route('/edit', methods=['PUT'])
@jwt_required()
def edit_user_ingredient():
    
    user_id = get_jwt_identity()
    print("logged in user id : ",user_id)
    
    # normailise data
    def normalize_ingredient_data(data):
        cleaned = {}
        
        # String fields: trim, collapse multiple spaces, convert to lowercase
        fields = ["ingredient_id", "name", "quantity", "unit", "price", "cup_weight", "cup_unit",  "notes"]
        # ingredient_dict = data[0] 
        
        for field in fields:
            value = data.get(field)
            if isinstance(value, str):
                # Remove leading/trailing spaces, collapse internal spaces, convert to lowercase
                cleaned[field] = re.sub(r"\s+", " ", value.strip()).lower()
            elif isinstance(value,(int,float)):
                cleaned[field] = value  # keep as-is if int or float
            else:
                cleaned[field] = None 
        
        return cleaned
    
    def validate_ingredient(data):
        
        #print(data)
        # --- ingredient_id ---
        ingredient_id = data.get("ingredient_id")
        if not ingredient_id or not isinstance(ingredient_id, int) or ingredient_id <= 0:
            return f"Invalid ingredient_id: ({ingredient_id}) must be a int > 0"

        # --- name ---
        name = data.get("name")
        if not name or not isinstance(name, str) or len(name) > 30:
            return f"Invalid name: ({name}) must be a non-empty string ≤ 30 chars"
        
        # --- quantity ---
        quantity = data.get("quantity")
        if not quantity or not isinstance(quantity, (int,float)) or not (0 <  quantity < 100000):
            return f"Invalid quantity: ({quantity}) must be a number > 0 and less than 100000 "
        
        # --- unit ---
        unit = data.get("unit")
        if not unit or not isinstance(unit, str) or unit not in ('kg','g','oz','lbs','l','ml','fl.oz','pint','pc','bunch'):
            return f"Invalid unit: ({unit}) must be a non-empty string and within ('kg','g','oz','lbs','l','ml','fl.oz','pint','pc','bunch') "

        # --- price ---
        price = data.get("price")
        if not price or not isinstance(price, (int,float)) or not (0 < price < 100000):
            return f"Invalid price: ({price}) must be a number > 0 and less than 100000 "
        
        # --- cup_weight  and cup_unit---
        cup_weight = data.get("cup_weight")
        cup_unit = data.get("cup_unit")
        # print("cup_weight : ", cup_weight, "cup_unit : ", cup_unit)

        # --- cup_weight --- if present
        if cup_weight not in (None, ''):  # only validate if value is present
            if not isinstance(cup_weight, (int, float)) or not (0 <= cup_weight < 100000):
                return f"Invalid cup_weight: ({cup_weight}) must be a number >= 0 and less than 100000"

        # --- cup_unit --- if present            
        if cup_unit not in (None, ''):  # only validate if value is present
            if not isinstance(cup_unit, str) or cup_unit not in ('kg','g','oz','lbs'):
                return f"Invalid cup_unit: ({cup_unit}) must be within ('kg','g','oz','lbs')"

        # --- notes ---
        notes = data.get("notes")
        if not isinstance(notes, str) or len(notes) > 100:
            return f"Invalid notes: must be a string ≤ 100 chars"

        # Check if both are either empty or filled
        if (cup_weight in (0, None, '') and cup_unit not in (None, '')) \
        or (cup_weight not in (0, None, '') and cup_unit in (None, '')):
            return "Both cup_weight and cup_unit must be provided together or left empty"

        # return none if validation doesnt throw any error
        return None 

    try:
        data = request.get_json()
        # print(" data is :", data)

        data = normalize_ingredient_data(request.get_json())
        
        error = validate_ingredient(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400  
        #------------------------------------------- field normalised and validated ------------------------------------------
        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists & user has the privilege to delete the ingredient
        cursor.execute("""
            SELECT 1 
            FROM users u
            JOIN user_ingredients ui ON ui.submitted_by = u.user_id AND u.is_active = 1 
            WHERE u.user_id = %s AND ui.user_ingredient_id = %s
        """, (user_id, data['ingredient_id']))
        user = cursor.fetchone()
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not active or not rightful owner of ingredient'}), 403
        
        # validate if new NAME already present in MAIN ingredients table 
        cursor.execute("SELECT 1 FROM ingredients WHERE name = %s and is_active = 1",(data['name'],))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'{data["name"]} - already exists'}), 403
        
        # validate if ingredient NAME already present in USER ingredients table by same user
        cursor.execute("SELECT 1 FROM user_ingredients WHERE name = %s and submitted_by = %s AND user_ingredient_id != %s AND is_active = 1",
            (data['name'],user_id, data['ingredient_id']))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error':  f' you already have this ingredient({data["name"]})'}), 403

        print("about to call procedure")
        # return jsonify({"msg":"Everything fine and ready to start adding ingredient details in user ingredients table."}), 200 # for postman
        # ------------------------------ Now insert the data thru procedure ------------------------------------------
        cursor.callproc('update_user_ingredient_plus_units', (
                    data['ingredient_id'],
                    data['name'], 
                    data['quantity'], 
                    data['unit'], 
                    data['price'],
                    data['cup_weight'], 
                    data['cup_unit'],
                    data['notes'],
                    user_id
                ))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'{data.get("name")} : Ingredient added successfully'}), 201
        return data

    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500