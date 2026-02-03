from flask import request, jsonify
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity #, create_access_token, JWTManager
from . import user_ingredients_api_bp
import re

# create user ingredient 
@user_ingredients_api_bp.route('/create', methods=['POST'])
@jwt_required()
def create_user_ingredient():
    
    user_id = get_jwt_identity()
    print("logged in user id : ",user_id)
    
    # normailise data
    def normalize_ingredient_data(data):
        cleaned = {}
        
        # String fields: trim, collapse multiple spaces, convert to lowercase
        fields = ["name", "quantity", "unit", "price", "cup_weight", "cup_unit",  "notes"]
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
    
    #validate data
    def validate_ingredient(data):
        
        #print(data)
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
        # data = request.get_json() # used when image file was not attached to save.

        # Read text fields from form
        recData = {
            "name": request.form.get("name"),
            "price": float(request.form.get("price")),
            "quantity": float(request.form.get("quantity")),
            "unit": request.form.get("unit"),
            "cup_weight": float(request.form.get("cup_weight")) if request.form.get("cup_weight") else None,
            "cup_unit": request.form.get("cup_unit"),
            "notes": request.form.get("notes")
        }
    
        # data = normalize_ingredient_data(request.get_json())
        data = normalize_ingredient_data(recData)
        
        error = validate_ingredient(data)
        if error:
            return jsonify({"error": error, "submitted_data": data}), 400 

        # Read & save image file 
        image_file = request.files.get("image")

        # check if file is really jpeg or png and not some malicious file
        if image_file.mimetype not in ["image/jpeg", "image/png"]:
            return jsonify({"error": "Invalid image type"}), 400

        if image_file:
            print("image found with data")
            # generate unique filename
            import uuid, os
            ext = os.path.splitext(image_file.filename)[1]
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            save_path = os.path.join("static/images/user_ingredients", unique_filename)
            print("ext is :", ext)
            print("unique_filename : ", unique_filename)
            print("save_path :", save_path)
            # image_file.save(save_path)
            data["image_path"] = f"ingredients/{unique_filename}"
        else:
            print("no image came with data")
            data["image_path"] = None 
        return jsonify({"message":" done with noramlisation and validation with image file"}), 200
        #------------------------------------------- field normalised and validated ------------------------------------------
        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Validate user_id exists & user has the privilege to delete the ingredient
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (user_id,))
        user = cursor.fetchone()
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 403
        
        # validate if ingredient NAME already present in MAIN ingredients table 
        cursor.execute("SELECT 1 FROM ingredients WHERE name = %s and is_active = 1",(data['name'],))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'{data["name"]} - already exists','submitted_data': data}), 403
        
        # validate if ingredient NAME already present in USER ingredients table by same user
        cursor.execute("SELECT 1 FROM user_ingredients WHERE name = %s and submitted_by = %s AND is_active = 1",(data['name'],user_id))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error':  f' You already have this ingredient ({data["name"]})','submitted_data': data}), 403

        # return jsonify({"msg":"Everything fine and ready to start adding ingredient details in user ingredients table."}), 200 # for postman
        # ------------------------------ Now insert the data thru procedure ------------------------------------------
        cursor.callproc('insert_user_ingredient_plus_units', (
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
        if image_file:
            image_file.save(save_path)
        return jsonify({'message': f'{data.get("name")} : Ingredient added successfully'}), 201
        

    
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500