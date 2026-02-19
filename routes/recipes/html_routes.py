from flask import Blueprint, render_template, redirect, url_for, session, abort
#from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_db_connection
from mysql.connector import Error
from config import bootstrap
# from routes.recipes.api_routes.read_recipes import get_recipe_details

recipes_html_bp = Blueprint("recipes_html", __name__, url_prefix="/recipes")

# bootstrap = 'bs/'
@recipes_html_bp.route('/', methods=['GET'])  
def recipes_page():
    return render_template(f'recipes/{bootstrap}recipes.html')

@recipes_html_bp.route('/my', methods=['GET'])  
def my_recipes_page():
    return render_template(f"recipes/{bootstrap}my_recipes.html")

@recipes_html_bp.route('/user/<int:user_id>', methods=['GET'])  
def user_recipes_page(user_id):

    try:
        s_user_id = session.get('user_id')
        #print("s_user_id : ", s_user_id)
        #print("searched user id : ", user_id)
        if s_user_id and s_user_id == user_id:
            return redirect(url_for('recipes_html.my_recipes_page'))
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT username FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
                cursor.close()
                conn.close()
                return jsonify({'error': 'User not found'}), 404
        cursor.close()
        conn.close()
        return render_template(f"recipes/{bootstrap}user_recipes.html", user_id=user_id, username=user['username'])

    except Error as err:
        return jsonify({'error': str(err)}), 500
    
@recipes_html_bp.route('/details/<int:recipe_id>', methods=['GET']) 
def recipe_detail_page(recipe_id):
    return render_template(f"recipes/{bootstrap}recipe_details.html", recipe_id=recipe_id) # , is_owner = is_owner  

@recipes_html_bp.route('/create_recipe', methods=['GET'])
def create_recipe_page():
    return render_template(f"recipes/{bootstrap}create_recipe.html")

@recipes_html_bp.route("/edit/<int:recipe_id>", methods=['GET'])
def edit_recipe_page(recipe_id):
   return render_template(f"recipes/edit_recipe.html", recipe_id=recipe_id)

