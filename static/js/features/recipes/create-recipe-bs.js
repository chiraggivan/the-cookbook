import { isTokenValid } from "../../core/utils.js";
import { showConfirm, showAlert } from "../../core/confirmModal.js";
import { showMultiConfirm } from "./helpers-bs/delete_component_modal.js";
import { initializeIngredientRow } from "./helpers-bs/ingredient_helpers.js";
import { getEmptyComponentRow } from "./helpers-bs/component_helpers.js";
import { updateTotalRecipeCost } from "./helpers-bs/recipe_utils.js";
import {
  initializeStepRow,
  updateSerialNo,
  updateStepMoveButtons,
} from "./helpers-bs/step_helpers.js";
import {
  attachRowListeners,
  updateMoveButtons,
} from "./helpers-bs/UI-animation_helpers.js";
import {
  validateRecipeForm,
  validateIngredientRows,
} from "./helpers-bs/validation_helpers.js";

const token = localStorage.getItem("access_token"); //console.log("token is :", token);

// validate token
if (!isTokenValid(token)) {
  setTimeout(() => {
    window.location.href = "/auth/login";
  }, 10);
}

// Initialize page functionality on load
document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("ingredients-tbody");
  const stepTbody = document.getElementById("steps-tbody");
  const addFirstComponentBtn = document.getElementById(
    `add-first-component-btn`,
  );
  const addComponentBtn = document.getElementById(`add-component-btn`);
  const myModal = new bootstrap.Modal(document.getElementById("global-modal"));

  // Initialize existing ingredient rows
  tbody.querySelectorAll("tr.ingredient-row").forEach((row, index) => {
    initializeIngredientRow(row, token);
  });

  // Initialize existing step rows
  stepTbody.querySelectorAll("tr").forEach((row, index) => {
    initializeStepRow(row);
  });

  // component buttons to add the heading for the ingredient list
  [addFirstComponentBtn, addComponentBtn].forEach((button) =>
    button.addEventListener("click", function () {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      // Depending on the button, place it on the top or at the bottom
      if (button == addFirstComponentBtn) {
        // tbody.prepend(tr);
        const tr = rows[0];
        addFirstComponentBtn.style.display = "none";
        tr.style.display = "table-row";
      } else if (button == addComponentBtn) {
        const index = rows.length;
        // Create the component row
        const tr = document.createElement("tr");
        tr.classList.add("component-row");
        tr.innerHTML = getEmptyComponentRow(index);
        tbody.appendChild(tr);
        addComponentBtn.style.display = "none";
        attachRowListeners(tr);
        updateMoveButtons();
      }
    }),
  );

  // remove-button logic for ingredients
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("remove-ingredient-btn")) {
      const row = e.target.closest("tr");
      const recipeIngredientId = row.dataset.recipeIngredientId;
      const ingredientName = row.querySelector(
        'input[name^="ingredient_name_"]',
      ).value;

      // Freeze current height so we can animate nicely
      row.style.height = row.offsetHeight + "px";
      // Force reflow — required for smooth animation
      void row.offsetHeight;

      // If ingredient name is empty and recipeIngredientId NOT there for the row, remove row immediately
      if (!ingredientName && !recipeIngredientId) {
        // Add fade out class for animation
        row.classList.add("row-fade-out");
        setTimeout(() => {
          row.remove();
          updateMoveButtons();
          updateTotalRecipeCost();
        }, 400);
        return;
      }

      // If ingredient name is empty and recipeIngredientId is there for the row, update the row with removed as true
      if (!ingredientName && recipeIngredientId) {
        // Add fade out class for animation
        row.classList.add("row-fade-out");
        setTimeout(() => {
          row.dataset.removed = "true";
          row.style.display = "none";
          updateMoveButtons();
          updateTotalRecipeCost();
        }, 400);
        return;
      }

      // Ask for confirmation using the modal
      const confirmed = await showConfirm(
        `Remove ${ingredientName}?`,
        `Delete`,
      );

      if (!confirmed) return; // user cancelled

      // Add fade out class for animation as user dint cancel BUT accepted to remove
      row.classList.add("row-fade-out");
      if (recipeIngredientId) {
        // Mark the row as removed
        setTimeout(() => {
          row.dataset.removed = "true";
          row.style.display = "none";
          updateMoveButtons();
          updateTotalRecipeCost();
        }, 400);
      } else {
        // New ingredient row → remove from DOM

        setTimeout(() => {
          row.remove();
          updateMoveButtons();
          updateTotalRecipeCost();
        }, 400);
      }
    }
  });

  // remove-button logic for components
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("remove-component-btn")) {
      const currentRow = e.target.closest("tr");
      const tbody = document.getElementById("ingredients-tbody");
      const rows = Array.from(tbody.querySelectorAll("tr")).filter(
        (row) => row.dataset.removed !== "true",
      );
      const currentRowIndex = rows.indexOf(currentRow); //
      const componentName = currentRow.querySelector(
        'input[name^="component_text_"]',
      ).value;
      const prevRow = rows[currentRowIndex - 1];

      // If current component index is 0 i.e. very first at the top component then display:none and addFirstComponentBtn display:block
      if (currentRowIndex == 0) {
        const firstCellInput = rows[0].querySelector("td input");
        if (firstCellInput) firstCellInput.value = "";
        rows[0].style.display = "none";
        addFirstComponentBtn.style.display = "block";
        return;
      }

      // component text is empty and if recipeComponentId DOESNT exist then remove tr
      if (!componentName && !rows[currentRowIndex].dataset.recipeComponentId) {
        if (rows[currentRowIndex + 1]) {
          prevRow.remove();
        } else {
          addComponentBtn.style.display = "inline-block";
        }
        currentRow.remove();
        return;
      }

      // Ask for confirmation using the modal - showMultiConfirm(message, buttonA = null, buttonB = null)
      const modalMessage = `<div class="mb-2 fs-4"> Remove "${componentName ? componentName : "Heading"}" along with its ingredient?</div>
                            <small>Option A : Remove Heading along with its ingredients.</small></br>
                            <small>Option B : Remove Heading only.</small>`;

      const confirmed = await showMultiConfirm(`${modalMessage}`);

      // component text present and if recipeComponentId DOESNT exist
      if (componentName && !rows[currentRowIndex].dataset.recipeComponentId) {
        if (confirmed === "component") {
          currentRow.remove();
          //document.getElementById(`add-first-component-btn`).style.display="block";
          if (currentRowIndex > 0) {
            prevRow.remove();
          }
        } else if (confirmed === "with-ingredients") {
          let nextIndex = currentRowIndex + 1;
          while (
            rows[nextIndex] &&
            !rows[nextIndex].classList.contains("component-row")
          ) {
            const nextRow = rows[nextIndex];
            nextRow.remove();
            nextIndex++;
          }
          currentRow.remove();
        } else {
          return;
        }
      }

      // if row created thru data fetched from db i.e. recipeComponentId exist
      if (rows[currentRowIndex].dataset.recipeComponentId) {
        if (confirmed === "component") {
          currentRow.dataset.removed = "true";
          currentRow.style.display = "none";
          //document.getElementById(`add-first-component-btn`).style.display="block";
          if (currentRowIndex > 0) {
            prevRow.remove();
          }
        } else if (confirmed === "with-ingredients") {
          let nextIndex = currentRowIndex + 1;
          while (
            rows[nextIndex] &&
            !rows[nextIndex].classList.contains("component-row")
          ) {
            const nextRow = rows[nextIndex];
            if (nextRow.dataset.recipeIngredientId) {
              nextRow.dataset.removed = "true";
              nextRow.style.display = "none";
            } else {
              nextRow.remove();
            }
            nextIndex++;
          }
          currentRow.dataset.removed = "true";
          currentRow.style.display = "none";
        } else {
          return;
        }
      }

      // Recalculate total cost if needed
      updateTotalRecipeCost();
    }
  });

  // remove-button logic for steps
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("remove-step-btn")) {
      const row = e.target.closest("tr");
      let stepText = row.querySelector('textarea[name^="recipe_step_"]').value;
      const stepNo = row.querySelector(".step-no").textContent;

      // Freeze current height so we can animate nicely
      row.style.height = row.offsetHeight + "px";
      // Force reflow — required for smooth animation
      void row.offsetHeight;

      // If ingredient name is empty and recipeIngredientId NOT there for the row, remove row immediately
      if (!stepText) {
        // Add fade out class for animation
        row.classList.add("row-fade-out");
        setTimeout(() => {
          row.remove();
          updateStepMoveButtons();
          updateSerialNo();
        }, 400);
        return;
      }

      // Ask for confirmation using the modal
      const confirmed = await showConfirm(
        `Remove Step ${stepNo}: ${stepText} ?`,
        `Delete`,
      );

      if (!confirmed) return; // user cancelled

      // Add fade out class for animation as user dint cancel BUT accepted to remove
      row.classList.add("row-fade-out");
      setTimeout(() => {
        row.remove();
        updateStepMoveButtons();
        updateSerialNo();
      }, 400);
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

  // up/down arrow logic for ingredients rows
  document.addEventListener("click", (event) => {
    // move up button pressed
    if (event.target.classList.contains("move-ing-up-btn")) {
      const row = event.target.closest("tr");
      let prev = row.previousElementSibling;

      while (prev) {
        // if previous row is an ingredient (has remove-ingredient-btn)
        if (prev.querySelector(".remove-ingredient-btn")) {
          row.parentNode.insertBefore(row, prev);
          break;
        }
        // otherwise skip components etc.
        prev = prev.previousElementSibling;
      }
    }

    // move down button pressed
    if (event.target.classList.contains("move-ing-down-btn")) {
      const row = event.target.closest("tr");
      let next = row.nextElementSibling;

      while (next) {
        const ing = next.querySelector(".remove-ingredient-btn");
        const comp = next.querySelector(".remove-component-btn");
        if (ing && window.getComputedStyle(ing).display !== "none") {
          row.parentNode.insertBefore(next, row);
          break;
        } else if (comp) {
          row.parentNode.insertBefore(next, row);
          break;
        }

        row.parentNode.insertBefore(next, row);
        // doing the below twice as the 'next' row will the same row that we are moving down as
        // above line we have already swapped once but we now need to compare it with the row below the current row
        next = next.nextElementSibling;
        next = next.nextElementSibling;
      }
    }

    //call updateMoveButtons
    updateMoveButtons();
  });

  // up/down arrow logic for STEPS rows
  document.addEventListener("click", (event) => {
    // move up button pressed
    if (event.target.classList.contains("move-step-up-btn")) {
      const row = event.target.closest("tr");
      let prev = row.previousElementSibling;
      row.parentNode.insertBefore(row, prev);
    }

    // move down button pressed
    if (event.target.classList.contains("move-step-down-btn")) {
      const row = event.target.closest("tr");
      let next = row.nextElementSibling;
      row.parentNode.insertBefore(next, row);
    }
    updateStepMoveButtons();
    updateSerialNo();
  });

  // submitting changes of recipe Save BUTTON
  document
    .getElementById("save-recipe-btn")
    .addEventListener("click", async () => {
      let completeRecipeData = {};
      const errorBox = document.getElementById(`error`);
      errorBox.textContent = "";
      // Validating all sections of the form. First with RECIPE table data
      const recipeData = validateRecipeForm();
      if (!recipeData) {
        errorBox.textContent =
          "Check all the fields. One or more errors found.";
        return;
      }
      // validating Ingredients(table) with the recipe of the form
      const componentsData = validateIngredientRows();
      if (componentsData.hasError) {
        return;
      }

      const createRecipeData = {};
      createRecipeData.name = recipeData.name;
      createRecipeData.portion_size = recipeData.portion_size;
      createRecipeData.description = recipeData.description;
      createRecipeData.privacy = recipeData.privacy;
      createRecipeData.components = componentsData.ingredientsData;
      createRecipeData.steps = [];
      console.log("final data to be sent :", createRecipeData);
      // return;
      try {
        const response = await fetch("/recipes/api/new-recipe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(createRecipeData),
        });
        const data = await response.json(); // console.log("After fetch command for update-recipe", response)

        if (!response.ok) {
          errorBox.textContent =
            data.error ||
            "Something went wrong while doing api fetch for update-recipe.";
          console.log("Submitted data (for debug):", data.submitted_data);
          return;
        }

        // Display success message and redirect
        showAlert(data.message || "Recipe updated successfully!");
        const recipeId = data.recipe_id;
        setTimeout(() => {
          window.location.href = `/recipes/details/${recipeId}`;
        }, 1000);
      } catch (err) {
        console.log("error is :", err.message);
        errorBox.textContent = err.message;
      }
    });
});
