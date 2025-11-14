import{ isTokenValid } from "../../core/utils.js";
import { validateRecipeForm } from "./helpers/validation_helpers.js"

const token = localStorage.getItem("access_token");

// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
}

// Validate ingredient table rows
function validateIngredientsForm() {
  // const tbody = document.getElementById("ingredients-tbody");
  // const rows = Array.from(tbody.querySelectorAll("tr"));
  // Get all ingredient table rows
  const rows = document.querySelectorAll("#ingredients-table tbody tr");
  const totalRows = rows.length;
  let filledRowsCount = 0;
  let compDisplayOrder = 0;
  let ingDisplayOrder = 0;
  let errorMessage = "";
  const ingredientsData = [];
  const errorBoxes = {};
  const errorCompBox ={};
  let componentInputText ="";
  let componentIndex = -1;

  // Iterate through each row
  rows.forEach((row, index) => {
    const isThisRowComponent = row.classList.contains("component-row");
    const isThisRowIngredient = row.classList.contains("ingredient-row");
    
    if(isThisRowComponent){
      const compText = row.querySelector(`input[name^="component_text_"]`);
      
      // extract the index number attached to value fields like errorName_${index}
      const match = compText.name.match(/_(\d+)$/);
      const realIndex = match ? match[1] : null;
      if (!realIndex) return;

      // Get error display elements
      errorCompBox[`errorCompText_${realIndex}`] = document.getElementById(`errorCompText_${realIndex}`);

      // Reset Error messages
      errorCompBox[`errorCompText_${realIndex}`].textContent = "";

      // Collect values from all fields of component rows
      const values = [
        compText.value.trim()
      ];

      // Check if all fields are filled
      const isAllFieldsFilled = values.every(v => v !== "");

      // Validate that partially filled rows are not allowed
      if (!isAllFieldsFilled) {
        if(compText.value.trim() == ""){errorCompBox[`errorCompText_${realIndex}`].textContent =  "Component text required" };
        errorMessage = `Check all the fields. One or more errors found.`;
      }

      //check if previous component has any ingredient. Cant be empty rows for ingredient
      if (componentIndex != -1){
        // console.log(ingredientsData[componentIndex].ingredients);
        if(ingredientsData[componentIndex].ingredients.length === 0){
          heading = ingredientsData[componentIndex].component_input_text;
          errorMessage = `Cant have empty ingredients within sub heading -${heading}-. Either remove it or add ingredients`
        };
      };

      // Process filled component
      if (isAllFieldsFilled && errorMessage == "") {
        compDisplayOrder++;
        componentIndex++;
        componentInputText = compText.value;
        const componentObj = {
          component_display_order : parseInt(compDisplayOrder),
          component_input_text : componentInputText
        };
        // Create empty list for ingredients
        componentObj.ingredients = [];

        ingredientsData.push(componentObj);
        
      };
    };

    // if row is ingredient row then check and validate its field and reset error message and display if exist
    if(isThisRowIngredient){
      // Get input and select elements for the row
      const nameInput = row.querySelector(`input[name^="ingredient_name_"]`);
      const quantityInput = row.querySelector(`input[name^="quantity_"]`);
      const unitSelect = row.querySelector(`select[name^="unit_"]`);
      const baseQtyInput = row.querySelector(`input[name^="base_quantity_"]`);
      const baseUnitInput = row.querySelector(`input[name^="base_unit_"]`);
      const basePriceInput = row.querySelector(`input[name^="base_price_"]`);

      // extract the index number attached to value fields like errorName_${index}
      const match = nameInput.name.match(/_(\d+)$/);
      const realIndex = match ? match[1] : null;
      if (!realIndex) return;
      // Get error display elements
      errorBoxes[`errorIngName_${realIndex}`] = document.getElementById(`errorIngName_${realIndex}`);
      errorBoxes[`errorQuantity_${realIndex}`] = document.getElementById(`errorQuantity_${realIndex}`);
      errorBoxes[`errorUnit_${realIndex}`] = document.getElementById(`errorUnit_${realIndex}`);
      errorBoxes[`errorBaseQuantity_${realIndex}`] = document.getElementById(`errorBaseQuantity_${realIndex}`);
      errorBoxes[`errorBaseUnit_${realIndex}`] = document.getElementById(`errorBaseUnit_${realIndex}`);
      errorBoxes[`errorBasePrice_${realIndex}`] = document.getElementById(`errorBasePrice_${realIndex}`);
      //const  = document.getElementById(`_${index}`);

      // Reset Error messages
      errorBoxes[`errorIngName_${realIndex}`].textContent =  "";
      errorBoxes[`errorQuantity_${realIndex}`].textContent =  "";
      errorBoxes[`errorUnit_${realIndex}`].textContent =  "";
      errorBoxes[`errorBaseQuantity_${realIndex}`].textContent =  "";
      errorBoxes[`errorBaseUnit_${realIndex}`].textContent =  "";
      errorBoxes[`errorBasePrice_${realIndex}`].textContent =  "";

      // Collect values from all fields
      const values = [
        nameInput.value.trim(),
        quantityInput.value.trim(),
        unitSelect.value.trim(),
        baseQtyInput.value.trim(),
        baseUnitInput.value.trim(),
        basePriceInput.value.trim()
      ];

      // //console.log("Quantity Input: ", quan)
      // Check if any field is filled
      const isAnyFieldFilled = values.some(v => v !== "");
      // Check if all fields are filled
      const isAllFieldsFilled = values.every(v => v !== "");

      // Validate that partially filled rows are not allowed
      if (isAnyFieldFilled && !isAllFieldsFilled) {
        if(nameInput.value.trim() == ""){errorBoxes[`errorIngName_${realIndex}`].textContent =  "Name required" };
        if(quantityInput.value.trim() == ""){errorBoxes[`errorQuantity_${realIndex}`].textContent =  "Quantity required" };
        if(unitSelect.value.trim() == ""){errorBoxes[`errorUnit_${realIndex}`].textContent =  "Select a Unit" };
        if(baseQtyInput.value.trim() == ""){errorBoxes[`errorBaseQuantity_${realIndex}`].textContent =  "Base quantity required" };
        if(baseUnitInput.value.trim() == ""){errorBoxes[`errorBaseUnit_${realIndex}`].textContent =  "Base Unit required" };
        if(basePriceInput.value.trim() == ""){errorBoxes[`errorBasePrice_${realIndex}`].textContent =  "Base Price required" };
        errorMessage = `Check all the fields. One or more errors found.`;
      }

      // Process fully filled rows
      if (isAllFieldsFilled) {
        filledRowsCount++;
        ingDisplayOrder++;
        const ingredientObj = {
          ingredient_id: parseInt(row.dataset.ingredientId),
          quantity: parseFloat(quantityInput.value),
          unit_id: parseInt(unitSelect.value),
          ing_display_order : ingDisplayOrder
        };

        // Include base fields only if they differ from original values
        if (parseFloat(baseQtyInput.value) != parseFloat(baseQtyInput.dataset.original) ||
            baseUnitInput.value != baseUnitInput.dataset.original ||
            parseFloat(basePriceInput.value) != parseFloat(basePriceInput.dataset.original)) {
          ingredientObj.base_quantity = parseFloat(baseQtyInput.value);
          ingredientObj.base_unit = baseUnitInput.value;
          ingredientObj.base_price = parseFloat(basePriceInput.value);
        }

        if(componentIndex == -1){
          componentIndex++;
          ingredientsData[componentIndex] = {};
          ingredientsData[componentIndex].component_display_order = 0;
          ingredientsData[componentIndex].component_input_text = "";
          ingredientsData[componentIndex].ingredients = [];
        } else {        };
        // console.log("componentIndex :", componentIndex);
        ingredientsData[componentIndex].ingredients.push(ingredientObj);
      }
    };
  });

  //check if previous component has any ingredient. Cant be empty rows for ingredient
  if (componentIndex != -1){
    // console.log(ingredientsData[componentIndex].ingredients);
    if(ingredientsData[componentIndex].ingredients.length === 0){
      heading = ingredientsData[componentIndex].component_input_text;
      errorMessage = `Cant have empty ingredients within sub heading -${heading}-. Either remove it or add ingredients`
    };
  }

  // Ensure at least two rows are fully filled
  if (!errorMessage && filledRowsCount < 2) {
    errorMessage = "At least 2 rows of ingredients must be fully filled.";
  }

  // Display error if validation fails
  if (errorMessage) {
    document.getElementById("error").textContent = errorMessage;
    return false;
  }

  // Clear error and return validated ingredient data
  document.getElementById("error").textContent = "";
  return ingredientsData;
}

// Validate and collect recipe steps
function validateStepsForm() {
  // Get all step rows
  const stepsTbody = document.getElementById("steps-tbody");
  const rows = Array.from(stepsTbody.querySelectorAll("tr"));
  const steps = [];
  let error = "";

  // Collect non-empty step descriptions
  rows.forEach((row, i) => {
    const input = row.querySelector(".step-input");
    const value = input.value.trim().replace(/\s{2,}/g, " ");
    if (value !== "") steps.push(value);
  });

  // Display error if validation fails
  if (error) {
    document.getElementById("error").textContent = error;
    return false;
  }

  // Clear error and return steps
  document.getElementById("error").textContent = "";
  return steps;
}

// Populate units dropdown for a selected ingredient
function populateUnits(row, ingredientId) {
  // Get the units dropdown element
  const unitSelect = row.querySelector(".unit-select");
  // Reset dropdown to default option
  unitSelect.innerHTML = '<option value=""> Select unit </option>';
  // Exit if no ingredient ID provided
  if (!ingredientId) return;

  // Fetch available units for the ingredient from API
  fetch(`/recipes/api/ingredient-units?ingredient=${encodeURIComponent(ingredientId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      // Add each unit as an option in the dropdown
      data.forEach(unit => {
        const option = document.createElement("option");
        option.value = unit.unit_id;
        option.textContent = unit.unit_name;
        unitSelect.appendChild(option);
      });
    })
    .catch(err => console.error("Failed to fetch units:", err));
}

// Initialize autocomplete and event listeners for an ingredient input row
function initializeIngredientInput(row, index) {
  // Get input and suggestion box elements
  const input = row.querySelector(".ingredient-input");
  const suggestionBox = row.querySelector(`#suggestions_${index}`);
  let fetchedIngredients = [];
  let ingredientData = [];
  let activeIndex = -1;

  // Handle input changes for autocomplete
  input.addEventListener("input", async function () {
    const query = this.value.trim().toLowerCase();
    activeIndex = -1;
    // Clear suggestions and hide box
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";
    // Reset units dropdown
    const unitSelect = row.querySelector(`select[name="unit_${index}"]`);
    unitSelect.innerHTML = "<option value=''> Select unit </option>";

    // Clear fields if input is empty
    if (query.length < 1) {
      delete row.dataset.ingredientId;
      row.querySelector(`input[name="base_quantity_${index}"]`).value = "";
      row.querySelector(`input[name="base_unit_${index}"]`).value = "";
      row.querySelector(`input[name="base_price_${index}"]`).value = "";
      return;
    }

    // Fetch ingredient suggestions from API
    try {
      const res = await fetch(`/recipes/api/ingredients/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to fetch ingredients");

      const data = await res.json();
      ingredientData = data;
      fetchedIngredients = data.map(item => item.name.toLowerCase());

      // Hide suggestions if no results
      if (data.length === 0) {
        suggestionBox.style.display = "none";
        return;
      }

      // Display suggestion items
      data.forEach(item => {
        const div = document.createElement("div");
        div.dataset.id = item.ingredient_id;
        div.textContent = item.name;
        div.classList.add("suggestion-item");
        div.addEventListener("click", () => selectIngredient(item, row, index));
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
  });

  // Handle keyboard navigation for suggestions
  input.addEventListener("keydown", function (e) {
    const items = suggestionBox.querySelectorAll(".suggestion-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      highlightItem(items, activeIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      highlightItem(items, activeIndex);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        const selectedItem = ingredientData.find(d => d.name === items[activeIndex].textContent);
        selectIngredient(selectedItem, row, index);
        // Move focus to the next input (quantity field)
        const nextInput = row.querySelector(`input[name="quantity_${index}"]`);
        if (nextInput) nextInput.focus();
      }
      suggestionBox.style.display = "none";
    }
  });

  // Handle blur to validate and clear invalid inputs
  input.addEventListener("blur", function () {
    setTimeout(() => {
      const currentValue = this.value.trim().toLowerCase();
      if (!fetchedIngredients.includes(currentValue)) {
        this.value = "";
        delete row.dataset.ingredientId;
        row.querySelector(`input[name="base_quantity_${index}"]`).value = "";
        row.querySelector(`input[name="base_unit_${index}"]`).value = "";
        row.querySelector(`input[name="base_price_${index}"]`).value = "";
        row.querySelector(`select[name="unit_${index}"]`).innerHTML = "<option value=''> Select unit </option>";
      }
      suggestionBox.style.display = "none";
      activeIndex = -1;
    }, 150);
  });

  // Highlight selected suggestion item
  function highlightItem(items, idx) {
    items.forEach((item, i) => item.style.background = i === idx ? "#ddd" : "");
    if (idx >= 0) items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Select an ingredient and populate row fields
  function selectIngredient(item, row, index) {
    if (!item) return;
    input.value = item.name;
    row.dataset.ingredientId = item.ingredient_id;

    const baseQtyInput = row.querySelector(`input[name="base_quantity_${index}"]`);
    baseQtyInput.value = 1;
    baseQtyInput.dataset.original = 1;

    const baseUnitInput = row.querySelector(`input[name="base_unit_${index}"]`);
    baseUnitInput.value = item.base_unit || "";
    baseUnitInput.dataset.original = item.base_unit || "";

    const basePriceInput = row.querySelector(`input[name="base_price_${index}"]`);
    basePriceInput.value = item.price || "";
    basePriceInput.dataset.original = item.price || "";

    populateUnits(row, item.ingredient_id);
    suggestionBox.style.display = "none";
  }
}

// Validate numeric inputs to allow only positive floats with 2 decimals
function attachNumberValidation(input) {
  // Prevent invalid characters (e, E, +, -)
  input.addEventListener("keydown", (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  });

  // Enforce positive numbers with max 2 decimals
  input.addEventListener("input", () => {
    let value = input.value;
    if (value && parseFloat(value) <= 0) {
      input.value = "";
      return;
    }
    if (value.includes(".")) {
      const [int, dec] = value.split(".");
      if (dec.length > 2) {
        input.value = int + "." + dec.slice(0, 2);
      }
    }
  });
}
// Attach input listeners to a row
function attachRowListeners(row) {
  row.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("input", handleRowChange);
  });
}

// Handle row input changes to add new rows dynamically
function handleRowChange(event) {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const currentRow = event.target.closest("tr"); // Get the row containing the input
  const currentRowIndex = rows.indexOf(currentRow); //console.log("current row index:", currentRowIndex);
  const nextRow = rows[currentRowIndex + 1];
  const isNextRowComponent = rows[currentRowIndex + 1] && rows[currentRowIndex + 1].classList.contains("component-row");
  const lastRow = rows[rows.length - 1];
  const isCurrentRowLastRow = currentRow === lastRow;
  const targetRow = (isCurrentRowLastRow || isNextRowComponent) ? currentRow : null;
  const currentRowInputs = targetRow 
    ? Array.from(targetRow.querySelectorAll("input, select")).map(i => i.value.trim()) 
    : [];
  
  // Add new row if last non-component row is filled
  if (targetRow && currentRowInputs.some(v => v !== "")) {
    const index = rows.length;
    const newRow = document.createElement("tr");
    newRow.classList.add("ingredient-row");
    newRow.innerHTML = `
      <td style="position: relative;">
        <input type="text" name="ingredient_name_${index}" class="ingredient-input" placeholder="Ingredient" autocomplete="off">
        <div class="suggestions" id="suggestions_${index}"></div>
        <div class="error-create-recipe" id="errorIngName_${index}"></div>
      </td>
      <td><input type="number" step="any" name="quantity_${index}" placeholder="Qty">
        <div class="error-create-recipe" id="errorQuantity_${index}"></div>
      </td>
      <td>
        <select name="unit_${index}" class="unit-select">
          <option value=""> Select unit </option>
        </select>
        <div class="error-create-recipe" id="errorUnit_${index}"></div>
      </td>
      <td><input type="number" step="any" name="base_quantity_${index}" placeholder="Base Qty" class="validated-number">
        <div class="error-create-recipe" id="errorBaseQuantity_${index}"></div>
      </td>
      <td><input type="text" name="base_unit_${index}" placeholder="Base Unit">
        <div class="error-create-recipe" id="errorBaseUnit_${index}"></div>
      </td>
      <td><input type="number" step="any" name="base_price_${index}" placeholder="Base Price" class="validated-number">
        <div class="error-create-recipe" id="errorBasePrice_${index}"></div>
      </td>
    `;
    
    // Insert before the next component row, or append if none exists or last row is component
    if (isNextRowComponent) {
      tbody.insertBefore(newRow, nextRow);
    } else {
      tbody.appendChild(newRow);
    }

    // Apply number validation to new numeric inputs
    newRow.querySelectorAll("input[name^='quantity_'], input[name^='base_quantity_'], input[name^='base_price_']").forEach(input => {
      attachNumberValidation(input);
    });

    // Attach listeners and initialize autocomplete for new row
    attachRowListeners(newRow);
    initializeIngredientInput(newRow, index);
  }
}

// Initialize page functionality on load
document.addEventListener("DOMContentLoaded", function () {
  // Get ingredients table body
  const tbody = document.getElementById("ingredients-tbody");
  const addFirstComponentBtn = document.getElementById(`add-first-component-btn`);
  const addComponentBtn = document.getElementById(`add-component-btn`);

  // Apply number validation to initial numeric inputs
  tbody.querySelectorAll("input[name^='quantity_'], input[name^='base_quantity_'], input[name^='base_price_']").forEach(input => {
    attachNumberValidation(input);
  });

  // component buttons to add the heading for the ingredient list
  [addFirstComponentBtn, addComponentBtn].forEach( button => 
    button.addEventListener("click", function () {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const index = rows.length;
      // Create the component row
      const tr = document.createElement("tr");
      tr.classList.add("component-row");
      tr.innerHTML = `
        <td colspan="6" style="background-color:#f2f2f2; font-weight:bold;">
          <input type="text" name="component_text_${index}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
          <div class="error-create-recipe" id="errorCompText_${index}"></div>
        </td>
      `;
      // Depending on the button, place it on the top or at the bottom
      if(button == addFirstComponentBtn){
        tbody.prepend(tr);
        addFirstComponentBtn.style.display ='none';
      } else if(button == addComponentBtn){
        tbody.appendChild(tr);
      };
    
      attachRowListeners(tr);
    })
  );

  // Initialize existing ingredient rows
  tbody.querySelectorAll("tr").forEach((row, index) => {
    attachRowListeners(row);
    initializeIngredientInput(row, index);
  });

  // Get steps table body
  const stepsTbody = document.getElementById("steps-tbody");

  // Attach listeners to step rows
  function attachStepListener(row, index) {
    const input = row.querySelector(".step-input");
    // Clean up step input on blur
    input.addEventListener("blur", () => {
      input.value = input.value.trim().replace(/\s{2,}/g, " ");
    });

    // Add new step row dynamically on input
    input.addEventListener("input", () => {
      const rows = Array.from(stepsTbody.querySelectorAll("tr"));
      const lastRow = rows[rows.length - 1];
      const lastInput = lastRow.querySelector(".step-input");

      if (lastInput.value.trim() !== "") {
        const newIndex = rows.length;
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
          <td>${newIndex + 1}</td>
          <td><input type="text" name="step_text_${newIndex}" class="step-input" placeholder="Step description"></td>
        `;
        stepsTbody.appendChild(newRow);
        attachStepListener(newRow, newIndex);
      }
    });
  }

  // Initialize first step row
  attachStepListener(stepsTbody.querySelector("tr"), 0);

  // Handle recipe submission
  document.getElementById("submit-recipe-btn").addEventListener("click", async () => {
    // Validate all form sections
    const completeRecipe = [];
    const recipeData = validateRecipeForm();
    if (!recipeData) return;
    const ingredientsData = validateIngredientsForm();
    if (!ingredientsData) return;
    const stepsData = validateStepsForm();
    if (!stepsData) return;

    // Combine validated data
    completeRecipe.push({
      name: recipeData["name"],
      portion_size: recipeData["portion_size"],
      privacy: recipeData["privacy"],
      description: recipeData["description"],
      components: ingredientsData,
      steps: stepsData
    });

    console.log("completeRecipe : ", completeRecipe);
    return;
    // Submit recipe to backend API //console.log("data sent:", completeRecipe);
    const errorBox = document.getElementById("error");
    try {
      const response = await fetch("/recipes/api/new-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(completeRecipe)
      });

      const data = await response.json();
      if (!response.ok) {
        errorBox.textContent = data.error || "Something went wrong while fetch new-recipe.";
        // console.log("Submitted data (for debug):", data.submitted_data);
        return;
      }

      // Display success message and redirect
      showAlert(data.message || "Recipe created successfully!");
      console.log("submitted data: ", data)
      //errorBox.textContent = data.message || "Recipe created successfully!";
      setTimeout(() => { window.location.href = `/recipes/details/${data.recipe_id}`; }, 2000);
    } catch (err) {
      errorBox.textContent = err.message;
    }
  });
});