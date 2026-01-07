from flask import Blueprint, render_template 


weekly_dashboard_html_bp = Blueprint("weekly_dashboard_html", __name__, url_prefix="/weekly_dashboard")

@weekly_dashboard_html_bp.route('/<int:plan_id>/<int:week_no>', methods=['GET'])
def get_week_dashboard(plan_id, week_no):
    return render_template("weekly_dashboard/dashboard.html", food_plan_id = plan_id, week_no = week_no)

@weekly_dashboard_html_bp.route('/<int:week_no>', methods=['GET']) # use any one of the above of this 
def get_dashboard(week_no):
    return render_template("weekly_dashboard/dashboard.html", week_no = week_no)