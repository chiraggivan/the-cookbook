# from flask import request, jsonify
# from db import get_db_connection
# from flask_jwt_extended import jwt_required, get_jwt_identity
import re
# from datetime import date

total_weeks = 5
meals = ['breakfast', 'lunch', 'dinner']

def normalize_string(value):
        return re.sub(r"\s+", " ", value.strip()).lower()

def normalize_value(value):
    if isinstance(value, str):
        return normalize_string(value)
    if isinstance(value, (int, float)):
        return value
    return value

def normalize_plan(data):
    normalized = {}
    for k,v in data.items():
        if k == "food_plan":
           normalized[k] = normalize_food_plan(v)
        else :
            normalized[k] = normalize_value(v)
    
    return normalized

def normalize_food_plan(food_plan):
    if not isinstance(food_plan, list):
        return []

    normalized = []
    for plan in food_plan:
        if not isinstance(plan, dict):
            continue

        norm = {}
        for k, v in plan.items():
            if k == "weekly_meals":
                norm[k] = normalize_weekly_meals(v)
            else:
                norm[k] = normalize_value(v)

        normalized.append(norm)    
    return normalized

def normalize_weekly_meals(weekly_meals):
    if not isinstance(weekly_meals, list):
        return []

    normalized = []
    for day in weekly_meals:
        if not isinstance(day, dict):
            continue

        norm = {}
        for k, v in day.items():
            if k == "daily_meals":
                norm[k] = normalize_daily_meals(v)
            else:
                norm[k] = normalize_value(v)

        normalized.append(norm)

    return normalized

def normalize_daily_meals(daily_meals):
    if not isinstance(daily_meals, list):
        return []

    normalized = []
    for meal in daily_meals:
        if not isinstance(meal, dict):
            continue

        norm = {}
        for k, v in meal.items():
            if k == "recipes":
                norm[k] = normalize_recipes(v)
            else:
                norm[k] = normalize_value(v)

        normalized.append(norm)

    return normalized

def normalize_recipes(recipes):
    if not isinstance(recipes, list):
        return []

    normalized = []
    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue

        norm = {}
        for k, v in recipe.items():
            norm[k] = normalize_value(v)

        normalized.append(norm)

    return normalized

def validate_food_plan(data, meals):
    if data.get('food_plan_id'):
        plan_id = data['food_plan_id']
        if not isinstance(plan_id, int) or plan_id <= 0:
            return f"Invalid food plan id ({plan_id}): Should be positive integer", None
            
    food_plan = data.get('food_plan',[])
    total_weeks_plan = len(food_plan)
    recipe_ids = []

    if total_weeks_plan > 1 or total_weeks_plan == 0:
        return f"Cant be empty and Only 1 week of food planning is allowed.", None
    
    for week in food_plan:
        if week.get('food_plan_week_id'):
            food_plan_week_id = week['food_plan_week_id']
            if not isinstance(food_plan_week_id, int) or food_plan_week_id <= 0:
                return f"Invalid food plan week id ({food_plan_week_id}): Should be positive integer", None

        week_no = week.get('week_no')
        if not week_no or not isinstance(week_no, int) or week_no <= 0 or week_no > 5:
            return f"week number ({week_no}) required and should be positive int less than 6", None
        
        weekly_meals = week.get('weekly_meals',[])
        total_days = len(weekly_meals)
        if total_days > 1 or total_days == 0:
            return f"Cant be empty and Only 1 day of food planning is allowed.", None

        if not weekly_meals or not isinstance(weekly_meals, list):
            return f"invalid weekly meals: missing or not a list type", None
        
        for day in weekly_meals:
            if day.get('food_plan_day_id'):
                food_plan_day_id = day['food_plan_day_id']
                if not isinstance(food_plan_day_id, int) or food_plan_day_id <= 0:
                    return f"Invalid food plan day id ({food_plan_day_id}): Should be positive integer", None

            day_no = day.get('day_no')
            if not day_no or not isinstance(day_no, int) or day_no <= 0 or day_no > 7:
                return f"Invalid day_no. Should be positive int and not more than 7", None
            
            daily_meals = day.get('daily_meals')
            if not daily_meals or not isinstance(daily_meals, list):
                return f" invalid daily meals: missing or not a list type", None
            
            total_meals = len(daily_meals)
            if total_meals > len(meals):
                return f"Can't have {total_meals} meals in a day", None

            for meal in daily_meals:
                if meal.get('food_plan_meal_id'):
                    food_plan_meal_id = meal['food_plan_meal_id']
                    if not isinstance(food_plan_meal_id, int) or food_plan_meal_id <= 0:
                        return f"Invalid food plan meal id ({food_plan_meal_id}): Should be positive integer", None


                meal_type = meal.get('meal_type')
                if not meal_type or not isinstance(meal_type, str) or (meal_type not in meals):
                    return f"Invalid meal type ({meal_type}): missing, should be string and one of the saved meals", None
                
                recipes = meal.get('recipes')
                total_recipes = len(recipes)
                if not recipes or not isinstance(recipes, list):
                    return f"Invalid recipes: should be non empty list", None
                
                for recipe in recipes:
                    if recipe.get('food_plan_recipe_id'):
                        food_plan_recipe_id = recipe['food_plan_recipe_id']
                        if not isinstance(food_plan_recipe_id, int) or food_plan_recipe_id <= 0:
                            return f"Invalid food plan recipe id ({food_plan_recipe_id}): Should be positive integer", None
                    
                    recipe_id = recipe.get('recipe_id')
                    if not recipe_id or not isinstance(recipe_id, int) or recipe_id <= 0:
                        return f" Invalid recipe id {recipe_id}: missing or should be positive int", None
                    
                    recipe_ids.append(recipe_id)

                    display_order = recipe.get('display_order')
                    if not display_order or not isinstance(display_order, int) or display_order <= 0 or display_order > total_recipes:
                        return f"Invalid display order ({display_order}): missing or should be + int less than total recipes in a meal", None
                    
    return None, recipe_ids
    