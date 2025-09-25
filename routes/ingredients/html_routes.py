from flask import Blueprint, render_template, redirect, url_for, session, abort
#from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_db_connection
from mysql.connector import Error

ingredients_html_bp = Blueprint("ingredients_html", __name__, url_prefix="/ingredients")