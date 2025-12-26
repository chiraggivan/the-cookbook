from flask import Blueprint, render_template, redirect, url_for, session
from db import get_db_connection
from mysql.connector import Error

dishes_html_bp = Blueprint("dishes_html", __name__, url_prefix="/dishes")

@dishes_html_bp.route('/', methods=['GET'])
def get_my_dishes():
    return render_template("dishes/my_dishes.html")

@dishes_html_bp.route('/details/<int:dish_id>', methods=['GET'])
def get_dish_details(dish_id):
    return render_template("dishes/dish_details.html", dish_id = dish_id)

