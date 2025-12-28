import { isTokenValid, showConfirm, showMultiConfirm, showAlert} from "../../core/utils.js"; 
import { recipePreparedDateInfo } from "../dishes/helpers/dish_utils.js"

const token = localStorage.getItem("access_token");//console.log(token)
const decoded = parseJwt(token); // console.log("decoded : ",decoded);
const loggedInUserId = parseInt(decoded ? decoded.sub : null); //console.log("user _id: ",loggedInUserId)
const recipeId = window.location.pathname.split("/").pop(); //console.log("Recipe ID from Flask:", recipeId);
const dish_data = {} // variable for sending json to dish created button

// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
} else {
  loadRecipeDetails();
}

function parseJwt(token) {
    try {
        const base64Payload = token.split('.')[1]; 
        const payload = atob(base64Payload);  // decode base64
        return JSON.parse(payload);
    } catch (e) {
        console.error("Invalid token", e);
        return null;
    }
}

//load the data of recipe from the db to html page
async function loadRecipeDetails() {
  try {
    const res = await fetch(`/recipes/api/recipe/${recipeId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error("Failed to load recipe details");
    }

    const data = await res.json(); // console.log("data from backend: ", data);
    const recipe = data.recipe; //console.log("recipe data is: ",recipe);
    const ingredients = data.ingredients; //console.log("ingredients data is :", ingredients);
    const steps = data.steps;
    const recipeOwnerId = recipe.user_id; //console.log(" recipe user id : ", recipe_user_id)
    const isOwner = (loggedInUserId === recipeOwnerId); //console.log("isOwner:", isOwner);

    // data for dishes created  
    if (true) { 
      const createdAt = new Date();  // Convert string to Date object
      const dateOnly = createdAt.toLocaleDateString('en-GB');  // "24/12/2025" (UK format)
      const timeOnly = createdAt.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      dish_data['recipe_id'] = recipe.recipe_id;
      dish_data['recipe_name'] = recipe.name;
      dish_data['portion_size'] = recipe.portion_size;
      // dish_data['preparation_date'] = dateOnly;
      // dish_data['time_prepared'] = timeOnly;
      // dish_data['meal'] = 'lunch';
      dish_data['recipe_by'] = recipe.user_id;
      dish_data['comment'] = '';
    }
    // Title + Meta + Description
    document.getElementById("recipe-name").textContent = recipe.name;

    document.getElementById("recipe-meta").innerHTML = `
      <strong>Portion Size:</strong> ${recipe.portion_size}
    `;

    document.getElementById("recipe-description").innerHTML = `
      <strong>Description:</strong> ${recipe.description}
    `;
    
    // Show Buttons - check logged in user and recipe owner same or not and show BUTTONS accordingly (toggle switch + buttons)
    const actionsEl = document.getElementById("recipe-actions");
    if (isOwner) {  //console.log("Rendering privacy toggle for owner...");
      document.getElementById('recipe-buttons').style.display = 'block';
      actionsEl.innerHTML = `
        <span id="privacy-actions" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <span id="privacy-label">${recipe.privacy === "private" ? "Private" : "Private"}</span>
          <label class="switch">
            <input type="checkbox" id="privacy-toggle" ${recipe.privacy === "private" ? "checked" : ""}>
            <span class="slider round"></span>
          </label>
        </span>
      `;

      // Bind toggle logic only when toggle exists
      const privacyToggle = document.getElementById("privacy-toggle");
      const privacyLabel = document.getElementById("privacy-label");

      privacyToggle.addEventListener("change", async () => {
        const newPrivacy = privacyToggle.checked ? "private" : "public";  //console.log("Privacy changed to:", newPrivacy);
        //privacyLabel.textContent = newPrivacy.charAt(0).toUpperCase() + newPrivacy.slice(1);
        
        try {
          const response = await fetch(`/recipes/api/update-privacy/${recipeId}`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ privacy: newPrivacy })
          });
          const result = await response.json(); //console.log("privacy update response:", result);

          if (!response.ok) {
            showAlert(result.error || "Failed to update privacy.", true);
          } else {
            //showAlert(result.message || "Privacy updated successfully!");
          }
        } catch (err) {
          //console.error("Error updating privacy:", err);
          showAlert("Something went really wrong.", true);
        }
      });
    } 
    else { //console.log("Rendering 'By' section for viewer...");
      document.getElementById('recipe-buttons').style.display = 'none';
      actionsEl.innerHTML = `
        <span><strong>By:</strong> ${recipe.username}</span>
      `;
    }
    
    // add data below dish created button if old record found then show details
    try {
      const response = await fetch(`/dishes/api/last_record/${recipeId}`,{
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }); //console.log("response is :" , response);
      
      const data = await response.json()//console.log("last record data:", data);
      if (response.ok) {
        const createdDate = data.date_prepared; 
        const createdTime = data.time_prepared;
        
        if(createdDate !== "" && createdTime !== ""){
          let createDishBtnPressed = false;
          const display_text = `Last ${recipePreparedDateInfo(createdDate, createdTime, createDishBtnPressed)}`;
          document.getElementById("dish-created-info").textContent = display_text;
        }
      }
    } catch(err){
      console.error("Error while fetching last record of dish created:", err);
      showAlert("Error while fetching last record of dish created", true);
    }

    // Ingredients Table
    const tbody = document.querySelector("#ingredients-table tbody");
    tbody.innerHTML = "";

    // Get unique component_display_order values
    const uniqueComponents = [...new Set(ingredients.map(item => item.component_display_order))].sort((a, b) => a - b);

    // Iterate through each component_display_order
    const dish_data_components = []
    uniqueComponents.forEach(order => {
      // Get the component_text for the first item of this component_display_order
      const component = ingredients.find(item => item.component_display_order === order);
      const componentText = component.component_text ? component.component_text.trim() : "";
      // attached for dish_data
      const dish_component = {};
      dish_component['component_text'] = componentText;
      dish_component['display_order'] = order;

      // Only create a component row if component_text is non-empty
      if (componentText) {
        const componentRow = document.createElement("tr");
        componentRow.classList.add("component-row");
        componentRow.innerHTML = `
          <td colspan="7" style="background-color:#f2f2f2; font-weight:bold;">
            ${componentText}
          </td>
        `;
        tbody.appendChild(componentRow);
      }

      // Filter and sort ingredients for this component_display_order
      const componentIngredients = ingredients
        .filter(item => item.component_display_order === order)
        .sort((a, b) => a.ingredient_display_order - b.ingredient_display_order);

      const dish_data_ingredients = [];
      // Create ingredient rows for this component
      componentIngredients.forEach(i => {
        const ingredientRow = document.createElement("tr");
        ingredientRow.innerHTML = `
          <td>${i.name}</td>
          <td>${i.quantity}</td>
          <td>${i.unit_name}</td>
          <td class="ingredient-price">${Number(i.price).toFixed(4)}</td>
          <td>${Number(1)}</td>
          <td>${i.unit}</td>
          <td>${Number(i.cost).toFixed(2)}</td>
        `;

        //attach for dish_data
        const dish_ingredient = {};
        dish_ingredient['base_price'] = parseFloat(i.cost);
        dish_ingredient['ingredient_id'] = parseInt(i.ingredient_id);
        dish_ingredient['name'] = i.name;
        dish_ingredient['cost'] = parseFloat(i.price);
        dish_ingredient['quantity'] = parseFloat(i.quantity);
        dish_ingredient['base_unit'] = i.unit;
        dish_ingredient['unit_id'] = i.unit_id;
        dish_ingredient['unit_name'] = i.unit_name;
        dish_ingredient['display_order'] = i.ingredient_display_order;

        tbody.appendChild(ingredientRow);
        dish_data_ingredients.push(dish_ingredient);
      });
      dish_component['ingredients'] = dish_data_ingredients;
      dish_data_components.push(dish_component);
    });
    dish_data['components'] = dish_data_components
      
    updateTotalRecipeCost(); // get total cost of recipe. //console.log("dish data is :", dish_data);

    // Steps (numbered list)
    const stepsContainer = document.getElementById("steps-container");
    stepsContainer.innerHTML = "";
    if (steps.length > 0) {
      const stepsTitle = document.createElement("h2");
      stepsTitle.textContent = "Steps";
      stepsContainer.appendChild(stepsTitle);

      const ol = document.createElement("ol");
      steps.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s.step_text;
        ol.appendChild(li);
      });
      stepsContainer.appendChild(ol);
    }

  } catch (err) {
    document.getElementById("error").textContent = err.message;
  }
}

// calculate the total cost of recipe 
function updateTotalRecipeCost() {
  const priceCells = document.querySelectorAll(".ingredient-price");
  let total = 0;

  priceCells.forEach(cell => {
    const value = parseFloat(cell.textContent.replace(/,/g, "")) || 0;
    total += value;
  });
  dish_data['total_cost'] = total;
  const totalCostEl = document.getElementById("recipe-total-cost");
  if (totalCostEl) {
    totalCostEl.textContent = `Total Cost: £${total.toFixed(2).replace(/\.00$/, "")}`;
  }
}




document.addEventListener("DOMContentLoaded", () => {
  const editBtn = document.getElementById("edit-recipe-btn");
  editBtn.addEventListener("click", async () => {
    try{
      window.location.href = `/recipes/edit/${recipeId}`;          
    } catch(err) {

    }
  });

  const deleteBtn = document.getElementById("delete-recipe-btn");
  deleteBtn.addEventListener("click", async () => {
    //use custom modal confirm instead of native confirm
    const confirmed = await showConfirm("Are you sure you want to delete this recipe?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/recipes/api/delete_recipe/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json(); //console.log("data is : ", data);

      if (response.ok) {
        showAlert(data.message || "Recipe deleted successfully!");
        setTimeout(() => { window.location.href = "/recipes"; }, 2500);
      } else {
        showAlert(data.error || "Failed to delete recipe.", true);
      }
    } catch (err) {
        console.error("Error deleting recipe:", err);
        showAlert("Something went wrong.", true);
    }
  });

  // const dishCreatedBtn = document.getElementById("dish-created-btn"); 
  // dishCreatedBtn.addEventListener("click", async () => {
  //   try {
  //     const response = await fetch(`/dishes/api/`,{
  //       method: "POST",
  //       headers: {
  //         "Authorization": `Bearer ${token}`,
  //         "Content-Type": "application/json"
  //       },
  //       body: JSON.stringify(dish_data)
  //     }); //console.log("response is :" , response);
      
  //     const data = await response.json(); //console.log("data received :",data);
  //     if (response.ok) {
  //       const createdDate = data.date_prepared; 
  //       const createdTime = data.time_prepared;

  //       if(createdDate !== "" && createdTime !== ""){
  //         let createDishBtnPressed = true;
  //         const display_text = recipePreparedDateInfo(createdDate, createdTime, createDishBtnPressed);
  //         document.getElementById("dish-created-info").textContent = display_text
  //       }
  //     } else {
  //       showAlert(data.error || "Failed to create dish.", true);
  //     }
  //   } catch(err){
  //     showAlert("Something went wrong.", true);
  //   }
  // });  
  
  const dishCreatedBtn = document.getElementById("dish-created-btn"); 
  dishCreatedBtn.addEventListener("click", async () => {

    const overlay = document.getElementById("wizard-overlay");
    const steps = document.querySelectorAll(".step");
    const mealSelect = document.getElementById("mealSelect");
    const dateInput = document.getElementById("dateInput");
    const timeInput = document.getElementById("timeInput");
    const commentInput = document.getElementById("commentInput");
    let currentStep = 1;

    // Open modal
    function openWizard() {
      overlay.classList.remove("hidden");
    }

    // Close modal
    function closeWizard() {
      overlay.classList.add("hidden");
    }

    // Show step
    function showStep(step) {
      currentStep = step;
      steps.forEach(s => s.classList.remove("active"));
      document.querySelector(`[data-step="${step}"]`).classList.add("active");
    }

    openWizard();

    // Enable Next only when meal selected
    mealSelect.addEventListener("change", () => {
      const nextBtn = overlay.querySelector('[data-step="1"] .next');
      nextBtn.disabled = mealSelect.value === "";
      dish_data['meal'] = mealSelect.value;
    });

    // Button handling
    overlay.addEventListener("click", async (e) => {
      if (e.target.classList.contains("cancel")) {
        closeWizard();
      }

      if (e.target.classList.contains("next")) {
        console.log("dish data is: ", dish_data);
        console.log("date is : ", dateInput.value);
        console.log("time is : ", timeInput.value);
        const createdAt = new Date();  // Convert string to Date object
        const dateOnly = createdAt.toISOString().split("T")[0];  // "2025-12-24" (UK format)
        const timeOnly = createdAt.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        if (dateInput.value){
          dish_data['preparation_date'] = dateInput.value;
        }else {
          dish_data['preparation_date'] = dateOnly
        }

        if (timeInput.value){
          dish_data['time_prepared'] = timeInput.value;
        }else {
          dish_data['time_prepared'] = timeOnly 
        }
        

        showStep(currentStep + 1);
      }

      if (e.target.classList.contains("back")) {
        showStep(currentStep - 1);
      }

      if (e.target.classList.contains("save")) {
        dish_data['comment'] = commentInput.value;
        try {
          const response = await fetch(`/dishes/api/`,{
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(dish_data)
          }); //console.log("response is :" , response);
          
          const data = await response.json(); //console.log("data received :",data);
          if (response.ok) {
            const createdDate = data.date_prepared; 
            const createdTime = data.time_prepared;

            if(createdDate !== "" && createdTime !== ""){
              let createDishBtnPressed = true;
              const display_text = recipePreparedDateInfo(createdDate, createdTime, createDishBtnPressed);
              document.getElementById("dish-created-info").textContent = display_text
            }
          } else {
            showAlert(data.error || "Failed to create dish.", true);
          }
        } catch(err){
          showAlert("Something went wrong.", true);
        }
        
        closeWizard();
      }
    });

  });
});



// const overlay = document.getElementById("wizard-overlay");
// const steps = document.querySelectorAll(".step");

// const mealSelect = document.getElementById("mealSelect");
// const dateInput = document.getElementById("dateInput");
// const timeInput = document.getElementById("timeInput");
// const commentInput = document.getElementById("commentInput");

// let currentStep = 1;

// // Open modal
// function openWizard() {
//   overlay.classList.remove("hidden");
//   showStep(1);

//   // Defaults
//   const now = new Date();
//   dateInput.value = now.toISOString().split("T")[0];
//   timeInput.value = now.toTimeString().slice(0,5);
// }

// // Close modal
// function closeWizard() {
//   overlay.classList.add("hidden");
// }

// // Show step
// function showStep(step) {
//   currentStep = step;
//   steps.forEach(s => s.classList.remove("active"));
//   document.querySelector(`[data-step="${step}"]`).classList.add("active");
// }

// // Enable Next only when meal selected
// mealSelect.addEventListener("change", () => {
//   const nextBtn = document.querySelector('[data-step="1"] .next');
//   nextBtn.disabled = mealSelect.value === "";
// });

// // Button handling
// overlay.addEventListener("click", (e) => {
//   if (e.target.classList.contains("cancel")) {
//     closeWizard();
//   }

//   if (e.target.classList.contains("next")) {
//     showStep(currentStep + 1);
//   }

//   if (e.target.classList.contains("back")) {
//     showStep(currentStep - 1);
//   }

//   if (e.target.classList.contains("save")) {
//     const payload = {
//       meal: mealSelect.value,
//       date: dateInput.value,
//       time: timeInput.value,
//       comment: commentInput.value
//     };

//     console.log("Saved data:", payload);
//     closeWizard();
//   }
// });


























// function isTokenExpired(token) {
//   try {
//     const payload = parseJwt(token);
//     if (!payload || !payload.exp) return true;
//     return payload.exp * 1000 < Date.now(); // true if expired
//   } catch (e) {
//     return true;
//   }
// }

// if (token && !isTokenValid(token)) {
//   loadRecipeDetails();
// } 
// else {
//   localStorage.removeItem("access_token");
//   document.getElementById("error").textContent = "Please log in to view recipe details.";
//   setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
// }



// function showAlert(message, isError = false, autoClose = true) {
//   const overlay = document.getElementById("modal-overlay");
//   const alertBox = document.getElementById("alert-box");
//   const alertMessage = document.getElementById("alert-message");
//   const alertActions = document.getElementById("alert-actions");

//   alertMessage.textContent = message;
//   alertBox.className = "alert-box" + (isError ? " error" : " success");
//   overlay.style.display = "flex";
//   alertActions.style.display = "none"; // hide OK button if autoclose

//   if (autoClose) {
//     setTimeout(() => {
//       overlay.style.display = "none";
//     }, 2000); // hide after 2s
//   } else {
//     alertActions.style.display = "block"; // show OK button
//     document.getElementById("alert-ok").onclick = () => {
//       overlay.style.display = "none";
//     };
//   }
// }

// function showConfirm(message) {
//   return new Promise((resolve) => {
//     const overlay = document.getElementById("modal-overlay");
//     const alertBox = document.getElementById("alert-box");
//     const alertMessage = document.getElementById("alert-message");
//     const alertActions = document.getElementById("alert-actions");

//     alertMessage.textContent = message;
//     alertBox.className = "alert-box";
//     overlay.style.display = "flex";

//     // Replace actions with Yes/No buttons
//     alertActions.innerHTML = `
//       <button id="confirm-yes">Yes</button>
//       <button id="confirm-no" style="background:#f44336;">No</button>
//     `;
//     alertActions.style.display = "block";

//     document.getElementById("confirm-yes").onclick = () => {
//       overlay.style.display = "none";
//       resolve(true);
//     };
//     document.getElementById("confirm-no").onclick = () => {
//       overlay.style.display = "none";
//       resolve(false);
//     };
//   });
// }
