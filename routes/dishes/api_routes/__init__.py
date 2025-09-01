from flask import Blueprint

dishes_api_bp = Blueprint("dishes_api", __name__, url_prefix="/dishes/api")

from . import read_dishes, delete_dishes, create_dishes