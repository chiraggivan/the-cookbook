import { updateTotalRecipeCost, restrictNumberInput } from "./recipe_utils.js";
import { attachRowListeners, updateMoveButtons } from "./UI-animation_helpers.js";
import { attachCostEvents, recalcCost } from "./recipe_utils.js";

const token = localStorage.getItem("access_token");

// function to create empty ingredient row (any changes can be made here and get applied everywhere)
export function getEmptyIngredientRow(rowIndex) {
  return `
    <td style="position: relative;">
        <input type="text" name="ingredient_name_${rowIndex}" class="ingredient-input" placeholder="Eg. Milk" autocomplete="off">
        <div class="suggestions" id="suggestions_${rowIndex}"></div>
        <div class="error-create-recipe" id="errorIngName_${rowIndex}"></div>
    </td>
    <td>
        <input type="number" step="any" name="quantity_${rowIndex}" placeholder="Qty" class="validated-number">
        <div class="error-create-recipe" id="errorQuantity_${rowIndex}"></div>
    </td>
    <td>
        <select name="unit_${rowIndex}" class="unit-select">
            <option value="">Select Unit</option>
        </select>
        <div class="error-create-recipe" id="errorUnit_${rowIndex}"></div>
    </td>
    <td class="cost-input" style="text-align: center;"></td>
    <td>
        <input type="number" step="any" name="base_quantity_${rowIndex}" placeholder="Base Qty" min="0.01" class="validated-number">
        <div class="error-create-recipe" id="errorBaseQuantity_${rowIndex}"></div>
    </td>
    <td>
        <select name="base_unit_${rowIndex}" class="base-unit-select">
            <option value="">Select Unit</option>
        </select>
        <div class="error-create-recipe" id="errorBaseUnit_${rowIndex}"></div>
    </td>
    <td>
        <input type="number" step="any" name="base_price_${rowIndex}" placeholder="Base Price" min="0.01" class="validated-number">
        <div class="error-create-recipe" id="errorBasePrice_${rowIndex}"></div>
    </td>
    <td>
        <button class="move-ing-up-btn" style="display : none;">Move ↑ </button>
        <button class="move-ing-down-btn" style="display : none;">Move ↓ </button>
    </td>
    <td><button class="remove-ingredient-btn" style="display:none">Remove</button></td>
  `;
}

// Populate units dropdown for a selected ingredient
export async function populateUnits(row, token) {
    // get the ingredient id from row
    const ingredientId = row.dataset.ingredientId;
    // get the unit id from row
    const unitSelect = row.querySelector(".unit-select");
    const selectedUnitId = unitSelect?.value;

    unitSelect.innerHTML = ""; // clear old options

    // Add the default "Select" option first
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select";
    unitSelect.appendChild(defaultOption);

    try {
        const res = await fetch(`/recipes/api/ingredient-units?ingredient=${encodeURIComponent(ingredientId)}`, {
        headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load units for ingredient " + ingredientId);

        const units = await res.json();// console.log("units of ", ingredientId," :", units)
        // store units with conversion factors in row for later use
        row.dataset.units = JSON.stringify(units);

        units.forEach(u => {
        const option = document.createElement("option");
        option.value = u.unit_id;
        option.textContent = u.unit_name;
        option.dataset.conversionFactor = u.conversion_factor; 
        if (parseInt(u.unit_id) === parseInt(selectedUnitId)) option.selected = true; // keep current unit selected
        unitSelect.appendChild(option);
        });
    } catch (err) {
        console.error("Error loading units for ingredient", ingredientId, err);
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No units found";
        unitSelect.appendChild(option);
    }
}

// populate base units acceptable for the ingredient
export function populateBaseUnits(row) {
    const baseUnit = row.querySelector('select[name^="base_unit_"');
    const currentUnit = baseUnit.value;
    const unitGroups = {
        weight: ["kg", "g", "oz", "lbs"],
        volume: ["l", "ml", "fl.oz", "pint"],
        bunch: ["bunch"],
        pc: ["pc"]
    };

    let group = null;
    for (const values of Object.values(unitGroups)) {
        if (values.includes(currentUnit)) {
            group = values;
            break;
        }
    }

    baseUnit.innerHTML = "";

    if (group) {
        group.forEach(u => {
            const option = document.createElement("option");
            option.value = u;
            option.textContent = u;
            if (u === currentUnit) option.selected = true;
            baseUnit.appendChild(option);
        });
    } else { // if somehow original value not in group then show that original value only
        const option = document.createElement("option");
        option.value = currentUnit;
        option.textContent = currentUnit;
        option.selected = true;
        baseUnit.appendChild(option);
    }
}

// Initialize autocomplete for an ingredient
export function initializeIngredientInput(row, token) {
    const input = row.querySelector('input[name^="ingredient_name_"]');
    const suggestionBox = row.querySelector(".suggestions");
    let fetchedIngredients = [];
    let ingredientData = [];
    let activeIndex = -1;
    let initialValue = ""; // Track initial input value on focus

    // Store initial value when the input is focused
    input.addEventListener("focus", function () {
        initialValue = this.value.trim().toLowerCase();
    });

    // Fetching list for ingredients by text in input and click the ingredient
    input.addEventListener("input", async function () {
        const query = this.value.trim().toLowerCase();
        activeIndex = -1;
        suggestionBox.innerHTML = "";
        suggestionBox.style.display = "none";

        if (query.length < 1) return;
        try {
            const res = await fetch(`/recipes/api/ingredients/search?q=${encodeURIComponent(query)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch ingredients");

            const data = await res.json();
            ingredientData = data;
            fetchedIngredients = data.map(item => item.name.toLowerCase());

            if (data.length === 0) return;

            data.forEach(item => {
                const div = document.createElement("div");
                div.dataset.id = item.ingredient_id;
                div.textContent = item.name;
                div.classList.add("suggestion-item");
                div.addEventListener("click", async () => await selectIngredient(item, row));
                suggestionBox.appendChild(div);
            });

            suggestionBox.style.display = "block";

            // Highlight first suggestion by default
            const items = suggestionBox.querySelectorAll(".suggestion-item");
            if (items.length > 0) {
                activeIndex = 0;
                highlightItem(items, activeIndex);
            }
            

        } catch (err) {
            console.error("Error fetching ingredients:", err);
        }
    });

    // Handle keyboard navigation for selecting ingredient with (Tab or Enter) as selected ingredient
    input.addEventListener("keydown", function (e) {
        const items = suggestionBox.querySelectorAll(".suggestion-item");
        
        if (!items.length) 
            return;
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
            if (activeIndex >= 0) {
                const selectedItem = ingredientData.find(d => d.name === items[activeIndex].textContent);
                selectIngredient(selectedItem, row);

                // Move focus to the next input (quantity)
                const nextInput = row.querySelector('input[name^="quantity_"]');
                if (nextInput) nextInput.focus();
            }
            suggestionBox.style.display = "none";
        }
    });

    // Handle blur to clear row only if user typed an invalid value or input is empty
    input.addEventListener("blur", function () {
        setTimeout(() => {
            const currentValue = this.value.trim().toLowerCase();
            // Clear row if input is empty or user typed an invalid value
            if (!currentValue || (currentValue !== initialValue && !fetchedIngredients.includes(currentValue))) {
                this.value = "";
                delete row.dataset.ingredientId;
                row.querySelector('input[name^="quantity_"]').value = "";
                row.querySelector('input[name^="base_quantity_"]').value = "";
                row.querySelector('select[name^="base_unit_"]').innerHTML = "<option value=''>Select unit</option>";
                row.querySelector('input[name^="base_price_"]').value = "";
                row.querySelector('select[name^="unit_"]').innerHTML = "<option value=''>Select unit</option>";
                recalcCost(row);
            }
            suggestionBox.style.display = "none";
            activeIndex = -1;
        }, 150);
        setTimeout(() => {updateTotalRecipeCost()},200); // using setTimeout as it should run after the above code.
    });

    // Highlight suggestion item
    function highlightItem(items, idx) {
        items.forEach((item, i) => item.style.background = i === idx ? "#ddd" : "");
        if (idx >= 0) items[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Select an ingredient (new or existing) and populate fields
    async function selectIngredient(item, row) {
        input.value = item.name;
        row.dataset.ingredientId = item.ingredient_id;

        row.querySelector('input[name^="base_quantity_"]').value = 1;
        row.querySelector('input[name^="base_price_"]').value = item.price ? Number(item.price).toFixed(2) : "";
        row.querySelector('select[name^="base_unit_"]').innerHTML = `<option selected>${item.base_unit || ""}</option>`;

        // Store defaults for payload comparison
        row.dataset.defaultBaseQuantity = 1;
        row.dataset.defaultBasePrice = item.price ? Number(item.price).toFixed(2) : 0;
        row.dataset.defaultBaseUnit = item.base_unit || "";

        // Populate the units dropdown using the correct 4 params
        await populateUnits(row, token);
        populateBaseUnits(row); 

        suggestionBox.style.display = "none";
    }
}

/** expand to understand this function..
 * Initializes a newly created ingredient row by attaching all required
 * event listeners, autocomplete, cost calculations, and input validations.
 * 
 * This function ensures that every ingredient row (whether loaded from DB
 * or dynamically added by the user) behaves consistently without repeating code.
 * 
 * What this function does:
 * 1. Attaches event listeners to detect changes in the row (for dynamic row creation)
 * 2. Enables cost recalculation when relevant fields change
 * 3. Activates the ingredient autocomplete search with authentication token
 * 4. Applies number input restrictions to quantity, base quantity, and base price fields
 * 
 * @param {HTMLElement} row - The <tr> element representing one ingredient row
 * @param {string} token - The authenticated user's JWT token used for API calls
 */
export function initializeIngredientRow(row, token) {
    attachRowListeners(row);
    attachCostEvents(row);
    initializeIngredientInput(row, token);

    restrictNumberInput(row.querySelector('input[name^="quantity_"]'), 6, 3);
    restrictNumberInput(row.querySelector('input[name^="base_quantity_"]'), 6, 3);
    restrictNumberInput(row.querySelector('input[name^="base_price_"]'), 6, 2);
}