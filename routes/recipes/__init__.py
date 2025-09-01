from flask import Blueprint 

recipes_bp = Blueprint("recipes", __name__)

from .html_routes import recipes_html_bp
from .api_routes import recipes_api_bp