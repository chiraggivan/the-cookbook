from flask import Blueprint

recipes_api_bp = Blueprint("recipes_api", __name__, url_prefix="/recipes/api")

from . import read_recipes, delete_recipes, create_recipes, update_recipes