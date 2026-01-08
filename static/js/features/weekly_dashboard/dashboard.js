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

    const completeData = data.data;
    console.log("data is :", completeData);
    const aggData = completeData.aggData;
    const mealCostData = completeData.mealCostList;
    const dayCostData = completeData.dayCostList;
    const ingCostData = completeData.ingredientCostList;
   
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
    const dayLabels = dayCostData.map(r => r.day_no);
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
      tdQty.textContent = item.quantity;
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

  } catch (err){
      error.textContent = err.message;
  }
})