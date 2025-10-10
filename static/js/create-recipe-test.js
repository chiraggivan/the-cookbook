const token = localStorage.getItem("access_token");

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
    const suggestionBox = row.querySelector(`#suggestions_${index}`);
    let fetchedIngredients = [];
    let ingredientData = [];
    let activeIndex = -1;

    
}


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