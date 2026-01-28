from flask import Blueprint, render_template #, redirect, url_for, session, abort
#from db import get_db_connection
#from mysql.connector import Error

user_ingredients_html_bp = Blueprint("user_ingredients_html", __name__, url_prefix="/user_ingredients")

@user_ingredients_html_bp.route('/', methods=['GET'])  
def read_user_ingredients():
    return render_template("user_ingredients/read_user_ingredients.html")

@user_ingredients_html_bp.route('/create', methods=['GET'])  
def create_user_ingredients():
    return render_template("user_ingredients/create_user_ingredient.html")

@user_ingredients_html_bp.route('/update', methods=['GET'])  
def update_user_ingredients():
    return render_template("user_ingredients/edit_user_ingredient.html")
