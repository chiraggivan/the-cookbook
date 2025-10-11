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
  // let fetchedIngredients = [];
  // let ingredientData = [];
  // let activeIndex = -1;

  // Handle input changes for autocomplete
  input.addEventListener("input", async function () {
    const query = this.value.trim().toLowerCase();
    // activeIndex = -1;

    // Clear suggestions and hide box
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";

    // Fetch ingredient suggestions from API
    let ingredientData =[];
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
      // div.addEventListener("click", () => selectIngredient(item, row, index));
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

    // Highlight selected suggestion item
    function highlightItem(items, idx) {
      items.forEach((item, i) => item.style.background = i === idx ? "#ddd" : "");
      // if (idx >= 0) items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Handle keyboard navigation for suggestions
    input.addEventListener("keydown", function (e) {
      const items = suggestionBox.querySelectorAll(".suggestion-item");
      if (items.length === 0) return;
      console.log("active index is: ",  activeIndex)

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        highlightItem(items, activeIndex);
      } 
    });
  });
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