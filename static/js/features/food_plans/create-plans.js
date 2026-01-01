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

const newPlanBtn = document.getElementById("plan-btn");
const weekOne = document.getElementById("week-1");
const dayBoxes = weekOne.querySelectorAll(".day-box");
const errorBox = document.getElementById("error");

let foodPlanData = null;
let foodPlanId = null;
let modalDayData = null;
let food_plan_id;

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
    foodPlanData = data.plan.food_plan;
    foodPlanId = Number(data.plan.food_plan_id);

    const weeks = foodPlanData;

    if (!Array.isArray(weeks)){
      errorBox.textContent = "food plan not an array";
      return;
    }

    const sortedWeeks = [...weeks].sort((a, b) => a.week_no - b.week_no);
    
    sortedWeeks.forEach(week => {   
      const food_plan_week_id = week.food_plan_week_id;
      if (week.week_no !== 1) return;   
      let modal_week_id = '';
      modal_week_id +=`week-${week.week_no}-`;
      const days = week.weekly_meals;
      const sortedDays = [...days].sort((a, b) => a.day_no - b.day_no);

      sortedDays.forEach(day =>{
        // if (day.day_no !== 1) return;
        const food_plan_day_id = day.food_plan_day_id;
        let modal_day_id ='';
        modal_day_id += `${modal_week_id}day-${day.day_no}`
        let dayHTML =``;
        const meals = day.daily_meals;  

        meals.forEach(meal =>{
          const food_plan_meal_id = meal.food_plan_meal_id;
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
        
        const dayBox = document.getElementById(modal_day_id);
        if (!dayBox) return;

        dayBox.dataset.week = week.week_no;
        dayBox.dataset.day = day.day_no;
        dayBox.dataset.foodPlanWeekId = food_plan_week_id;
        dayBox.dataset.foodPlanDayId = food_plan_day_id;

        dayBox.innerHTML = dayHTML;
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

// Convert long text to short one with dots at the end. eg:  Creamy Butter Garlic mushroom - to - Creamy Butter Garlic Mus...
function truncateName(name, max = 18) {
  return name.length > max
    ? name.slice(0, 15) + "..."
    : name;
}

// get the week and day number from the id 
function getWeekAndDayNumber(id) {
  const parts = id.split("-");
  return {
    week: Number(parts[1]),
    day: Number(parts[3])
  };
}

// get the day data to be rendered for modal 
function getDayData(weekNo, dayNo) {
  if (!foodPlanData) return null;

  const week = foodPlanData.find(w => w.week_no === weekNo);
  if (!week) return null;

  const day = week.weekly_meals.find(d => d.day_no === dayNo);
  if (!day) return null;

  // attach week id for convenience
  day.food_plan_week_id = week.food_plan_week_id;

  return day;
}

// render day data on modal 
function renderModalMeals(dayData) {
  const container = document.getElementById("modal-meal-list");
  if (!container) return;

  container.innerHTML = "";

  if (!dayData) return;

  dayData.daily_meals.forEach(meal => {
    let mealHTML = `
      <div class="modal-meal">
        <div class="meal-type"><strong>${meal.meal_type}</strong></div>
    `;

    meal.recipes.forEach(recipe => {
      const name = truncateName(recipe.recipe_name);

      mealHTML += `
        <div class="recipe-row" data-recipe-id="${recipe.recipe_id}" data-meal-type="${meal.meal_type}">
          <span class="recipe-name">${name}</span>

          <span class="recipe-actions">
            <span class="recipe-cost">£${recipe.cost}</span>
            <span class="recipe-delete" title="Remove recipe">X</span>
          </span>
        </div>
      `;
    });

    mealHTML += `</div>`;
    container.innerHTML += mealHTML;
  });
}

// Open modal on screan
function openMealModal(weekNo, dayNo, isOldData) {
  const modal = document.getElementById("meal-modal");
  modal.querySelector(".modal-header h3").textContent = `Week ${weekNo} — Day ${dayNo}`;

  //get day data
  if(isOldData){
    const dayData = getDayData(weekNo, dayNo);
    console.log("Modal day data:", dayData);

    // create a clone
    modalDayData = structuredClone(dayData);

    //store context for later use
    modal.dataset.foodPlanId = foodPlanId;
    modal.dataset.weekId = dayData.food_plan_week_id;
    modal.dataset.dayId = dayData.food_plan_day_id;
    modal.dataset.weekNo = weekNo;
    modal.dataset.dayNo = dayNo;

    // render day data
    renderModalMeals(dayData);
  } else {
    const dayData = null;
    renderModalMeals(dayData);
  }

  modal.style.display = "flex";
}

// build payload to send the data to backend
function buildFoodPlanPayload(modal) {
  const weekNo = Number(modal.dataset.weekNo);
  const dayNo = Number(modal.dataset.dayNo);

  const weekId = modal.dataset.weekId ? Number(modal.dataset.weekId) : null;
  const dayId = modal.dataset.dayId ? Number(modal.dataset.dayId) : null;

  const week = foodPlanData.find(w => w.week_no === weekNo);
  const day = week.weekly_meals.find(d => d.day_no === dayNo);

  const dailyMeals = day.daily_meals.map(meal => {
    const mealObj = {
      meal_type: meal.meal_type,
      recipes: meal.recipes.map((recipe, index) => ({
        recipe_id: recipe.recipe_id,
        display_order: index + 1
      }))
    };

    // attach only if exists
    if (meal.food_plan_meal_id) {
      mealObj.food_plan_meal_id = meal.food_plan_meal_id;
    }

    return mealObj;
  });

  const dayObj = {
    day_no: day.day_no,
    daily_meals: dailyMeals
  };

  if (dayId) {
    dayObj.food_plan_day_id = dayId;
  }

  const weekObj = {
    week_no: week.week_no,
    weekly_meals: [dayObj]
  };

  if (weekId) {
    weekObj.food_plan_week_id = weekId;
  }

  return {
    food_plan_id: foodPlanId,
    food_plan: [weekObj]
  };
}

//update Recipe from Modal
function removeRecipeFromModal(recipeId, mealType) {
  const meal = modalDayData.daily_meals.find(
    m => m.meal_type === mealType
  );
  if (!meal) return;

  meal.recipes = meal.recipes.filter(
    r => r.recipe_id !== recipeId
  );

  if (meal.recipes.length === 0) {
    modalDayData.daily_meals = modalDayData.daily_meals.filter(
      m => m.meal_type !== mealType
    );
  }

  renderModalMeals(modalDayData);
}

// final save button function
function commitModalChanges() {
  const modal = document.getElementById("meal-modal");
  const weekNo = Number(modal.dataset.weekNo);
  const dayNo = Number(modal.dataset.dayNo);

  const week = foodPlanData.find(w => w.week_no === weekNo);
  const index = week.weekly_meals.findIndex(d => d.day_no === dayNo);

  week.weekly_meals[index] = modalDayData;

  modalDayData = null;
  modal.style.display = "none";
}

// Initialize page functionality on load
document.addEventListener("DOMContentLoaded", async function () {
  
  // initial check if user already has food_plan everytime the page loads
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
      errorBox.textContent = data.error || "Something went wrong while fetch checking for user food plan.";
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

  // open modal by clicking on one of the day.
  dayBoxes.forEach(dayBox => {
    dayBox.addEventListener("click", () => {
      let weekNo = null;
      let dayNo = null;
      let isOldData = null;
      if(dayBox.dataset.week){
        weekNo = Number(dayBox.dataset.week);
        dayNo = Number(dayBox.dataset.day);
        isOldData = true;
      }else{
        const WeeknDay = getWeekAndDayNumber(dayBox.id);
        weekNo = WeeknDay.week;
        dayNo = WeeknDay.day;
        isOldData = false;
      }
      console.log("is old data : ", isOldData);
      openMealModal(weekNo, dayNo, isOldData);
    });
  });

  // close button on the modal on top right
  document.querySelector(".close-btn").addEventListener("click", () => {
    document.getElementById("meal-modal").style.display = "none";
  });

  // remove recipe from the list of plans
  document.getElementById("modal-meal-list").addEventListener("click", e => {
    if (e.target.classList.contains("recipe-delete")) {
      // e.target.closest(".recipe-row").remove();
      const row = e.target.closest(".recipe-row");
      const recipeId = Number(row.dataset.recipeId);
      const mealType = row.dataset.mealType;

      removeRecipeFromModal(recipeId, mealType);
    }
  });

  // clicking cancel button
  document.querySelector(".btn-secondary").addEventListener("click", () => {
    modalDayData = null;
    document.getElementById("meal-modal").style.display = "none";
  });

  // save button pressed
  document.querySelector(".btn-primary").addEventListener("click", () => {
    const modal = document.getElementById("meal-modal");

    commitModalChanges();

    const payload = buildFoodPlanPayload(modal);
    console.log("Payload to send:", payload);

    // later:
    // sendPayloadToAPI(payload);
  });  

})
