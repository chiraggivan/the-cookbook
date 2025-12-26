import { isTokenValid, showConfirm, showMultiConfirm, showAlert} from "../../core/utils.js"; 


const token = localStorage.getItem("access_token");//console.log(token)
const decoded = parseJwt(token); // console.log("decoded : ",decoded);
const loggedInUserId = parseInt(decoded ? decoded.sub : null); //console.log("user _id: ",loggedInUserId)
const dishId = window.location.pathname.split("/").pop();

// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
} else {
  loadDishDetails();
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
async function loadDishDetails() {
  try {
    const res = await fetch(`/dishes/api/dish/${dishId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error("Failed to load dish details");
    }

    const data = await res.json(); // 
    console.log("data from backend: ", data);
    const dish = data.dish;
    const dish_ingredients = data.dish_details;
    const recipeOwnerId = dish.recipe_by; //console.log(" recipe user id : ", recipe_user_id)
    const isOwner = (loggedInUserId === recipeOwnerId); //console.log("isOwner:", isOwner);

    // Title + Meta + Description
    document.getElementById("recipe-name").textContent = dish.recipe_name;

    document.getElementById("recipe-meta").innerHTML = `
      <strong>Portion Size:</strong> ${dish.portion_size}
    `;

    document.getElementById("recipe-description").innerHTML = `
      <strong>Comment :</strong> ${dish.comment}
    `;
    
    const totalCostEl = document.getElementById("recipe-total-cost");
    totalCostEl.textContent = `Total Cost: £${dish.total_cost.toFixed(2).replace(/\.00$/, "")}`;

    // Show Buttons - check logged in user and recipe owner same or not and show BUTTONS accordingly (toggle switch + buttons)
    const actionsEl = document.getElementById("recipe-actions");
    // if (isOwner) {  //console.log("Rendering privacy toggle for owner...");
    //   document.getElementById('recipe-buttons').style.display = 'block';
    //   actionsEl.innerHTML = `
    //     <span id="privacy-actions" style="display: inline-flex; align-items: center; gap: 0.5rem;">
    //       <span id="privacy-label">${recipe.privacy === "private" ? "Private" : "Private"}</span>
    //       <label class="switch">
    //         <input type="checkbox" id="privacy-toggle" ${recipe.privacy === "private" ? "checked" : ""}>
    //         <span class="slider round"></span>
    //       </label>
    //     </span>
    //   `;

    //   // Bind toggle logic only when toggle exists
    //   const privacyToggle = document.getElementById("privacy-toggle");
    //   const privacyLabel = document.getElementById("privacy-label");

    //   privacyToggle.addEventListener("change", async () => {
    //     const newPrivacy = privacyToggle.checked ? "private" : "public";  //console.log("Privacy changed to:", newPrivacy);
    //     //privacyLabel.textContent = newPrivacy.charAt(0).toUpperCase() + newPrivacy.slice(1);
        
    //     try {
    //       const response = await fetch(`/recipes/api/update-privacy/${recipeId}`, {
    //         method: "PUT",
    //         headers: {
    //           "Authorization": `Bearer ${token}`,
    //           "Content-Type": "application/json"
    //         },
    //         body: JSON.stringify({ privacy: newPrivacy })
    //       });
    //       const result = await response.json(); //console.log("privacy update response:", result);

    //       if (!response.ok) {
    //         showAlert(result.error || "Failed to update privacy.", true);
    //       } else {
    //         //showAlert(result.message || "Privacy updated successfully!");
    //       }
    //     } catch (err) {
    //       //console.error("Error updating privacy:", err);
    //       showAlert("Something went really wrong.", true);
    //     }
    //   });
    // } 
    // else { //console.log("Rendering 'By' section for viewer...");
    //   document.getElementById('recipe-buttons').style.display = 'none';
    //   actionsEl.innerHTML = `
    //     <span><strong>By:</strong> ${recipe.username}</span>
    //   `;
    // }

    // Ingredients Table
    const tbody = document.querySelector("#ingredients-table tbody");
    tbody.innerHTML = "";

    // Get unique component_display_order values
    const uniqueComponents = [...new Set(dish_ingredients.map(item => item.component_display_order))].sort((a, b) => a - b);

    // Iterate through each component_display_order
    uniqueComponents.forEach(order => {
      // Get the component_text for the first item of this component_display_order
      const component = dish_ingredients.find(item => item.component_display_order === order);
      const componentText = component.component_text ? component.component_text.trim() : "";
      
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
      const componentIngredients = dish_ingredients
        .filter(item => item.component_display_order === order)
        .sort((a, b) => a.ingredient_display_order - b.ingredient_display_order);

      // Create ingredient rows for this component
      componentIngredients.forEach(i => {
        const ingredientRow = document.createElement("tr");
        ingredientRow.innerHTML = `
          <td>${i.ingredient_name}</td>
          <td>${i.quantity}</td>
          <td>${i.unit_name}</td>
          <td class="ingredient-price">${Number(i.cost).toFixed(4)}</td>
          <td>${Number(1)}</td>
          <td>${i.base_unit}</td>
          <td>${Number(i.base_price).toFixed(2)}</td>
        `;

        tbody.appendChild(ingredientRow);
      });
    });
      
    // updateTotalRecipeCost(); // get total cost of recipe. //console.log("dish data is :", dish_data);    

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
  
  const totalCostEl = document.getElementById("recipe-total-cost");
  if (totalCostEl) {
    totalCostEl.textContent = `Total Cost: £${total.toFixed(2).replace(/\.00$/, "")}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {


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
});



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

// const dishCreatedBtn = document.getElementById("dish-created-btn"); 
//   dishCreatedBtn.addEventListener("click", async () => {
//     try {
//       const response = await fetch(`/dishes/api/`,{
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${token}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify(dish_data)
//       }); //console.log("response is :" , response);
      
//       const data = await response.json(); //console.log("data received :",data);
//       if (response.ok) {
//         const createdDate = data.date_prepared; 
//         const createdTime = data.time_prepared;

//         if(createdDate !== "" && createdTime !== ""){
//           let createDishBtnPressed = true;
//           addInfoBelowCreateDish(createdDate, createdTime, createDishBtnPressed);
//         }
//       } else {
//         showAlert(data.error || "Failed to create dish.", true);
//       }
//     } catch(err){
//       showAlert("Something went wrong.", true);
//     }
//   });




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
// // }



//   const editBtn = document.getElementById("edit-recipe-btn");
//   editBtn.addEventListener("click", async () => {
//     try{
//       window.location.href = `/recipes/edit/${recipeId}`;          
//     } catch(err) {

//     }
//   });