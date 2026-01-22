from flask import Blueprint

user_ingredients_api_bp = Blueprint("user_ingredients_api", __name__, url_prefix="/user_ingredients/api")

from . import create_user_ingredients #read_recipes, delete_recipes, create_recipes, update_recipes