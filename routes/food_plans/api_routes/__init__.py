from flask import Blueprint

food_plans_api_bp = Blueprint("food_plans_api", __name__, url_prefix="/food_plans/api")

from . import create_food_plans, update_food_plans #, read_food_plans, delete_food_plans