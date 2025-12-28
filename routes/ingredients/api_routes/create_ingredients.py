from flask import jsonify, request
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt 
from . import ingredients_api_bp
import re

# search ingredients for admin to help know which all are in db.
@ingredients_api_bp.route("/ingredients/search")
@jwt_required()
def search_ingredients():

    s_user_id = get_jwt_identity()
   
    q = request.args.get("q", "").strip().lower()
    #print("user id:",s_user_id," value of q :", q)
    if not q:
        return jsonify([])

    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT  i.name
            FROM ingredients i 
            WHERE LOWER(i.name) LIKE %s
            LIMIT 20
        """,(f"%{q}%",))
        results = cursor.fetchall()
        #print("result: ", results)
        cursor.close()
        conn.close()
        return jsonify(results)

    except Exception as e:
        print("Error in search_ingredients:", e)
        return jsonify([])


# Create new ingredient
@ingredients_api_bp.route('/new-ingredient', methods=['POST'])
@jwt_required()
def create_ingredient():

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
            
            # --- cup_equivalent_weight  and cup_equivalent_unit---
            cup_equivalent_weight = data.get("cup_equivalent_weight")
            cup_equivalent_unit = data.get("cup_equivalent_unit")
            print("cup_equivalent_weight : ", cup_equivalent_weight, "cup_equivalent_unit : ", cup_equivalent_unit)

            # Check if both are either empty or filled
            if (cup_equivalent_weight in (0, None, '') and cup_equivalent_unit not in (None, '')) \
            or (cup_equivalent_weight not in (0, None, '') and cup_equivalent_unit in (None, '')):
                return "Both cup_equivalent_weight and cup_equivalent_unit must be provided together or left empty"

            # --- cup_equivalent_weight --- if present
            if cup_equivalent_weight not in (None, ''):  # only validate if value is present
                if not isinstance(cup_equivalent_weight, (int, float)) or not (0 <= cup_equivalent_weight < 100000):
                    return f"Invalid cup_equivalent_weight: ({cup_equivalent_weight}) must be a number >= 0 and less than 100000"

            # --- cup_equivalent_unit --- if present            
            if cup_equivalent_unit not in (None, ''):  # only validate if value is present
                if not isinstance(cup_equivalent_unit, str) or cup_equivalent_unit not in ('kg','g','oz','lbs'):
                    return f"Invalid cup_equivalent_unit: ({cup_equivalent_unit}) must be within ('kg','g','oz','lbs')"

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
            SELECT 1 FROM ingredients WHERE name = %s 
        """,(data.get('name'),))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': f'{data["name"]} - already exists'}), 403

        #print("data is : ",data)
        #return jsonify({"msg":"Everything fine and ready to start adding ingredient details in ingredients table."}), 200 # for postman
        # return jsonify({"error":"Everything fine and ready to start adding ingredient details in ingredients table."}), 400
        # ------------------------------ Now insert the data thru procedure ------------------------------------------
        cursor.callproc('insert_ingredient_plus_units', (
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
        return jsonify({'message': f'{data.get("name")} : Ingredient added successfully'}), 201

    except Error as err:
        if conn and conn.is_connected():
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({'error': str(err)}), 500

        