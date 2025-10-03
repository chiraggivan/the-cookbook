from flask import jsonify, request#, Blueprint, render_template
from db import get_db_connection
from mysql.connector import Error
#from bcrypt import hashpw, checkpw, gensalt
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt #, JWTManager,  create_access_token
from . import ingredients_api_bp

# Get all ingredients
@ingredients_api_bp.route('/all_ingredients', methods=['GET'])
@jwt_required()
def get_all_ingredients():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get("role", "user")

    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    offset = (page - 1) * per_page
    
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    
    if not (user_role == "admin"):
        return jsonify({"error": "Admin privileges required"}), 403
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Get total count
        cursor.execute("SELECT COUNT(*) as total FROM ingredients")
        total = cursor.fetchone()["total"]

        # Get all ingredients details
        cursor.execute("""
        SELECT ingredient_id, name, base_unit, default_price, is_active, submitted_by, 
                approved_by, approval_status, approval_date, end_date, created_at, notes
        FROM ingredients LIMIT %s OFFSET %s""",(per_page, offset))
        rows  = cursor.fetchall()
        cursor.close()
        conn.close()

        # Prepare pagination metadata
        total_pages = (total + per_page - 1) // per_page  # ceil division
        return jsonify({
            "ingredients": rows,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages
            }
        })
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Get details of ingredients by its id
@ingredients_api_bp.route('/ingredient/<int:ingredient_id>', methods=['GET'])
@jwt_required()
def get_ingredient_details(ingredient_id):

    user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get("role", "user")
    # check if user id found in token
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    # check if user is having role as admin
    if not (user_role == "admin"):
        return jsonify({"error": "Admin privileges required"}), 403
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Get ingredients details
        cursor.execute("""
        SELECT ingredient_id, name, base_unit, default_price, is_active, submitted_by, 
                approved_by, approval_status, approval_date, end_date, created_at, notes, cup_weight, cup_unit
        FROM ingredients 
        WHERE ingredient_id = %s""",(ingredient_id,))
        row  = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return jsonify({'error':f'Ingredient not found for the ingredient id {ingredient_id}.'}), 404
        cursor.close()
        conn.close()

        return jsonify({"details": row}), 200
    except Error as err:
        return jsonify({'error': str(err)}), 500

# Show all deleted ingredients
@ingredients_api_bp.route('/deleted_ingredients', methods=['GET'])
@jwt_required()
def get_all_deleted_ingredients():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_role = claims.get("role", "user")

    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    offset = (page - 1) * per_page
    
    if not user_id:
        return jsonify({'error': 'No user identity found in token'}), 401
    
    if not (user_role == "admin"):
        return jsonify({"error": "Admin privileges required"}), 403
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # Get total count
        cursor.execute("SELECT COUNT(*) as total FROM ingredients WHERE is_active = 0")
        total = cursor.fetchone()["total"]

        # Get all ingredients details
        cursor.execute("""
        SELECT ingredient_id, name, base_unit, default_price, is_active, submitted_by, 
                approved_by, approval_status, approval_date, end_date, created_at, notes
        FROM ingredients LIMIT %s OFFSET %s 
        WHERE is_active = 0""",(per_page, offset))
        rows  = cursor.fetchall()
        cursor.close()
        conn.close()

        # Prepare pagination metadata
        total_pages = (total + per_page - 1) // per_page  # ceil division
        return jsonify({
            "ingredients": rows,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages
            }
        })
    except Error as err:
        return jsonify({'error': str(err)}), 500

