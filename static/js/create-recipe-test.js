const token = localStorage.getItem("access_token");

// Validate recipe form inputs (name, portion size, description, privacy)
function validateRecipeForm() {
  // Get input values and trim whitespace
  const name = document.getElementById("recipe-name").value.trim();
  const portionSize = document.getElementById("portion-size").value.trim();
  const description = document.getElementById("description").value.trim();
  const privacy = document.getElementById("privacy").checked ? "private" : "public";

  // Get error display elements
  const errorName = document.getElementById("errorName");
  const errorPS = document.getElementById("errorPS");
  const errorDesc = document.getElementById("errorDesc");

  // Clear previous error messages
  errorName.textContent = "";
  errorPS.textContent = "";
  errorDesc.textContent = "";
  document.getElementById("error").textContent = "";

  let hasError = false;

  // Validate recipe name
  if (!name) {
    errorName.textContent = "Recipe name is required.";
    hasError = true;
  } else if (name.length > 50) {
    errorName.textContent = "Recipe name must be less than 50 characters.";
    hasError = true;
  }

  // Validate portion size
  if (!portionSize) {
    errorPS.textContent = "Portion size is required.";
    hasError = true;
  } else if (portionSize.length < 1 || portionSize.length > 20) {
    errorPS.textContent = "Portion size must be less than 20 characters.";
    hasError = true;
  }

  // Validate description
  if (description.length > 500) {
    errorDesc.textContent = "Description must be ≤ 500 characters.";
    hasError = true;
  }

  // Validate privacy setting
  if (!["public", "private"].includes(privacy)) {
    document.getElementById("error").textContent = "Privacy must be public or private.";
    hasError = true;
  }

  // Return false if errors exist, otherwise return validated data
  if (hasError) return false;
  return { name, portion_size: portionSize, description, privacy };
}

// Validate ingredient table rows
function validateIngredientsForm() {
  // Get all ingredient table rows
  const rows = document.querySelectorAll("#ingredients-table tbody tr");
  let filledRowsCount = 0;
  let displayOrder = 0;
  let errorMessage = "";
  const ingredientsData = [];
  const errorBoxes = {};

  // Iterate through each row
  rows.forEach((row, index) => {
    // Get input and select elements for the row
    const nameInput = row.querySelector(`input[name^="ingredient_name_"]`);
    const quantityInput = row.querySelector(`input[name^="quantity_"]`);
    const unitSelect = row.querySelector(`select[name^="unit_"]`);
    const baseQtyInput = row.querySelector(`input[name^="base_quantity_"]`);
    const baseUnitInput = row.querySelector(`input[name^="base_unit_"]`);
    const basePriceInput = row.querySelector(`input[name^="base_price_"]`);
    
    // Get error display elements
    errorBoxes[`errorIngName_${index}`] = document.getElementById(`errorIngName_${index}`);
    errorBoxes[`errorQuantity_${index}`] = document.getElementById(`errorQuantity_${index}`);
    errorBoxes[`errorUnit_${index}`] = document.getElementById(`errorUnit_${index}`);
    errorBoxes[`errorBaseQuantity_${index}`] = document.getElementById(`errorBaseQuantity_${index}`);
    errorBoxes[`errorBaseUnit_${index}`] = document.getElementById(`errorBaseUnit_${index}`);
    errorBoxes[`errorBasePrice_${index}`] = document.getElementById(`errorBasePrice_${index}`);
    //const  = document.getElementById(`_${index}`);

    // Reset Error messages
    errorBoxes[`errorIngName_${index}`].textContent =  "";
    errorBoxes[`errorQuantity_${index}`].textContent =  "";
    errorBoxes[`errorUnit_${index}`].textContent =  "";
    errorBoxes[`errorBaseQuantity_${index}`].textContent =  "";
    errorBoxes[`errorBaseUnit_${index}`].textContent =  "";
    errorBoxes[`errorBasePrice_${index}`].textContent =  "";

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
      if(nameInput.value.trim() == ""){errorBoxes[`errorIngName_${index}`].textContent =  "Name required" };
      if(quantityInput.value.trim() == ""){errorBoxes[`errorQuantity_${index}`].textContent =  "Quantity required" };
      if(unitSelect.value.trim() == ""){errorBoxes[`errorUnit_${index}`].textContent =  "Select a Unit" };
      if(baseQtyInput.value.trim() == ""){errorBoxes[`errorBaseQuantity_${index}`].textContent =  "Base quantity required" };
      if(baseUnitInput.value.trim() == ""){errorBoxes[`errorBaseUnit_${index}`].textContent =  "Base Unit required" };
      if(basePriceInput.value.trim() == ""){errorBoxes[`errorBasePrice_${index}`].textContent =  "Base Price required" };
      //errorMessage = `Row ${index + 1}: All fields must be filled if any field is entered.`;
    }

    // Process fully filled rows
    if (isAllFieldsFilled) {
      filledRowsCount++;
      displayOrder++;
      const ingredientObj = {
        ingredient_id: parseInt(row.dataset.ingredientId),
        quantity: parseFloat(quantityInput.value),
        unit_id: parseInt(unitSelect.value),
        display_order : displayOrder
      };

      // Include base fields only if they differ from original values
      if (parseFloat(baseQtyInput.value) != parseFloat(baseQtyInput.dataset.original) ||
          baseUnitInput.value != baseUnitInput.dataset.original ||
          parseFloat(basePriceInput.value) != parseFloat(basePriceInput.dataset.original)) {
        ingredientObj.base_quantity = parseFloat(baseQtyInput.value);
        ingredientObj.base_unit = baseUnitInput.value;
        ingredientObj.base_price = parseFloat(basePriceInput.value);
      }

      ingredientsData.push(ingredientObj);
    }
  });

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

// Validate numeric inputs to allow only positive floats with 2 decimals
function attachNumberValidation(input) {
  // Prevent invalid characters (e, E, +, -)
  input.addEventListener("keydown", (e) => {
    // console.log(this);
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

// Initialize autocomplete and event listeners for an ingredient input row
function initializeIngredientInput(row, index) {
  const input = row.querySelector(".ingredient-input");
  //console.log(`main input is type of :`,typeof input, ` and value is :`, input);
  const suggestionBox = row.querySelector(`#suggestions_${index}`);
  let fetchedIngredients = [];
  let ingredientData = [];
  let activeIndex = -1;
  const errorBox = document.getElementById(`error`);

  // Handle input changes for autocomplete
  input.addEventListener("input", async function () {
    const query = this.value.trim().toLowerCase();
    // activeIndex = -1;

    // Clear suggestions and hide box
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";

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
      //console.log("ingredientData is : ", ingredientData);

    } catch (err) {
      console.error("Error fetching ingredients:", err);
    }

    // Display suggestion items
    ingredientData.forEach(item => {
      const div = document.createElement("div");
      div.dataset.id = item.ingredient_id;
      div.textContent = item.name;
      div.classList.add("suggestion-item");
      div.addEventListener("click", () => selectIngredient(item, row, index));
      suggestionBox.appendChild(div);
    });

    // Highlight the first suggestion if available
    suggestionBox.style.display = "block";
    activeIndex = ingredientData.length > 0 ? 0 : -1;
    const items = suggestionBox.querySelectorAll(".suggestion-item");
    // console.log("items are: ",items);
    if (items.length > 0) {
      highlightItem(items, activeIndex);
    }
  });

  // Highlight selected suggestion item
  function highlightItem(items, idx) {
    items.forEach((item, i) => item.style.background = i === idx ? "#ddd" : "");
    // if (idx >= 0) items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Handle keyboard navigation for suggestions
  input.addEventListener("keydown", function (e) {
    const items = suggestionBox.querySelectorAll(".suggestion-item");
    // console.log("items are : ", items);
    if (items.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();      
      activeIndex = (activeIndex + 1) % items.length ;
      highlightItem(items, activeIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();      
      activeIndex = (activeIndex - 1 + items.length) % items.length ;
      highlightItem(items, activeIndex);
    } else if (e.key === "Tab" || e.key === "Enter"){
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        const selectedItem = ingredientData.find(d => d.name === items[activeIndex].textContent);
        //console.log("selectedItem after TAB or Enter: ", selectedItem);
        selectIngredient(selectedItem, row, index);
      };
      const nextInput = row.querySelector(`input[name='quantity_${index}']`);
      if (nextInput) nextInput.focus();
    };

  });

  // what happens after user press ENTER/TAB  on a selected ingredient.
  function selectIngredient(item, row, idx){
    if(!item) return;
    input.value = item.name;
    row.dataset.ingredientId = item.ingredient_id;
    //console.log("row after selectIngredient is :", row);
    suggestionBox.style.display = 'none';

    const baseQ = row.querySelector(`input[name=base_quantity_${idx}]`);
    baseQ.value = 1;
    baseQ.dataset.original = 1;

    const baseU = row.querySelector(`input[name=base_unit_${idx}]`);
    baseU.value = item.base_unit;
    baseU.dataset.original = item.base_unit || "";

    const baseP = row.querySelector(`input[name=base_price_${idx}]`);
    baseP.value = item.price;
    baseP.dataset.original = item.price || "";

    populateUnits(row, item.ingredient_id);

  };

  // populate units for selected ingredient
  async function populateUnits(row, ingredientId){
    const unitSelect = row.querySelector(`.unit-select`);
    unitSelect.innerHTML = `<option value =""> Select Unit </option>`;
  
    if (!ingredientId) return;

    try{
      const res = await fetch(`/recipes/api/ingredient-units?ingredient=${encodeURIComponent(ingredientId)}`,{
        method : 'GET',
        headers: {
          'Content-Type':'application/json',
          'Authorization' :`Bearer ${token}`
        }
      });
      if (!res.ok){
      errorBox.textContent = data.error || "Something went wrong while fetch new-recipe.";
      console.log("response not OK");
      return;
      };

      const data = await res.json(); // console.log("data after fetch in populateUnits is:", data);
      data.forEach( i => {
        const option = document.createElement("option");
        option.value = i.unit_id;
        option.textContent = i.unit_name;
        unitSelect.appendChild(option);
      });
    }catch (err){
      errorBox.textContent = err.message;
    };
  }

  // used for checking if the ingredient search is in the list and if not the clear the fields fo that row.
  input.addEventListener("blur", function () {
    setTimeout( ()=> {
      suggestionBox.style.display = 'none';
      currentValue = this.value.trim().toLowerCase();
      if(!fetchedIngredients.includes(currentValue)) {
        input.value = "";
        row.querySelector(`input[name=quantity_${index}]`).value = "";
        row.querySelector(`input[name=base_quantity_${index}]`).value = "";
        row.querySelector(`input[name=base_unit_${index}]`).value = "";
        row.querySelector(`input[name=base_price_${index}]`).value ="";
        row.querySelector(`select[name=unit_${index}]`).innerHTML = `<option value=""> Select unit </option>`;
      };
    }, 150);
  });
}

// Main DOM when loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get ingredients table body
  const tbody = document.getElementById("ingredients-tbody");

  // Apply number validation to initial numeric inputs
  tbody.querySelectorAll("input[name^='quantity_'], input[name^='base_quantity_'], input[name^='base_price_']").forEach(input => {
    attachNumberValidation(input);
  });

  // Initialize existing ingredient rows
  tbody.querySelectorAll("tr").forEach((row, index) => {
    // attachRowListeners(row);
    initializeIngredientInput(row, index);
  });

});









