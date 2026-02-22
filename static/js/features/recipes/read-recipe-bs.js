// import { isTokenValid, showConfirm, showMultiConfirm, showAlert} from "../../core/utils.js";
import { isTokenValid } from "../../core/utils.js";
import { showConfirm, showAlert } from "../../core/confirmModal.js";
import { recipePreparedDateInfo } from "../dishes/helpers/dish_utils.js";

const token = localStorage.getItem("access_token"); //console.log(token)
const decoded = parseJwt(token); // console.log("decoded : ",decoded);
const loggedInUserId = parseInt(decoded ? decoded.sub : null); //console.log("user _id: ",loggedInUserId)
const recipeId = window.location.pathname.split("/").pop(); //console.log("Recipe ID from Flask:", recipeId);
let dish_data = {};

// validate token
if (!isTokenValid(token)) {
  setTimeout(() => {
    window.location.href = "/auth/login";
  }, 10);
} else {
  loadRecipeDetails();
}

function parseJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload); // decode base64
    return JSON.parse(payload);
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}

// safely for XSS attack/ html injection
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

//load the data of recipe from the db to html page
async function loadRecipeDetails() {
  try {
    const res = await fetch(`/recipes/api/recipe/${recipeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to load recipe details");
    }

    const data = await res.json(); // console.log("data from backend: ", data);
    const recipe = data.recipe; //console.log("recipe data is: ",recipe);
    const ingredients = data.ingredients; //console.log("ingredients data is :", ingredients);
    const steps = data.steps;
    const recipeOwnerId = recipe.user_id; //console.log(" recipe user id : ", recipe_user_id)
    const isOwner = loggedInUserId === recipeOwnerId; //console.log("isOwner:", isOwner);

    if (true) {
      dish_data["recipe_id"] = recipe.recipe_id;
      dish_data["recipe_name"] = recipe.name;
      dish_data["portion_size"] = recipe.portion_size;
      dish_data["recipe_by"] = recipe.user_id;
    }

    // Title + Meta + Description
    document.getElementById("recipeName").textContent = escapeHtml(recipe.name);
    document.getElementById("portionSize").innerHTML = escapeHtml(recipe.portion_size);
    document.getElementById("description").innerHTML = escapeHtml(recipe.description);

    // Show Buttons - check logged in user and recipe owner same or not and show BUTTONS accordingly (toggle switch + buttons)
    const actionsEl = document.getElementById("ownerButtons");
    if (isOwner) {
      // console.log("Rendering privacy and buttons for owner...");
      actionsEl.innerHTML = `
        <div class="dish-created-wrapper">
          <button id="dish-created-btn" class="btn btn-success">Dish Created Now</button>
          <div id="dish-created-info" class="mt-2"></div>
        </div>

        <div id="recipe-buttons" class="">
          <button id="edit-recipe-btn" class="btn btn-primary me-2">Edit Recipe</button>
          <button id="delete-recipe-btn" class="btn btn-danger">Delete Recipe</button>
        </div>
      `;

      const privacyButton = document.getElementById("privacyButton");
      privacyButton.innerHTML = `
        <div class="col-lg-6 text-end pe-2">
          <label id="privacy-label" for="privacy-toggle" class="col-form-check-label fs-4 fw-semibold">Privacy:</label>
        </div>
        <div class="col-lg-6 form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            role="switch"
            id="privacy-toggle"
            ${recipe.privacy === "private" ? "checked" : ""}
          />
        </div>
      `;

      // Bind toggle logic only when toggle exists
      const privacyToggle = document.getElementById("privacy-toggle");
      const privacyLabel = document.getElementById("privacy-label");

      // Privacy toggle eventlistener
      privacyToggle.addEventListener("change", async () => {
        const newPrivacy = privacyToggle.checked ? "private" : "public"; //console.log("Privacy changed to:", newPrivacy);
        privacyLabel.textContent = newPrivacy.charAt(0).toUpperCase() + newPrivacy.slice(1);

        try {
          const response = await fetch(`/recipes/api/update-privacy/${recipeId}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ privacy: newPrivacy }),
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
    } else {
      actionsEl.innerHTML = `
        <span><strong>By:</strong> ${recipe.username}</span>
      `;
    }

    // If "dished created" button available/visible then show last dish created info
    if (document.getElementById("dish-created-info")) {
      // add data below dish created button if old record found then show details
      try {
        const response = await fetch(`/dishes/api/last_record/${recipeId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }); //console.log("response is :" , response);

        const data = await response.json(); //console.log("last record data:", data);
        if (response.ok) {
          const createdDate = data.date_prepared;
          const createdTime = data.time_prepared;

          if (createdDate !== "" && createdTime !== "") {
            let createDishBtnPressed = false;
            const display_text = `Last ${recipePreparedDateInfo(createdDate, createdTime, createDishBtnPressed)}`;
            document.getElementById("dish-created-info").textContent = display_text;
          }
        }
      } catch (err) {
        console.error("Error while fetching last record of dish created:", err);
        showAlert("Error while fetching last record of dish created", true);
      }
    }

    // Ingredients Table
    const tbody = document.querySelector("#recipeList tbody");
    tbody.innerHTML = "";

    // Get unique component_display_order values
    const uniqueComponents = [
      ...new Set(ingredients.map((item) => item.component_display_order)),
    ].sort((a, b) => a - b);

    // Iterate through each component_display_order
    const dish_data_components = [];
    uniqueComponents.forEach((order) => {
      // Get the component_text for the first item of this component_display_order
      const component = ingredients.find((item) => item.component_display_order === order);
      const componentText = component.component_text ? component.component_text.trim() : "";
      // attached for dish_data
      const dish_component = {};
      dish_component["component_text"] = componentText;
      dish_component["display_order"] = order;

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
        .filter((item) => item.component_display_order === order)
        .sort((a, b) => a.ingredient_display_order - b.ingredient_display_order);

      const dish_data_ingredients = [];
      // Create ingredient rows for this component
      componentIngredients.forEach((i) => {
        const ingredientRow = document.createElement("tr");
        ingredientRow.dataset.ingredientSource = i.ingredient_source;
        ingredientRow.dataset.ingredientBy = i.ingredient_by;
        let ingName = i.name;
        if (i.ingredient_by !== null && i.ingredient_by != loggedInUserId) {
          ingredientRow.style.backgroundColor = "#d9f2e6"; // light green
          ingName = `<span>${ingName}</span><span> *</span>`;
        } else {
          ingName = `<span>${ingName}</span>`;
        }

        ingredientRow.innerHTML = `
          <td style="background-color: inherit;">${ingName}</td>
          <td style="background-color: inherit;">${i.quantity}</td>
          <td style="background-color: inherit;">${i.unit_name}</td>
          <td class="ingredient-price" style="background-color: inherit;">${Number(i.price).toFixed(4)}</td>
          <td style="background-color: inherit;">${parseFloat(i.base_quantity)}</td>
          <td style="background-color: inherit;">${i.unit}</td>
          <td style="background-color: inherit;">${Number(i.cost).toFixed(2)}</td>
        `;

        //attach for dish_data
        const dish_ingredient = {};
        dish_ingredient["base_price"] = parseFloat(i.cost);
        dish_ingredient["ingredient_id"] = parseInt(i.ingredient_id);
        dish_ingredient["name"] = i.name;
        dish_ingredient["ingredient_source"] = i.ingredient_source;
        dish_ingredient["cost"] = parseFloat(i.price);
        dish_ingredient["quantity"] = parseFloat(i.quantity);
        dish_ingredient["base_unit"] = i.unit;
        dish_ingredient["unit_id"] = i.unit_id;
        dish_ingredient["unit_name"] = i.unit_name;
        dish_ingredient["display_order"] = i.ingredient_display_order;

        tbody.appendChild(ingredientRow);
        dish_data_ingredients.push(dish_ingredient);
      });
      dish_component["ingredients"] = dish_data_ingredients;
      dish_data_components.push(dish_component);
    });
    dish_data["components"] = dish_data_components;

    updateTotalRecipeCost(); // get total cost of recipe. //console.log("dish data is :", dish_data);

    // Steps
    const stepsTbody = document.querySelector("#stepsTable tbody");
    stepsTbody.innerHTML = "";
    if (steps.length > 0) {
      steps.forEach((step) => {
        const stepRow = document.createElement("tr");
        stepRow.innerHTML = `
          <td class="text-end" style="background-color: inherit;">${step.step_order}</td>
          <td style="background-color: inherit;">${escapeHtml(step.step_text)}</td>
        `;

        stepsTbody.append(stepRow);
      });
    } else {
      const noStepsRow = document.createElement("tr");
      noStepsRow.innerHTML = `
      <td colspan="2" class="text-center py-4 text-muted fst-italic">
        No Steps Given
      </td>
      `;
      stepsTbody.append(noStepsRow);
    }
  } catch (err) {
    document.getElementById("error").textContent = err.message;
  }
}

// calculate the total cost of recipe
function updateTotalRecipeCost() {
  const priceCells = document.querySelectorAll(".ingredient-price");
  let total = 0;

  priceCells.forEach((cell) => {
    const value = parseFloat(cell.textContent.replace(/,/g, "")) || 0;
    total += value;
  });
  dish_data["total_cost"] = total;
  const totalCostEl = document.getElementById("totalCost");
  if (totalCostEl) {
    totalCostEl.textContent = `${total.toFixed(2).replace(/\.00$/, "")}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", async function (e) {
    // Edit button
    if (e.target.id === "edit-recipe-btn" || e.target.closest("#edit-recipe-btn")) {
      e.preventDefault();
      window.location.href = `/recipes/edit/${recipeId}`;
    }

    // Delete button
    if (e.target.id === "delete-recipe-btn" || e.target.closest("#delete-recipe-btn")) {
      e.preventDefault();

      //use custom modal - showConfirm(message, buttonName for OK)
      const confirmed = await showConfirm("Are you sure you want to delete this recipe?", `Delete`);
      if (!confirmed) return;

      try {
        const response = await fetch(`/recipes/api/delete_recipe/${recipeId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json(); //console.log("data is : ", data);

        if (response.ok) {
          showAlert(data.message || "Recipe deleted successfully!");
          setTimeout(() => {
            window.location.href = "/recipes";
          }, 2500);
        } else {
          showAlert(data.error || "Failed to delete recipe.", true);
        }
      } catch (err) {
        console.error("Error deleting recipe:", err);
        showAlert("Something went wrong.", true);
      }
    }

    // Dish created button
    if (e.target.id === "dish-created-btn" || e.target.closest("#dish-created-btn")) {
      e.preventDefault();

      const overlay = document.getElementById("wizard-overlay");
      const modal = new bootstrap.Modal(overlay);
      const mealSelect = document.getElementById("mealSelect");
      const dateInput = document.getElementById("dateInput");
      const timeInput = document.getElementById("timeInput");
      const commentInput = document.getElementById("commentInput");
      let currentStep = 1;

      function resetWizard() {
        // dish_data = {};
        mealSelect.value = "";
        dateInput.value = "";
        timeInput.value = "";
        commentInput.value = "";
        showStep(1);

        const nextBtn = overlay.querySelector('[data-step="1"] .next');
        if (nextBtn) nextBtn.disabled = true;
      }

      // show step
      function showStep(step) {
        const steps = overlay.querySelectorAll(".step");
        currentStep = step;
        steps.forEach((s) => s.classList.add("d-none"));
        const active = overlay.querySelector(`.step[data-step="${step}"]`);
        if (active) active.classList.remove("d-none");
      }

      resetWizard();
      modal.show();

      // meal select event listener
      mealSelect.addEventListener("change", () => {
        const nextBtn = overlay.querySelector('[data-step="1"] .next');
        nextBtn.disabled = mealSelect.value === "";
        dish_data.meal = mealSelect.value;
      });

      // click buttons on modal listener for create dish
      overlay.addEventListener("click", async (e) => {
        const btn = e.target;

        // cancel button
        if (btn.classList.contains("cancel")) {
          modal.hide();
          resetWizard();
          return;
        }

        // back button
        if (btn.classList.contains("back")) {
          showStep(currentStep - 1);
          return;
        }

        // next button
        if (btn.classList.contains("next")) {
          if (currentStep === 2) {
            const now = new Date();
            dish_data.preparation_date = dateInput.value || now.toISOString().split("T")[0];
            dish_data.time_prepared =
              timeInput.value ||
              now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          }
          showStep(currentStep + 1);
          return;
        }

        // save button
        if (btn.classList.contains("save")) {
          dish_data.comment = commentInput.value;

          try {
            const response = await fetch(`/dishes/api/`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(dish_data),
            });

            const data = await response.json();

            if (response.ok) {
              const text = recipePreparedDateInfo(data.date_prepared, data.time_prepared, true);
              setTimeout(() => {
                document.getElementById("dish-created-info").textContent = text;
              }, 300);
            } else {
              showAlert(data.error || "Failed to create dish.", true);
            }
          } catch {
            showAlert("Something went wrong.", true);
          }

          modal.hide();
          resetWizard();
        }
      });
    }
  });

  // tab click on ingredients and steps
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".nav-link");
    if (!link) return;

    const tabName = link.dataset.tab;
    if (!tabName) return;

    // Remove active from all links
    document
      .querySelectorAll(".recipe-tabs .nav-link")
      .forEach((l) => l.classList.remove("active"));

    // Add active to clicked
    link.classList.add("active");

    // // Show selected tab content, hide others
    // document.querySelectorAll(".tab-page > div").forEach((tabContent) => {
    //   tabContent.style.display =
    //     tabContent.id === `${tabName}-tab` ? "block" : "none";
    // });

    const ingredientsTab = document.getElementById("ingredients-tab");
    const stepsTab = document.getElementById("steps-tab");
    if (link.classList.contains("ingredient-tabs")) {
      ingredientsTab.style.display = "block";
      stepsTab.style.display = "none";
    }
    if (link.classList.contains("step-tabs")) {
      ingredientsTab.style.display = "none";
      stepsTab.style.display = "block";
    }
  });
});
