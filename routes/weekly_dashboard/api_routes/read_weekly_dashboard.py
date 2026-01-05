from flask import request, jsonify
from db import get_db_connection
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import weekly_dashboard_api_bp

# Update food plan 
@weekly_dashboard_api_bp.route('/save_day_recipes_details', methods=['POST'])
@jwt_required()
def get_weekly_dashboard():

    s_user_id = get_jwt_identity()
    print("logged in user id : ",s_user_id)
    data = {}
    try:
        data = request.get_json()

        # connect to db        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        cursor = conn.cursor(dictionary=True)

        print("connection done")

        dayData = data
        food_plan_id = dayData['food_plan_id']
        food_plan_week_id = dayData['food_plan_week_id']
        food_plan_day_id = dayData['food_plan_day_id']
        meals = dayData['daily_meals']

        for meal in meals:
            food_plan_meal_id = meal['food_plan_meal_id']
            recipes = meal['recipes']

            for recipe in recipes:
                recipe_id = recipe['recipe_id']

                cursor.execute("""
                    SELECT ingredient_id, quantity, unit_id FROM recipe_ingredients WHERE recipe_id = %s AND is_active = 1
                """,(recipe_id,))
                ingredient_rows = cursor.fetchall()

                for row in ingredient_rows:
                    ingredient_id = row['ingredient_id']
                    quantity = row['quantity']
                    unit_id = row['unit_id']

                    cursor.execute("SELECT unit_id, unit_name, conversion_factor FROM units WHERE ingredient_id = %s AND is_active = 1",(ingredient_id,))
                    unit_rows = cursor.fetchall()

                    base_unit_row = next((r for r in unit_rows if r['conversion_factor'] == 1),  None)
                    base_unit = base_unit_row['unit_name'] if base_unit_row else None 

                    conversion_factor_row = next((r for r in unit_rows if r['unit_id'] == unit_id), None)
                    conversion_factor = conversion_factor_row['conversion_factor'] if conversion_factor_row else None

                    total_quantity = conversion_factor*quantity

                    print("[food_plan_id is :", food_plan_id, ", food_plan_week_id is :", food_plan_week_id ,", food_plan_day_id is :", food_plan_day_id,
                            ", food_plan_meal_id is :", food_plan_meal_id, ", recipe_id is :", recipe_id, ", ingredient_id is :", ingredient_id,
                            ", quantity is :", total_quantity, ", base_unit is :", base_unit, "]" )


        

        return jsonify({'message': 'data reached backend', 'meals': meals}), 200



















        

    except Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(err)}), 500