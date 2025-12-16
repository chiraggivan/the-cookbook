from flask import Flask, jsonify, request, g, render_template
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
#from bcrypt import hashpw, checkpw, gensalt
import mysql.connector
from datetime import timedelta
from mysql.connector import Error
import re

from config import Config
from db import get_db_connection
from routes.auth import auth_bp

#from routes.recipes import recipes_html_bp,  recipes_api_bp
from routes.recipes.html_routes import recipes_html_bp
from routes.recipes.api_routes import recipes_api_bp
from routes.dishes.html_routes import dishes_html_bp
from routes.dishes.api_routes import dishes_api_bp
from routes.ingredients.api_routes import ingredients_api_bp
from routes.admin.html_routes import admin_html_bp
from routes.food_plans.api_routes import food_plans_api_bp


app = Flask(__name__)
app.config.from_object(Config)
app.register_blueprint(auth_bp)
app.register_blueprint(recipes_html_bp)
app.register_blueprint(recipes_api_bp)
app.register_blueprint(dishes_html_bp)
app.register_blueprint(dishes_api_bp)
app.register_blueprint(ingredients_api_bp)
app.register_blueprint(admin_html_bp)
app.register_blueprint(food_plans_api_bp)

jwt = JWTManager(app)

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