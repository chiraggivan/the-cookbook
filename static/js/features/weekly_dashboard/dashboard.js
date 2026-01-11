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
    const data = await response.json();// console.log("returned data :", data);
    if (!response.ok) {
      error.textContent = data.error || "Something went wrong while fetch checking for user food plan.";
      return;
    }

    if(data.data == 'none'){
      error.textContent = "No Data Available for Analysis";
      return;
    }
    document.getElementById("dashboard").style.display = 'block';
    const completeData = data.data;
    console.log("data is :", completeData);
    const aggData = completeData.aggData;
    const mealCostData = completeData.mealCostList;
    const dayCostData = completeData.dayCostList;
    const ingCostData = completeData.ingredientCostList;
    const recipeCostData = completeData.recipeCostList;
    const weeklyData = completeData.weeklyData;
   
    document.getElementById("kpi-total-meals").textContent = aggData.total_meals;
    document.getElementById("kpi-total-recipes").textContent = aggData.total_recipes;
    document.getElementById("kpi-total-ingredients").textContent = aggData.total_ingredients;
    document.getElementById("kpi-cost").textContent = `£${aggData.cost}`;

    // create pie chart for meals cost
    const mealLabels = mealCostData.map(r => r.meal_type);
    const mealValues = mealCostData.map(r => r.meal_cost);
    
    const ctx = document.getElementById('mealCostPie');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: mealLabels,
        datasets: [{
          data: mealValues,
          backgroundColor: [
            '#3b82f6', // dinner
            '#22c55e', // lunch
            '#f97316'  // breakfast
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false   // we made our own legend
          }
        }
      }
    });

    // create bar chart for days cost
    const dayLabels = dayCostData.map(r => getDayName(r.day_no).slice(0,1));
    const dayValues = dayCostData.map(r => r.day_cost);
    const ctb = document.getElementById('dayCostBar');
    new Chart(ctb, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          data: dayValues,
          backgroundColor: [
            '#3b82f6', // dinner
            '#22c55e', // lunch
            '#f97316'  // breakfast
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false   // we made our own legend
          }
        }
      }
    });

    // shopping list table for week
    const tbody = document.querySelector("#shoppingTable tbody");
    tbody.innerHTML = ""; // clear if needed
    ingCostData.forEach((item, index) => {
      const tr = document.createElement("tr");

      // Sr No.
      const tdIndex = document.createElement("td");
      tdIndex.textContent = index + 1;
      tr.appendChild(tdIndex);

      // Ingredient Name
      const tdName = document.createElement("td");
      tdName.textContent = item.name;
      tr.appendChild(tdName);

      // Quantity
      const tdQty = document.createElement("td");
      if(item.easy_quantity == 'nothing'){
        tdQty.textContent = item.quantity;
      }else{
        tdQty.textContent = item.easy_quantity;
      }
      
      tr.appendChild(tdQty);

      // Cost
      const tdCost = document.createElement("td");
      tdCost.textContent = item.cost.toFixed(2); // format to 2 decimals
      tr.appendChild(tdCost);

      // Base Price / Unit
      const tdBase = document.createElement("td");
      tdBase.textContent = `£${item.ingredient_cost.toFixed(2)}/${item.base_unit}`;
      tr.appendChild(tdBase);

      tbody.appendChild(tr);
    });

    // weekly time table (weekly meal plan)
    const container = document.getElementById("weeklyPlan");
    weeklyData.forEach(day => {
      const dayBlock = document.createElement("div");
      dayBlock.className = "day-block";

      // Day name (left)
      const dayInfo = document.createElement("div");
      dayInfo.className = "day-info";

      const dayName = document.createElement("div");
      dayName.className = "day-name";
      dayName.textContent = day.name.slice(0,3);

      // Day cost
      // const dayCost = document.createElement("div");
      // dayCost.className = "day-cost";
      // if(day.cost != 0){
      //   dayCost.textContent = `£${day.cost.toFixed(2)}`;
      // }
  
      dayInfo.appendChild(dayName);
      // dayInfo.appendChild(dayCost);

      dayBlock.appendChild(dayInfo);

      // Meals wrapper (RIGHT SIDE)
      const mealsWrapper = document.createElement("div");
      mealsWrapper.className = "meals-wrapper";

      day.meals.forEach(meal => {
        // 🔹 NEW: meal row wrapper
        const mealRow = document.createElement("div");
        mealRow.className = "meal-row";

        // Meal label
        const label = document.createElement("div");
        label.className = "meal-label";
        label.textContent =
          meal.name.charAt(0).toUpperCase() + meal.name.slice(1);

        // Recipes
        const recipesCell = document.createElement("div");
        recipesCell.className = "meal-recipes";

        if (meal.recipes.length === 0) {
          recipesCell.textContent = "—";
        } else {
          meal.recipes.forEach(r => {
            const pill = document.createElement("span");
            pill.className = "recipe-pill";
            pill.textContent = r;
            recipesCell.appendChild(pill);
          });
        }

        // Meal cost (right side)
        const costCell = document.createElement("div");
        costCell.className = "meal-cost";

        if (meal.cost && meal.cost > 0) {
          costCell.textContent = `£${meal.cost.toFixed(2)}`;
        } else {
          costCell.textContent = ""; // keep blank
        }

        // Correct grouping
        mealRow.appendChild(label);
        mealRow.appendChild(recipesCell);
        mealRow.appendChild(costCell);

        mealsWrapper.appendChild(mealRow);
      });

      dayBlock.appendChild(mealsWrapper);
      container.appendChild(dayBlock);
    });

    // recipe list with cost (recipe cost breakdown)
    const tableBody = document.querySelector("#recipeCostTable tbody");
    tableBody.innerHTML = "";
    if (!Array.isArray(recipeCostData) || recipeCostData.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td colspan="3" style="text-align:center; color:#6b7280;">
          No recipe cost data available
        </td>
      `;
      tableBody.appendChild(row);
    } else {
      recipeCostData.forEach((recipe, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${recipe.name}</td>
          <td class ="recipe-cost">£${Number(recipe.recipe_cost).toFixed(2)}</td>
        `;

        tableBody.appendChild(row);
      });
    }

  } catch (err){
      error.textContent = err.message;
  }
})