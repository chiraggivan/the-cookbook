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
let user = 'free'

const newPlanBtn = document.getElementById("plan-btn");
const weekOne = document.getElementById("week-1");
const weekTwo = document.getElementById("week-2");
const weekThree = document.getElementById("week-3");
// const weekFour = document.getElementById("week-4");
const dayBoxes = document.querySelectorAll(".week-row .day-box");
const mealType = document.getElementById("meal-type");
const suggestionBox = document.getElementById("recipe-suggestion-box");
const errorBox = document.getElementById("error");

errorBox.textContent = '';

let foodPlanData = null; // whole food plan data of the user
let foodPlanId = null; // food_plan_id of the user
let modalDayData = null; // food plan of the particular day selected and shown in modal
let food_plan_id;

// get day name from day no
function getDayName (dayNo){
  if(dayNo == 1) return "Monday"
  if(dayNo == 2) return "Tuesday"
  if(dayNo == 3) return "Wednesday"
  if(dayNo == 4) return "Thursday"
  if(dayNo == 5) return "Friday"
  if(dayNo == 6) return "Saturday"
  if(dayNo == 7) return "Sunday"
  else return "Day"
}

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

    const data = await response.json(); //console.log("plan data : ", data);
    foodPlanData = data.food_plan;
    console.log("foodPlanData :", data);
    foodPlanId = Number(data.food_plan_id);

    const weeks = foodPlanData;

    if (!Array.isArray(weeks)){
      errorBox.textContent = "food plan not an array";
      return;
    }

    const sortedWeeks = [...weeks].sort((a, b) => a.week_no - b.week_no);
    
    sortedWeeks.forEach(week => {   
      const food_plan_week_id = week.food_plan_week_id;
      // if (week.week_no !== 1) return;                                     // need to remove this line for multiple weeks
      const weekNumber = `w${week.week_no}`
      const weekSelected = document.getElementById(weekNumber);
      weekSelected.dataset.weekNo = week.week_no;
      weekSelected.dataset.foodPlanId = foodPlanId;
      
      let modal_week_id = '';
      modal_week_id +=`week-${week.week_no}-`;
      const days = week.weekly_meals;
      const sortedDays = [...days].sort((a, b) => a.day_no - b.day_no);

      sortedDays.forEach(day =>{
        // if (day.day_no !== 1) return;
        const food_plan_day_id = day.food_plan_day_id;
        let modal_day_id ='';
        modal_day_id += `${modal_week_id}day-${day.day_no}`;
        let dayHTML =`${getDayName(day.day_no)}`;
        const meals = day.daily_meals;  
        const meal_order = ["breakfast", "lunch", "dinner"]
        const sortedMeals = [...meals].sort((a,b) => {
          return meal_order.indexOf(a.meal_type) - meal_order.indexOf(b.meal_type);
        })

        sortedMeals.forEach(meal =>{
          const food_plan_meal_id = meal.food_plan_meal_id;
          dayHTML += `<div class="meal-type"><strong>${meal.meal_type}</strong></div>`;         

          const recipes = meal.recipes;
          recipes.forEach(recipe =>{
            const name = truncateName(recipe.recipe_name);
            dayHTML += `<div class="recipe-row">
                          <a class="day-recipe-name" href="/recipes/details/${recipe.recipe_id}" onclick="event.stopPropagation()">${name}</a>
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
  return (name.length > max ? name.slice(0, 15) + "..." : name);
}

// get the week and day number from the id 
function getWeekAndDayNumber(id) {
  const parts = id.split("-");
  return {
    week: Number(parts[1]),
    day: Number(parts[3])
  };
}

// Open modal on screan
function openMealModal(weekNo, dayNo, isOldData, dayBox) {
  console.log("entered openMealModal");
  const modal = document.getElementById("meal-modal");
  modal.querySelector(".modal-header h3").textContent = `Week ${weekNo} — Day ${dayNo}`;

  //get day data
  if(isOldData){
    const dayData = getDayData(weekNo, dayNo); //console.log("Modal day data:", dayData);

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
    modalDayData = {};
    //check if dataset has food_plan_week_id and food_plan_day_id
    if(dayBox.dataset.foodPlanWeekId){
      modalDayData.food_plan_week_id = dayBox.dataset.foodPlanWeekId; 
    }
    if(dayBox.dataset.foodPlanDayId){
      modalDayData.food_plan_day_id = dayBox.dataset.foodPlanDayId; 
    }
    modalDayData.day_no = dayNo;
    modalDayData.week_no = weekNo;
    modalDayData.daily_meals = [];

    modal.dataset.foodPlanId = foodPlanId;
    modal.dataset.weekNo = weekNo;
    modal.dataset.dayNo = dayNo;
    modal.removeAttribute("data-day-id");
    modal.removeAttribute("data-week-id");

    // console.log("Modal day data:", modalDayData);
    const dayData = null;
    renderModalMeals(modalDayData);
  }

  modal.style.display = "flex";
}

// get the day data to be rendered for modal 
function getDayData(weekNo, dayNo) {
  if (!foodPlanData) return null;

  const week = foodPlanData.find(w => w.week_no === weekNo);
  if (!week) return null;

  const day = week.weekly_meals.find(d => d.day_no === dayNo);
  if (!day) return null;

  // attach week id for convenience
  day.food_plan_week_id = week.food_plan_week_id; //console.log(" day data from getDayData", day);
  day.week_no = weekNo;
  day.day_no = dayNo;
  return day;
}

// render day data on modal 
function renderModalMeals(dayData) {
  const container = document.getElementById("modal-meal-list");
  if (!container) return;

  if (dayData.daily_meals.length === 0) return;

  container.innerHTML = "";

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
  // console.log("modalDayData.daily_meals", modalDayData.daily_meals);
  if (modalDayData.daily_meals.length === 0){
    document.getElementById("modal-meal-list").innerHTML = '<p class="placeholder-text">Selected meals will appear here</p>';
  }
  renderModalMeals(modalDayData);
}

// final save button function
function commitModalChanges() {
  const modal = document.getElementById("meal-modal");
  const weekNo = Number(modal.dataset.weekNo);
  const dayNo = Number(modal.dataset.dayNo);
  
  // console.log("foodPlanData is :", foodPlanData);
  if (!foodPlanData){
    foodPlanData = []
  }
  let week = foodPlanData.find(w => w.week_no === weekNo);
  
  if (!week) {
    week = {
      week_no: weekNo,
      weekly_meals: []
    };
    foodPlanData.push(week);
  }

  //Find day inside week
  const dayIndex = week.weekly_meals.findIndex(
    d => d.day_no === dayNo
  );
  
  //Update or create day
  delete modalDayData.week_no; //modalDayData may contain week_no as well. Even if it doesnt this line wont throw error.
  delete modalDayData.food_plan_week_id; // These data wont make much difference but as they are not required to be pushed in daily_meals

  if (dayIndex !== -1) {
    week.weekly_meals[dayIndex] = modalDayData;
  } else {
    week.weekly_meals.push(modalDayData);
  }
  
  modalDayData = null;
  modal.style.display = "none";
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
        display_order: index + 1,
        ...(recipe.food_plan_recipe_id && {food_plan_recipe_id: recipe.food_plan_recipe_id})
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

// send payload to api display message of success of failure
async function sendPayloadToAPI(payload){
  try{
    const response = await fetch("/food_plans/api/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();//console.log("returned data :", data);
    if (!response.ok) {
      errorBox.textContent = data.error || "Something went wrong while updating for user food plan.";
      return;
    }else{
      showAlert(data.message || "Plan updated successfully!");
      console.log("dashboard_data :", data.dashboard_data);
      setTimeout(() => { window.location.href = "/plans"; }, 500);
      fetch("/weekly_dashboard/api/save_day_recipes_details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data.dashboard_data)
      }).catch(err => {
          console.error("Background fetch failed:", err);
        });
    }    
  } catch (err){
      errorBox.textContent = err.message;
  }
}

//---------------------------------- below deals with modal recipe input, like selecting, highlighting recipe
// Highlight suggestion item
function highlightItem(items, idx) {
    items.forEach((item, i) => item.style.background = i === idx ? "#ddd" : "");
    if (idx >= 0) items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Select an recipe and populate in plan on right side of the modal
function selectRecipe(recipe) {
  const mealType = document.getElementById("meal-type").value;

  if (!mealType) {
    document.getElementById('modal-error').textContent = "Please select a meal type";
    return;
  }

  //Find meal object (breakfast / lunch / dinner)
  let mealObj = modalDayData.daily_meals.find(
    meal => meal.meal_type === mealType
  );

  //If meal does not exist yet, create it
  if (!mealObj) {
    mealObj = {
      meal_type: mealType,
      recipes: []
    };
    modalDayData.daily_meals.push(mealObj);
  }

  //Prevent duplicate recipe in the same meal
  const alreadyExists = mealObj.recipes.some(
    r => r.recipe_id === recipe.recipe_id
  );

  if (alreadyExists) {
    alert("Recipe already added to this meal");
    return;
  }

  //Calculate display order
  const displayOrder = mealObj.recipes.length + 1;

  //Add NEW recipe (NO food_plan_recipe_id)
  mealObj.recipes.push({
    recipe_id: recipe.recipe_id,
    recipe_name: recipe.recipe_name,
    cost: recipe.price,          // comes from API
    display_order: displayOrder
  });

  //UI cleanup
  document.getElementById("recipe-search").value = "";
  suggestionBox.style.display = "none";

  //Re-render UI
  renderModalMeals(modalDayData);
}

//----------------------------------- above deals with modal recipe input, like selecting, highlighting recipe




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
      if(user == 'paid'){
        weekTwo.style.display = 'flex';
        weekThree.style.display = 'flex';
      }
      foodPlanId = data.plan_id;
      getUserFoodPlan();
    } else{
      newPlanBtn.style.display = 'flex';
      weekOne.style.display = 'none';
      weekTwo.style.display = 'none';
      weekThree.style.display = 'nones'
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
      // Display success message and redirect
      showAlert(data.message || "Food Plan created successfully!");//console.log("submitted data: ", data)
      //errorBox.textContent = data.message || "Recipe created successfully!";
      setTimeout(() => { 
        newPlanBtn.style.display = 'none';
        weekOne.style.display = 'flex';
        }, 1000);
    }catch (err){
      errorBox.textContent = err.message;
    }
  })

  // open weekly dashboard by clicking "week 1" box
  document.addEventListener("click", (e) => {
    const weekBox = e.target.closest(".week-box");
    if (!weekBox) return;

    const rawWeekNo = weekBox.dataset.weekNo;
    const rawFoodPlanId = weekBox.dataset.foodPlanId;
    if (!rawWeekNo || !rawFoodPlanId) {
      return;
    }
    const weekId = parseInt(rawWeekNo, 10);
    window.location.href = `/weekly_dashboard/${rawFoodPlanId}/${weekId}`;
  });

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
      openMealModal(weekNo, dayNo, isOldData, dayBox);
    });
  });

  // close button on the modal on top right
  document.querySelector(".close-btn").addEventListener("click", () => {
    document.getElementById("meal-modal").style.display = "none";
    document.getElementById("recipe-search").value = "";
    document.getElementById("recipe-suggestion-box").style.display = "none";
  });

  // getting all the recipes for search when typed in input box
  document.getElementById("recipe-search").addEventListener("input", async function () {
    const query = this.value.trim().toLowerCase();
    let activeIndex = -1;
    // Clear suggestions and hide box
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";

    // Fetch ingredient suggestions from API
    if (query.length > 1){
        try {
        const res = await fetch(`/food_plans/api/recipes/search?q=${encodeURIComponent(query)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error("Failed to fetch ingredients");

        const data = await res.json(); // console.log(" list of recipes :", data);
        // return;

        // Hide suggestions if no results
        if (data.length === 0) {
          suggestionBox.style.display = "none";
          return;
        }

        // Display suggestion items
        data.forEach(recipe => {
          const div = document.createElement("div");
          div.dataset.id = recipe.recipe_id;
          div.dataset.cost = recipe.price;
          div.classList.add("modal-suggestion-item");
          div.innerHTML = `
            <div class="modal-recipe-name">${recipe.recipe_name}</div>
            <div class="modal-recipe-portion">${recipe.portion_size ? `Portion size: ${recipe.portion_size}` : ""}</div>
          `;
          
          div.addEventListener("click", () => selectRecipe(recipe));
          suggestionBox.appendChild(div);
        });

        suggestionBox.style.display = "block";
        
        // Highlight the first suggestion if available
        suggestionBox.style.display = "block";
        activeIndex = data.length > 0 ? 0 : -1;
        const items = suggestionBox.querySelectorAll(".suggestion-item");
        if (items.length > 0) {
          highlightItem(items, activeIndex);
        }

      } catch (err) {
        console.error("Error fetching ingredients:", err);
      }
    }
  })

  //selecting meal makes error disappear
  document.getElementById("meal-type").addEventListener("click", () => {
    if(mealType.value != ''){
      document.getElementById("modal-error").textContent = '';
    }
  })

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
    // modalDayData = null;
    document.getElementById("meal-modal").style.display = "none";
    document.getElementById("recipe-search").value = "";
    document.getElementById("recipe-suggestion-box").style.display = "none";
  });

  // save button pressed
  document.querySelector(".btn-primary").addEventListener("click", () => {
    const modal = document.getElementById("meal-modal");

    commitModalChanges();
    
    const payload = buildFoodPlanPayload(modal); // console.log("Payload to send:", payload);
    // return;

    // call api and send the payload
    sendPayloadToAPI(payload);
  });  

})
