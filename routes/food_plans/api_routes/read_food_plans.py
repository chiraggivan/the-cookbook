from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity

# Update food plan 
@food_plans_api_bp.route('/food_plan', methods=['GET'])
@jwt_required()
def get_food_plan():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    data = {}

    try:
        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        # check user is valid and active
        cursor.execute("SELECT 1 FROM users WHERE user_id = %s AND is_active = 1", (s_user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # get the food_plan_id for the user
        cursor.execute("SELECT food_plan_id FROM food_plans WHERE user_id = %s AND is_active = 1", (s_user_id,))
        row = cursor.fetchone()
        if row is None:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan not found for the user'}), 404
        food_plan_id = row[0]

        data['food_plan_id'] = food_plan_id

        # get the food_plan_day_ids of the food_plan_id
        cursor.execute("SELECT food_plan_id FROM food_plan_days WHERE food_plan_id = %s ORDER BY week_no, day_no",(food_plan_id,))
        rows = cursor.fetchall()
        if not rows:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Food plan day not found for the food plan of the user'}), 404
        food_plan_day_ids = [row[0] for row in rows]

        food_plan = []
        for day_id in food_plan_day_ids:
            each_food_plan = {}
            cursor.execute("SELECT week_no, day_no FROM food_plan_days WHERE food_plan_day_id = %s",(day_id,))
            

        

        
        

    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500