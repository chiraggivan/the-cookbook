from flask import Blueprint, render_template, redirect, url_for, session
from db import get_db_connection
from mysql.connector import Error

recipes_html_bp = Blueprint("recipes_html", __name__, url_prefix="/recipes")

@recipes_html_bp.route('/', methods=['GET'])  
def recipes_page():
    return render_template("recipes/recipes.html")

@recipes_html_bp.route('/my', methods=['GET'])  
def my_recipes_page():
    return render_template("recipes/my_recipes.html")

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
        return render_template("recipes/user_recipes.html", user_id=user_id, username=user['username'])

    except Error as err:
        return jsonify({'error': str(err)}), 500
    
@recipes_html_bp.route('/details/<int:recipe_id>', methods=['GET']) 
def recipe_detail_page(recipe_id):
    return render_template("recipes/recipe_details.html", recipe_id=recipe_id)  