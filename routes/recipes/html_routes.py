from flask import Blueprint, render_template

recipes_html_bp = Blueprint("recipes_html", __name__)

@recipes_html_bp.route('/', methods=['GET'])  
def recipes_page():
    return render_template("recipes.html")

@recipes_html_bp.route('/my', methods=['GET'])  
def my_recipes_page():
    return render_template("my_recipes.html")