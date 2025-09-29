from flask import jsonify, request
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt 
from . import ingredients_api_bp
import re


# update ingredient details....
@ingredients_api_bp.route('/ingredient/<int:ingredient_id>', methods=['PUT'])
@jwt_required()
def update_ingredient(ingredient_id):

    user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get("role", "user")
    # check if user id found in token
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    # check if user is having role as admin
    if not (user_role == "admin"):
        return jsonify({"error": "Admin privileges required"}), 403

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

    try:
        def normalize_ingredient_data(data):
            cleaned = {}
            
            # String fields: trim, collapse multiple spaces, convert to lowercase
            fields = ["name", "reference_quantity", "reference_unit", "default_price", "cup_equivalent_weight", "cup_equivalent_unit",  "notes"]
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
            # --- name ---
            name = data.get("name")
            if not name or not isinstance(name, str) or len(name) > 30:
                return f"Invalid name: ({name}) must be a non-empty string ≤ 30 chars"
            
            # --- reference_quantity ---
            reference_quantity = data.get("reference_quantity")
            if not reference_quantity or not isinstance(reference_quantity, (int,float)) or not (0 <  reference_quantity < 100000):
                return f"Invalid reference_quantity: ({reference_quantity}) must be a number > 0 and less than 100000 "
            
            # --- reference_unit ---
            reference_unit = data.get("reference_unit")
            if not reference_unit or not isinstance(reference_unit, str) or reference_unit not in ('kg','g','oz','lbs','l','ml','fl.oz','pint','pc','bunch'):
                return f"Invalid reference_unit: ({reference_unit}) must be a non-empty string and within ('kg','g','oz','lbs','l','ml','fl.oz','pint','pc','bunch') "

            # --- default_price ---
            default_price = data.get("default_price")
            if not default_price or not isinstance(default_price, (int,float)) or not (0 < default_price < 100000):
                return f"Invalid default_price: ({default_price}) must be a number > 0 and less than 100000 "
            
            # --- cup_equivalent_weight ---
            cup_equivalent_weight = data.get("cup_equivalent_weight")
            if cup_equivalent_weight is None or not isinstance(cup_equivalent_weight, (int,float)) or not(0 <= cup_equivalent_weight < 10000):
                return f"Invalid cup_equivalent_weight: ({cup_equivalent_weight}) must be a number > 0 and less than 100000"
            
            # --- cup_equivalent_unit ---
            cup_equivalent_unit = data.get("cup_equivalent_unit")
            if not isinstance(cup_equivalent_unit, str) or cup_equivalent_unit not in ('kg','g','oz','lbs',''):
                return f"Invalid cup_equivalent_unit: ({cup_equivalent_unit}) must be a non-empty and within ('kg','g','oz','lbs')"

            # --- notes ---
            notes = data.get("notes")
            if not isinstance(notes, str) or len(notes) > 100:
                return f"Invalid notes: must be a string ≤ 100 chars"

            # return none if validation doesnt throw any error
            return None 
       
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
        cursor.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user or not(user['role'] == 'admin'):
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found or Admin privileges required'}), 403
        
        # validate if ingredient name already present in db
        cursor.execute("""
            SELECT 1 FROM ingredients WHERE name = %s AND ingredient_id != %s
        """,(data.get('name'),ingredient_id))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'{data["name"]} - already exists'}), 403

        # validate if ingredient exists which is to be updated
        cursor.execute("""
            SELECT 1 FROM ingredients WHERE ingredient_id = %s AND is_active = 1
        """,(ingredient_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'{ingredient_id} - cant be updated as it does not exists.'}), 403

        # fetch the old data for the ingredient id
        cursor.execute("""
            SELECT name, base_unit, default_price, notes 
            FROM ingredients
            WHERE ingredient_id = %s
        """,(ingredient_id,))
        old_ingredient = cursor.fetchone()
        old_data = {}
        old_data["name"] =old_ingredient.get('name')
        old_data["reference_unit"] =old_ingredient.get('base_unit')
        old_data["default_price"] =old_ingredient.get('default_price')
        old_data["notes"] =old_ingredient.get('notes')

        # normalise new reference unit for comparison
        match data.get('reference_unit'):
            case 'l':
                new_ref_unit = 'l'
                new_def_price = data.get('default_price')/data.get('reference_quantity')
            case 'ml':
                new_ref_unit = 'l'
                new_def_price = data.get('default_price')/data.get('reference_quantity') * 1000
            case 'fl.oz':
                new_ref_unit = 'l'
                new_def_price = data.get('default_price')/data.get('reference_quantity') * 35.1951  
            case 'pint':
                new_ref_unit = 'l'
                new_def_price = data.get('default_price')/data.get('reference_quantity') * 1.75975 
            case 'kg':
                new_ref_unit = 'kg'
                new_def_price = data.get('default_price')/data.get('reference_quantity')
            case 'g':
                new_ref_unit = 'kg'
                new_def_price = data.get('default_price')/data.get('reference_quantity') * 1000
            case 'oz':
                new_ref_unit = 'kg'
                new_def_price = data.get('default_price')/data.get('reference_quantity') * 35.274
            case 'lbs':
                new_ref_unit = 'kg'
                new_def_price = data.get('default_price')/data.get('reference_quantity') * 2.20462
            case 'pc':
                new_ref_unit = 'pc'
                new_def_price = data.get('default_price')/data.get('reference_quantity')
            case 'bunch':
                new_ref_unit = 'bunch'
                new_def_price = data.get('default_price')/data.get('reference_quantity')

            case _:
                raise ValueError(f"Unsupported reference unit: {ref_unit}")
        
        
        # compare old ingredient data with new ingredient data
        if ((old_data.get('name') != data.get('name') or 
            old_data.get('reference_unit') != new_ref_unit or
            float(old_data.get('default_price')) != round(new_def_price,4) or
            old_data.get('notes') != data.get('notes')
            )):
           print("data is NOT same. so we need to update ingredients table.")
        else:
           print("data is  same. so we DONT need to update ingredients table.")  
        
        #return jsonify({"msg":"Everything fine and ready to start updating ingredient details in ingredients table.","old_data":old_data,"new_data":data}), 200
        # ------------------------------ Now insert the data thru procedure ------------------------------------------
        cursor.callproc('update_ingredient_plus_units', (
            ingredient_id,
            data.get('name'), 
            data.get('reference_quantity'), 
            data.get('reference_unit'), 
            data.get('default_price'),
            data.get('cup_equivalent_weight'), 
            data.get('cup_equivalent_unit'),
            data.get('notes'),
            user_id,
            user_role 
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': f'{data.get("name")} : Ingredient updated successfully'}), 201

    except Error as err:
        if conn and conn.is_connected():
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({'error': str(err)}), 500

