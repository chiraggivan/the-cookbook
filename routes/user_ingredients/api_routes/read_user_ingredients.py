from flask import request, jsonify
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity #, create_access_token, JWTManager
from . import user_ingredients_api_bp
import re

# search ingredients for recipe
@user_ingredients_api_bp.route("/search")
@jwt_required()
def search__user_ingredients():

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
            SELECT user_ingredient_id as id, name, display_price as price, display_unit as base_unit, display_quantity
            FROM user_ingredients
            WHERE submitted_by = %s AND LOWER(name) LIKE %s AND  is_active = 1
            LIMIT 20
        """,(s_user_id, f"%{q}%"))
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(results)

    except Exception as e:
        cursor.close()
        conn.close()
        print("Error in search_ingredients:", e)
        return jsonify([])


# read user ingredients
@user_ingredients_api_bp.route('/get_user_all_ingredients', methods=['GET'])
@jwt_required()
def read_user_ingredients():
    
    user_id = get_jwt_identity()
    print("logged in user id : ",user_id)

    try:
       
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
        
        # Query all the ingredients of the user in user_ingredients table
        cursor.execute("""
            SELECT user_ingredient_id, name, display_unit, display_price, display_quantity, cup_weight, cup_unit, notes
            FROM user_ingredients
            WHERE submitted_by = %s AND is_active = 1
            ORDER BY created_at DESC
        """,(user_id,))
        ingredients = cursor.fetchall()
        if not ingredients:
            return jsonify({"ingredients": [], "count": 0}), 200
        
        payload = []
        for ingredient in ingredients:

            if not ingredient.get('cup_weight'):
                cup_weight = None
                cup_unit = None
            else:
                cup_weight = float(ingredient['cup_weight'])
                cup_unit = ingredient['cup_unit']

            object = {
                'ingredient_id' : ingredient.get('user_ingredient_id'),
                'name': ingredient.get("name"),
                'price': float(ingredient.get("display_price")) ,
                'quantity': float(ingredient.get("display_quantity")),
                'unit' : ingredient.get("display_unit"),
                'cup_weight': cup_weight,
                'cup_unit': cup_unit,
                'notes': ingredient.get('notes')
            }
            payload.append(object)

        return jsonify({"ingredients":payload, "count":len(payload)}), 200 # for postman
    
    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500
