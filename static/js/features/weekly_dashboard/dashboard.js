import{ isTokenValid, getUserFromToken, showAlert } from "../../core/utils.js";

const token = localStorage.getItem("access_token");

// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
}

// get user details from toke
const data = getUserFromToken(token);
const userId = parseInt(data.user_id);
const role = data.role;
const weekNo = Number(document.body.dataset.weekNo);
const foodPlanId = Number(document.body.dataset.foodPlanId);

const error = document.getElementById("error");


document.addEventListener("DOMContentLoaded", async function () {
  
  // get the data from food plan ingredient records table 
  try{
    const response = await fetch("/weekly_dashboard/api/get_weekly_dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({'week_no' : weekNo, 'food_plan_id': foodPlanId})
    });

    const data = await response.json();//console.log("returned data :", data);
    if (!response.ok) {
      error.textContent = data.error || "Something went wrong while fetch checking for user food plan.";
      return;
    }

    const dashDataList = data.data;
    console.log("data is :", dashDataList);

    const totalMeals = new Set(dashDataList
        .map(row => row.food_plan_meal_id)
        .filter(id => id !== undefined && id !== null)
    ).size;

    const totalItems = new Set(dashDataList
        .map( row => row.food_plan_recipe_id)
        .filter(id => id !== undefined && id !== null)
    ).size

    const totalRecipes = new Set(dashDataList
        .map(r => r.recipe_id)
        .filter(id => id !== undefined && id !== null)
    ).size

    const totalIngredients = new Set(dashDataList
        .map(r => r.ingredient_id)
        .filter(id => id !== undefined && id !== null)
    ).size

    console.log("total meals :", totalMeals);
    console.log("total items :", totalItems);
    console.log("total recipes :", totalRecipes);



  } catch (err){
      error.textContent = err.message;
  }
})