from flask import Blueprint

weekly_dashboard_api_bp = Blueprint("weekly_dashboard_api", __name__, url_prefix="/weekly_dashboard/api")

from . import read_weekly_dashboard #, delete_recipes, create_recipes, update_recipes