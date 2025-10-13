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
  //console.log(`main input is type of :`,typeof input, ` and value is :`, input);
  const suggestionBox = row.querySelector(`#suggestions_${index}`);
  let fetchedIngredients = [];
  let ingredientData = [];
  let activeIndex = -1;

  // what happens after user press ENTER/TAB  on a selected ingredient.
  function selectIngredient(item, row, idx){
    if(!item) return;
    input.value = item.name;
    row.dataset.ingredientId = item.ingredient_id;
    //console.log("row after selectIngredient is :", row);
    suggestionBox.style.display = 'none';

    const baseQ = row.querySelector(`input[name=base_quantity_${idx}]`);
    baseQ.value = 1;

    const baseU = row.querySelector(`input[name=base_unit_${idx}]`);
    baseU.value = item.base_unit;

    const baseP = row.querySelector(`input[name=base_price_${idx}]`);
    baseP.value = item.price;

    populateUnits(row, item.ingredient_id);

  };

  async function populateUnits(row, ingredientId){
    const units = row.querySelector(`select[name^='unit_'`);
    const unitList = []
    try{
      const res = await fetch(`recipes/api/ingredient?ingredient=${encodeURIComponent(ingredientId)}`,{
        method : 'GET',
        headers: {
          'application':'',
          'Authorisation' :`Bearer${token}`
        }
      });
       if (!res.ok){};

       data = await res.json();
       unitList = data.unit_name;

       data.forEach( i => units.innerHTML)
    }catch{

    };






  }

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









