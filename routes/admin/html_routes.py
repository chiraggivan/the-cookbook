from flask import Blueprint, render_template
from flask_jwt_extended import jwt_required, get_jwt

admin_html_bp = Blueprint("admin_html", __name__, url_prefix="/admin")

@admin_html_bp.route('/ingredients', methods=['GET'])
# @jwt_required()
def all_ingredients_page():
    print("within all_ingredients_page for html_routes")
    # claims = get_jwt()    
    # if claims.get("role") != "admin":
    #     return abort(403, description="Admin privileges required")
    return render_template("admin/ingredients/all_ingredients.html")

@admin_html_bp.route('/ingredient/details/<int:ingredient_id>', methods=['GET'])
# @jwt_required()
def ingredient_details_page(ingredient_id):
    print("within all_ingredients_page for html_routes")
    # claims = get_jwt()    
    # if claims.get("role") != "admin":
    #     return abort(403, description="Admin privileges required")
    return render_template("admin/ingredients/ingredient_details.html")

@admin_html_bp.route('/ingredient/edit/<int:ingredient_id>', methods=['GET'])
def edit_ingredient_page(ingredient_id):
    # if session.get("role") != "admin":
    #     return abort(403, description="Admin privileges required")
    return render_template("admin/ingredients/edit_ingredient.html")

@admin_html_bp.route('/ingredient/create_ingredient', methods=['GET'])
def create_ingredient_page():
    # if session.get("role") != "admin":
    #     return abort(403, description="Admin privileges required")
    return render_template("admin/ingredients/create_ingredient.html")

@admin_html_bp.route('/recipes', methods=['GET'])
@jwt_required()
def all_recipes_page():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return abort(403, description="Admin privileges required")
    return render_template("admin/all_recipes.html")

@admin_html_bp.route('/users', methods=['GET'])
@jwt_required()
def all_users_page():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return abort(403, description="Admin privileges required")
    return render_template("admin/all_users.html")

@admin_html_bp.route('/dishes', methods=['GET'])
@jwt_required()
def all_dishes_page():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return abort(403, description="Admin privileges required")
    return render_template("admin/all_dishes.html")