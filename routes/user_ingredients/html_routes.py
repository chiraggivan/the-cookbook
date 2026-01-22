from flask import Blueprint, render_template #, redirect, url_for, session, abort
#from db import get_db_connection
#from mysql.connector import Error

user_ingredients_html_bp = Blueprint("user_ingredients_html", __name__, url_prefix="/user_ingredients")

@user_ingredients_html_bp.route('/new', methods=['POST'])  
def create_user_ingredients():
    return render_template("user_ingredients/new_user_ingredient.html")