# routes/read.py
from flask import jsonify, g
from db import get_db_connection
from mysql.connector import Error
from flask_jwt_extended import jwt_required, get_jwt_identity#, JWTManager,  create_access_token
from . import recipes_api_bp

# Get all recipes
@recipes_api_bp.route('/all_recipes', methods=['GET'])
@jwt_required()
def get_recipes():

    user = g.user #print("logged in user : ",user)
    s_user_id = user.get('user_id')
    
    if not s_user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    try:
        # connect to db
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        #fetch all the recipes of the users as well as public recipes of other users
        cursor.execute("""
        SELECT r.recipe_id, r.name, r.user_id, r.portion_size, r.description, u.username 
        FROM recipes r JOIN users u ON r.user_id = u.user_id
        WHERE r.is_active = TRUE
        AND (r.user_id = %s OR r.privacy = 'public') """,(s_user_id,))
        recipes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(recipes)
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get all the recipe of a certain user
@recipes_api_bp.route('/user/<int:user_id>/recipes', methods=['GET'])
@jwt_required()
def get_user_recipes(user_id):

    user = g.user #print("logged in user : ",user)
    s_user_id = user.get('user_id')

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

# Get my recipes - checked
@recipes_api_bp.route('/my_recipes', methods=['GET'])
@jwt_required()
def get_my_recipes():

    # s_user_id = get_jwt_identity()
    user = g.user #print("logged in user : ",user)
    s_user_id = user.get('user_id')
    
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
        
        # get all the recipes of the user
        cursor.execute("""
            SELECT r.recipe_id, r.name, r.user_id, r.portion_size, r.description, u.username
            FROM recipes r 
            JOIN users u ON r.user_id = u.user_id
            WHERE r.is_active = TRUE
            AND r.user_id = %s 
        """,(s_user_id,))
        recipes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(recipes)
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get recipe ingredient
@recipes_api_bp.route('/recipe/<int:recipe_id>', methods=['GET'])
@jwt_required()
def get_recipe_details(recipe_id):

    user = g.user #print("logged in user : ",user)
    s_user_id = user.get('user_id')
    
    if (recipe_id <= 0):
        return jsonify({'error':'Recipe ID is negative.'}), 404
        
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
                rc.recipe_component_id,
                rc.display_order as component_display_order,
                rc.component_text,
                ri.display_order as ingredient_display_order,
                i.ingredient_id,
                i.name,
                ri.recipe_ingredient_id,
                ri.quantity,
                ri.ingredient_source,
                u.unit_id,
                u.unit_name,
                ri.quantity * COALESCE(up.custom_price, i.default_price) * u.conversion_factor AS price,
                COALESCE(up.custom_price, i.default_price) AS cost,
                COALESCE(up.base_unit, i.base_unit) AS unit
            FROM recipe_ingredients ri 
            LEFT JOIN recipe_components rc ON rc.recipe_component_id = ri.component_id
            LEFT JOIN ingredients i ON ri.ingredient_id = i.ingredient_id AND ri.ingredient_source = 'main'
            LEFT JOIN user_ingredients ui ON ui.user_ingredient_id = ri.ingredient_id AND ri.ingredient_source = 'user'
            JOIN units u ON ri.unit_id = u.unit_id
            LEFT JOIN user_prices up ON up.user_id = %s 
                AND up.ingredient_id = i.ingredient_id 
                AND up.is_active = TRUE
            WHERE ri.recipe_id = %s
            AND ri.is_active = TRUE
            ORDER BY rc.display_order, ri.display_order
            """,(s_user_id, recipe_id))
        ingredients = cursor.fetchall()
        if not ingredients:
            cursor.close()
            conn.close()
            return jsonify({'error': f'ingredients not found for the {recipe_id}.'}), 404
        
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
