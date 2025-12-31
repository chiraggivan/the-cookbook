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
let foodPlanId;

const newPlanBtn = document.getElementById("plan-btn");
const weekOne = document.getElementById("week-1");
const errorBox = document.getElementById("error");

// get food plan of the user
async function getUserFoodPlan(){
  // const plan_id = foodPlanId;
  try{
    const response = await fetch("/food_plans/api/plan", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();//
    console.log("plan data : ", data);
    const weeks = data.plan.food_plan;
    if (!Array.isArray(weeks)){
      errorBox.textContent = "food plan not an array";
      return;
    }

    const sortedWeeks = [...weeks].sort((a, b) => a.week_no - b.week_no);
    
    sortedWeeks.forEach(week => {      
      const days = week.weekly_meals;
      const sortedDays = [...days].sort((a, b) => a.day_no - b.day_no);

      sortedDays.forEach(day =>{
        if (day.day_no !== 1) return;
        let dayHTML =``;

        const meals = day.daily_meals;        
        meals.forEach(meal =>{
          dayHTML += `<div class="meal-type"><strong>${meal.meal_type}</strong></div>`;

          const recipes = meal.recipes;
          recipes.forEach(recipe =>{
            const name = truncateName(recipe.recipe_name);
            dayHTML += `<div class="recipe-row">
                          <span class="recipe-name">${name}</span>
                          <span class="recipe-cost">£${recipe.cost}</span>
                        </div>`
          })
        })    
        document.getElementById("d11").innerHTML = dayHTML;
      })
    })

    if (!response.ok) {
      errorBox.textContent = data.error || "Something went wrong while fetch food plan for user.";
      return;
    }
  } catch (err){
    errorBox.textContent = err.message;
  }
}

function truncateName(name, max = 18) {
  return name.length > max
    ? name.slice(0, 15) + "..."
    : name;
}

// Initialize page functionality on load
document.addEventListener("DOMContentLoaded", async function () {
  
  try{
    const response = await fetch("/food_plans/api/check-user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();//console.log("returned data :", data);
    if (!response.ok) {
      errorBox.textContent = data.error || "Something went wrong while fetch new-recipe.";
      return;
    }

    if(data.userExist){
      newPlanBtn.style.display = 'none';
      weekOne.style.display = 'flex';
      foodPlanId = data.plan_id;
      getUserFoodPlan();
    } else{
      newPlanBtn.style.display = 'flex';
      weekOne.style.display = 'none';
    } 
  } catch (err){
      errorBox.textContent = err.message;
  }

  // On Button click, create a new food_plan in food_plans table and store the food_plan_id in a variable
  newPlanBtn.addEventListener("click", async () => {
    try{
      const response = await fetch(`/food_plans/api/`,{
        method:"GET",
        headers:{
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json();
      if (!response.ok) {
        errorBox.textContent = data.error || "Something went wrong while creating new food plan.";
        // console.log("Submitted data (for debug):", data.submitted_data);
        return;
      }
      console.log(data);
      foodPlanId = data.plan_id;
      console.log(data.plan_id);
      // Display success message and redirect
      showAlert(data.message || "Food Plan created successfully!");//console.log("submitted data: ", data)
      //errorBox.textContent = data.message || "Recipe created successfully!";
      setTimeout(() => { 
        newPlanBtn.style.display = 'none';
        weekOne.style.display = 'flex';
        }, 1500);
    }catch (err){
      errorBox.textContent = err.message;
    }
  })

})
