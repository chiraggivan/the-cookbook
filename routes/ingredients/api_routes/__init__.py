from flask import Blueprint

ingredients_api_bp = Blueprint("ingredients_api", __name__, url_prefix="/ingredients/api")

from . import read_ingredients, delete_ingredients, create_ingredients, update_ingredients

