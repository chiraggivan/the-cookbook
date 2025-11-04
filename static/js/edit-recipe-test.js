const token = localStorage.getItem("access_token");//console.log("token is :", token);
if (!token) {
    window.location.href = "/auth/login";
    // return;
} else {
    loadRecipeForEdit(window.recipeId,token);
}
let originalRecipeData = null; // global variable to compare the change in recipe
const recipeId = window.recipeId;//console.log("recipeId is :", window.recipeId);

// function to create empty ingredient row (any changes can be made here and get applied everywhere)
function getEmptyIngredientRow(rowIndex) {
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
    <td><button class="remove-ingredient-btn" style="display:none">Remove</button></td>
  `;
}

// function to create empty ingredient row (any changes can be made here and get applied everywhere)
function getEmptyComponentRow(rowIndex){
    return `
        <td colspan="7" style="background-color:#f2f2f2; font-weight:bold;">
        <input type="text" name="component_text_${rowIndex}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
        <div class="error-create-recipe" id="errorCompText_${rowIndex}"></div>
        </td>
        <td><button class="remove-component-btn">Remove</button></td>
    `;
}
        
// load all the details of recipe in the page
async function loadRecipeForEdit(recipeId, token) {
    
    try {
        const res = await fetch(`/recipes/api/recipe/edit/${recipeId}`, {
        headers: { "Authorization": `Bearer ${token}` }
        });//console.log("response is: ", await res)

        if (res.status === 403) {
            alert("You don’t have permission to edit this recipe.");
            window.location.href = `/recipes/details/${recipeId}`; // redirect to view
            return;
        }
        const data = await res.json();  // console.log("data is: ", data)

        originalRecipeData = structuredClone(data); // deep copy to preserve original
        console.log("original recipe data : ", originalRecipeData);
        // populate form fields with data.recipe, ingredients, steps...
        document.getElementById("recipe-name-input").value = data.recipe.name;
        document.getElementById("portion-size-input").value = data.recipe.portion_size;
        document.getElementById("description-input").value = data.recipe.description;

        // Populate ingredients table
        const ingredients = data.ingredients;// console.log("ingredients:", ingredients);
        const totalIngredientRows = ingredients.length; // console.log("total rows from db are :", totalIngredientRows);
        const tbody = document.getElementById("ingredients-tbody");
        tbody.innerHTML = ""; // clear existing rows

        // Get unique component_display_order values in ascending order
        const uniqueComponents = [...new Set(ingredients.map(item => item.component_display_order))].sort((a, b) => a - b);
        
        let rowIndex = 0;
        // Iterate through each component_display_order
        for (const order of uniqueComponents) {
            // Get the component_text for the first item of this component_display_order
            const component = ingredients.find(item => item.component_display_order === order);
            const componentText = component.component_text ? component.component_text.trim() : "";
            
            // Before create component row, check if the rowIndex is more than 0 to add empty ingredient row
            if (rowIndex !== 0){
                const tr = document.createElement("tr");
                tr.classList.add("ingredient-row");
                tr.innerHTML = getEmptyIngredientRow(rowIndex);
                tbody.appendChild(tr);
                rowIndex++                
                initializeIngredientRow(tr, token);
                
            }
            
            const componentRow = document.createElement("tr");
            componentRow.classList.add("component-row");
            componentRow.dataset.recipeComponentId = component.recipe_component_id || 0;
            componentRow.innerHTML = `
                <td colspan="7" style="background-color:#f2f2f2; font-weight:bold;">
                <input type="text" name="component_text_${rowIndex}" value="${componentText}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
                <div class="error-create-recipe" id="errorCompText_${rowIndex}"></div>
                </td>
                <td><button class="remove-component-btn">Remove</button></td>
            `;
            
            // Only create a component row if component_text is non-empty
            if (componentText == "" && rowIndex == 0) {
                componentRow.style.display="none";
            }
            tbody.appendChild(componentRow);
            rowIndex++

            // create rows for ingredient for the component above in ascending order
            componentIngredients = ingredients.filter(item => item.component_display_order === component.component_display_order).sort((a,b) => a.ingredient_display_order - b.ingredient_display_order);        
            for (const i of componentIngredients) {
                const tr = document.createElement("tr");
                tr.classList.add("ingredient-row");
                tr.dataset.recipeIngredientId = i.recipe_ingredient_id || "";
                tr.dataset.ingredientId = i.ingredient_id || "";
                tr.dataset.originalOrder = rowIndex || 0;
                tr.dataset.defaultBaseQuantity = i.base_quantity;
                tr.dataset.defaultBaseUnit = i.unit;
                tr.dataset.defaultBasePrice = i.base_price;
                tr.innerHTML = `
                    <td style="position: relative;">
                        <input type="text" name="ingredient_name_${rowIndex}" class="ingredient-input" value="${i.name}" placeholder="Eg. Milk" autocomplete="off">
                        <div class="suggestions" id="suggestions_${rowIndex}"></div>
                        <div class="error-create-recipe" id="errorIngName_${rowIndex}"></div>
                    </td>
                    <td>
                        <input type="number" step="any" name="quantity_${rowIndex}" placeholder="Qty" class="validated-number" value="${i.quantity}">
                        <div class="error-create-recipe" id="errorQuantity_${rowIndex}"></div>
                    </td>
                    <td>
                        <select name="unit_${rowIndex}" class="unit-select">
                            <option value="${i.unit_id}"> ${i.unit_name} </option>
                        </select>
                        <div class="error-create-recipe" id="errorUnit_${rowIndex}"></div>
                    </td>
                    <td class="cost-input" style="text-align: center;"></td>
                    <td>
                        <input type="number" step="any" name="base_quantity_${rowIndex}" placeholder="Base Qty" min="0.01" class="validated-number" value="${Number(1)}">
                        <div class="error-create-recipe" id="errorBaseQuantity_${rowIndex}"></div>
                    </td>
                    <td>
                        <select name="base_unit_${rowIndex}" class="base-unit-select">
                            <option value="${i.unit}"> ${i.unit} </option>
                        </select>
                        <div class="error-create-recipe" id="errorBaseUnit_${rowIndex}"></div>
                    </td>
                    <td>
                        <input type="number" step="any" name="base_price_${rowIndex}" placeholder="Base Price" min="0.01" class="validated-number" value="${Number(i.base_price).toFixed(2)}">
                        <div class="error-create-recipe" id="errorBasePrice_${rowIndex}"></div>
                    </td>
                    <td><button class="remove-ingredient-btn">Remove</button></td>
                `;
                tbody.appendChild(tr);
                rowIndex++
                
                await populateUnits(tr, token);
                populateBaseUnits(tr);
                recalcCost(tr);
                initializeIngredientRow(tr, token);

                // For normal quantity (only number without -/+ signs and no e. Also 3 decimal places)
                // enforceQuantityValidation(tr.querySelector('input[name^="quantity_"]'),{allowDecimal : 3});

                // // For base quantity (only number without -/+ signs and no e. Also 3 decimal places)
                // enforceQuantityValidation(tr.querySelector('input[name^="base_quantity_"]'), {allowDecimal : 3});

                // // For base price (only number without -/+ signs and no e. Also 2 decimal places)
                // enforceQuantityValidation(tr.querySelector('input[name^="base_price_"]'), {allowDecimal : 3});

                
            };
        };
        // add an empty ingredientrow at the end of table. (kept in 'if' for easy understanding)
        if (true) {
            const tr = document.createElement("tr");
            tr.classList.add("ingredient-row");
            tr.innerHTML = getEmptyIngredientRow(rowIndex);
            tbody.appendChild(tr);
            rowIndex++                
            // await populateUnits(tr, token);
            // populateBaseUnits(tr);
            // recalcCost(tr);
            initializeIngredientRow(tr, token);
            
        };
        // update total cost
        updateTotalRecipeCost();

        // Populate steps
        steps = data.steps;
        const stepsContainer = document.getElementById("steps-container");
        stepsContainer.innerHTML = "";
        steps.forEach(s => {
        const div = document.createElement("div");
        div.classList.add("step-row");
        div.innerHTML = `
            <textarea class="step-text">${s.step_text}</textarea>
            <button class="remove-step-btn">Remove</button>
        `;
        stepsContainer.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading recipe for edit:", err);
    }
}

// Populate units dropdown for a selected ingredient
async function populateUnits(row, token) {
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
function populateBaseUnits(row) {
    baseUnit = row.querySelector('select[name^="base_unit_"');
    currentUnit = baseUnit.value;
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

// recalculate the cost of ingredient as per the unit selected
function recalcCost(row) {

    const quantityInput = row.querySelector('input[name^="quantity_"]');
    const unitSelect = row.querySelector('select[name^="unit_"]');
    const baseQuantityInput = row.querySelector('input[name^="base_quantity_"]');
    const baseUnitSelect = row.querySelector('select[name^="base_unit_"]');
    const basePriceInput = row.querySelector('input[name^="base_price_"]');
    const costCell = row.querySelector(".cost-input");

    const quantity = parseFloat(quantityInput.value) || "";
    const baseQuantity = parseFloat(baseQuantityInput.value) ||"";
    const baseUnit = baseUnitSelect.value;
    const basePrice = parseFloat(basePriceInput.value) || "";
    
    if (!quantity || !baseQuantity || !baseUnit || !basePrice) {
        costCell.textContent = "";
        return;
    }

    // figure out which group the base unit belongs to
    const unitGroups = {
        weight: { base: "kg", factors: { kg: 1, g: 0.001, oz: 0.0283495, lbs: 0.453592 } },
        volume: { base: "l", factors: { l: 1, ml: 0.001, "fl.oz": 0.0295735, pint: 0.473176 } },
        bunch: {base: "bunch", factors: {bunch :1}},
        pc: {base: "pc", factors: {pc :1}}
    };

    let group = null;
    // // the below version is kept for future if we need to use 'key' data as well.
    // // currently we dont use key data, so we use values directly
    // for (const [key, def] of Object.entries(unitGroups)) {
    //     if (def.factors[baseUnit] !== undefined) {
    //         group = def;
    //         break;
    //     }
    // }

    for (const values of Object.values(unitGroups)) {
        if(values.factors[baseUnit] !== undefined) {
            group = values;
            break;
        }
    }
    
    if (!group) {
        costCell.textContent = "";
        return;
    }    
    
    // price per 1 "canonical unit" (kg or l)
    const normalizedPrice = (basePrice / baseQuantity) / group.factors[baseUnit];

    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    const conversionFactor = parseFloat(selectedOption?.dataset.conversionFactor);
    const cost = quantity * conversionFactor * normalizedPrice;// console.log("cost of ingredient :", cost);
    costCell.textContent = cost > 0 ? parseFloat(cost.toFixed(4)) : "";
    
    updateTotalRecipeCost();
}

// update total cost of recipe
function updateTotalRecipeCost() {
    //console.log("within update recipe cost");
    const costCells = document.querySelectorAll(".cost-input");
    let total = 0;

    costCells.forEach(cell => {
        const row = cell.closest("tr");
        // Skip removed rows
        if (row.dataset.removed === "true") return;
        const value = parseFloat(cell.textContent.replace(/,/g, '')) || 0;
        total += value;
    });
   
    const totalCostEl = document.getElementById("recipe-total-cost");
    if (totalCostEl) {
        totalCostEl.textContent = `Total Cost: £${total.toFixed(2).replace(/\.00$/, "")}`;
    }
}

// attach cost events
function attachCostEvents(row) {
    const quantityInput = row.querySelector('input[name^="quantity_"]');
    const baseQuantityInput = row.querySelector('input[name^="base_quantity_"]');
    const basePriceInput = row.querySelector('input[name^="base_price_"]');
    const unitSelect = row.querySelector('select[name^="unit_"]');
    const baseUnitSelect = row.querySelector('select[name^="base_unit_"]');

    quantityInput.addEventListener("input", () => recalcCost(row));
    baseQuantityInput.addEventListener("input", () => recalcCost(row));
    basePriceInput.addEventListener("input", () => recalcCost(row));
    unitSelect.addEventListener("change", () => recalcCost(row));
    baseUnitSelect.addEventListener("change", () => recalcCost(row));
}

// enforce quantities to be positive and more than zero and not more  than 1000000
// function enforceQuantityValidation(input,{allowDecimal = 2} ={}) {
//     const row = input.closest("tr");

//     input.addEventListener("keydown", (event) => {
//         const val = input.value;
//         const key = event.key;
//         const cursorPos = input.selectionStart;
//         const dotIndex = val.indexOf(".");
        
//         // Allow control keys (Backspace, Delete, Arrow keys, Tab)
//         if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(key)) {
//             return;
//         }

//         // Block +, -, e, E
//         if (["+", "-", "e", "E"].includes(key)) {
//             event.preventDefault();
//             return;
//         }

//         // // Case 1: No decimal yet
//         // console.log("cursorPos is : ", cursorPos);
//         // console.log("dotIndex is : ", dotIndex);
//         // if (dotIndex === -1) {
//         //     // Block if already 6 whole digits and typing a number
//         //     if (val.length >= 6) {
//         //         if (key !== "."){
//         //             event.preventDefault();
//         //         }            
//         //     }
//         //     return;
//         // }

//         // // Case 2: Decimal exists
//         // const [whole, dec] = val.split(".");
//         // console.log("dotIndex is : ", dotIndex);
//         // if (cursorPos <= dotIndex) {
//         //     // Typing before the dot (whole part)
//         //     if (whole.length >= allowedWholePlaces && /[0-9]/.test(event.key)) {
//         //     event.preventDefault();
//         //     }
//         // } else {
//         //     // Typing after the dot (decimal part)
//         //     if (dec.length >= allowedDecimalPlaces && /[0-9]/.test(event.key)) {
//         //     event.preventDefault();
//         //     }
//         // }

//         // // Allow only one decimal point
//         // if (key === ".") {
//         //     if (val.includes(".")) {
//         //         event.preventDefault();
//         //         return;
//         //     }
//         //     return;
//         // }

//         // // Allow digits only (0–9)
//         // if (!/^\d$/.test(key) &&  !val.includes(".") && whole.length >= 6 ) {
//         //     event.preventDefault();
//         //     return;
//         // }
//         if (val.includes(".")){
//             const [whole, dec] = val.split(".");
//             console.log("total length of val is : ", dec.length);
//             if(whole.length >= 6 && input.selectionStart <= whole.length ) {
//                 event.preventDefault();
//             }
//             if (dec.length >= allowDecimal){
//                 event.preventDefault();   
//             }
//         } else {
//             const whole = val;
//             if(whole.length >= 6) {
//                 if (key === "."){
//                     return;
//                 }
//                 event.preventDefault();
//             }
//         }
//         // Prevent typing more than 6 digits before decimal
//         // const [whole, decimal] = val.split(".");
//         // if (whole.length >= 6 && 
//         //     // Only block if cursor is on the whole number side (before the dot)
//         //     input.selectionStart <= whole.length &&  event.key !== ".") {
//         // event.preventDefault();
//         // return;
//         // }

//         // Prevent typing more than allowed decimals
//         // if (val.includes(".") && decimal && decimal.length >= allowDecimal) {
//         // event.preventDefault();
//         // return;
//         // }
//     });

//     input.addEventListener("blur", () => {
//         let val = input.value.trim();

//         // Empty case → force 0
//         if (val === "") {
//             input.value = "";
//             recalcCost(row);
//             return;
//         }

//         let num = parseFloat(val);

//         // Invalid → set to ""
//         if (isNaN(num)) {
//             input.value = "";
//             recalcCost(row);
//             return;
//         }

//         // Negative → set to 0
//         if (num < 0) num = 0;

//         // Limit to 1,000,000
//         if (num > 999999.99) num = 999999.99;

//         // Fix to max 2 decimals
//         input.value = num.toFixed(2).replace(/\.00$/, ""); // remove trailing .00
//         recalcCost(row);
//     });
// }

// enforce quantities to be positive and more than zero and not more  than 1000000
function restrictNumberInput(el, maxInt, maxDec) {
  el.addEventListener("keydown", e => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  });

  el.addEventListener("input", function() {
    let value = this.value;
    if (value.includes(".")) {
      let [intPart, decPart] = value.split(".");
      if (intPart.length > maxInt) intPart = intPart.slice(0, maxInt);
      if (decPart.length > maxDec) decPart = decPart.slice(0, maxDec);
      this.value = intPart + "." + decPart;
    } else if (value.length > maxInt) {
      this.value = value.slice(0, maxInt);
    }
  });
}

// Initialize autocomplete for an ingredient
function initializeIngredientInput(row, token) {
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

// Attach input listeners to a row
function attachRowListeners(row) {

    row.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("input", (event) =>  handleRowChange(row, event));
    //row.querySelector(".remove-ingredient-btn").style.display="block";
});
}

// Handle row input changes to add new rows dynamically
function handleRowChange(row, event) {

    if(row.classList.contains("ingredient-row")){
        row.querySelector(".remove-ingredient-btn").style.display="block";
        const tbody = document.getElementById("ingredients-tbody");
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
            newRow.innerHTML = getEmptyIngredientRow(index);
            
            // Insert before the next component row, or append if none exists or last row is component
            if (isNextRowComponent) {
                tbody.insertBefore(newRow, nextRow);
            } else {
                tbody.appendChild(newRow);
            }

            // // Apply number validation to new numeric inputs
            // newRow.querySelectorAll("input[name^='quantity_'], input[name^='base_quantity_'], input[name^='base_price_']").forEach(input => {
            //     attachNumberValidation(input);
            // });

            // Attach listeners and initialize autocomplete for new row
            initializeIngredientRow(newRow, token);
        }   
    } else if (row.classList.contains("component-row")){
        
        const tbody = document.getElementById("ingredients-tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        const currentRow = event.target.closest("tr"); // Get the row containing the input
        // const currentRowIndex = rows.indexOf(currentRow); //console.log("current row index:", currentRowIndex);
        // const nextRow = rows[currentRowIndex + 1];
        // const isNextRowComponent = rows[currentRowIndex + 1] && rows[currentRowIndex + 1].classList.contains("component-row");
        const lastRow = rows[rows.length - 1];
        const isCurrentRowLastRow = currentRow === lastRow;
        const targetRow = (isCurrentRowLastRow) ? currentRow : null;
        const currentRowInputs = targetRow 
        ? Array.from(targetRow.querySelectorAll("input, select")).map(i => i.value.trim()) 
        : [];

            // Add new row if last non-component row is filled
        if (targetRow && currentRowInputs.some(v => v !== "")) {
            const index = rows.length;
            const newRow = document.createElement("tr");
            newRow.classList.add("ingredient-row");
            newRow.innerHTML = getEmptyIngredientRow(index);
            tbody.appendChild(newRow);
        
            initializeIngredientRow(newRow, token);
            document.getElementById(`add-component-btn`).style.display="block";   
        };

    };

};

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
function initializeIngredientRow(row, token) {
    attachRowListeners(row);
    attachCostEvents(row);
    initializeIngredientInput(row, token);

    restrictNumberInput(row.querySelector('input[name^="quantity_"]'), 6, 3);
    restrictNumberInput(row.querySelector('input[name^="base_quantity_"]'), 6, 3);
    restrictNumberInput(row.querySelector('input[name^="base_price_"]'), 6, 2);
}

// Validate recipe form inputs (name, portion size, description, privacy)
function validateRecipeForm() {
  // Get input values and trim whitespace
  const name = document.getElementById("recipe-name-input").value.trim();
  const portionSize = document.getElementById("portion-size-input").value.trim();
  const description = document.getElementById("description-input").value.trim();
  // const privacy = document.getElementById("privacy").checked ? "private" : "public";
  
  const nameMaxLength = 50;
  const portionSizeMaxLength = 20;
  const descriptionMaxLength = 500;
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
  } else if (name.length > nameMaxLength) {
    errorName.textContent = `Recipe name must be less than ${nameMaxLength} characters.`;
    hasError = true;
  }

  // Validate portion size
  if (!portionSize) {
    errorPS.textContent = "Portion size is required.";
    hasError = true;
  } else if (portionSize.length < 1 || portionSize.length > portionSizeMaxLength) {
    errorPS.textContent = `Portion size must be ≤ ${portionSizeMaxLength} characters.`;
    hasError = true;
  }

  // Validate description
  if (description.length > descriptionMaxLength) {
    errorDesc.textContent = `Description must be ≤ ${descriptionMaxLength} characters.`;
    hasError = true;
  }

  // Validate privacy setting
//   if (!["public", "private"].includes(privacy)) {
//     document.getElementById("error").textContent = "Privacy must be public or private.";
//     hasError = true;
//   }

  // Return false if errors exist, otherwise return validated data
  if (hasError) return false;
  return { name, portion_size: portionSize, description};//, privacy };
}

// Validate ingredient table rows
// function validateIngredientsForm() {
//   // const tbody = document.getElementById("ingredients-tbody");
//   // const rows = Array.from(tbody.querySelectorAll("tr"));
//   // Get all ingredient table rows
//   const rows = document.querySelectorAll("#ingredients-table tbody tr");
//   const totalRows = rows.length;
//   let filledRowsCount = 0;
//   let compDisplayOrder = 0;
//   let ingDisplayOrder = 0;
//   let errorMessage = "";
//   const ingredientsData = [];
//   const errorBoxes = {};
//   const errorCompBox ={};
//   let componentInputText ="";
//   let componentIndex = -1;

//   // Iterate through each row
//   rows.forEach((row, index) => {
//     const isThisRowComponent = row.classList.contains("component-row");
//     const isThisRowIngredient = row.classList.contains("ingredient-row");
    
//     if(isThisRowComponent){
//       const compText = row.querySelector(`input[name^="component_text_"]`);
      
//       // extract the index number attached to value fields like errorName_${index}
//       const match = compText.name.match(/_(\d+)$/);
//       const realIndex = match ? match[1] : null;
//       if (!realIndex) return;

//       // Get error display elements
//       errorCompBox[`errorCompText_${realIndex}`] = document.getElementById(`errorCompText_${realIndex}`);

//       // Reset Error messages
//       errorCompBox[`errorCompText_${realIndex}`].textContent = "";

//       // Collect values from all fields of component rows
//       const values = [
//         compText.value.trim()
//       ];

//       // Check if all fields are filled
//       const isAllFieldsFilled = values.every(v => v !== "");

//       // Validate that partially filled rows are not allowed
//       if (!isAllFieldsFilled) {
//         if(compText.value.trim() == ""){errorCompBox[`errorCompText_${realIndex}`].textContent =  "Component text required" };
//         errorMessage = `Check all the fields. One or more errors found.`;
//       }

//       //check if previous component has any ingredient. Cant be empty rows for ingredient
//       if (componentIndex != -1){
//         // console.log(ingredientsData[componentIndex].ingredients);
//         if(ingredientsData[componentIndex].ingredients.length === 0){
//           heading = ingredientsData[componentIndex].component_input_text;
//           errorMessage = `Cant have empty ingredients within sub heading -${heading}-. Either remove it or add ingredients`
//         };
//       };

//       // Process filled component
//       if (isAllFieldsFilled && errorMessage == "") {
//         compDisplayOrder++;
//         componentIndex++;
//         componentInputText = compText.value;
//         const componentObj = {
//           component_display_order : parseInt(compDisplayOrder),
//           component_input_text : componentInputText
//         };
//         // Create empty list for ingredients
//         componentObj.ingredients = [];

//         ingredientsData.push(componentObj);
        
//       };
//     };

//     // if row is ingredient row then check and validate its field and reset error message and display if exist
//     if(isThisRowIngredient){
//       // Get input and select elements for the row
//       const nameInput = row.querySelector(`input[name^="ingredient_name_"]`);
//       const quantityInput = row.querySelector(`input[name^="quantity_"]`);
//       const unitSelect = row.querySelector(`select[name^="unit_"]`);
//       const baseQtyInput = row.querySelector(`input[name^="base_quantity_"]`);
//       const baseUnitInput = row.querySelector(`input[name^="base_unit_"]`);
//       const basePriceInput = row.querySelector(`input[name^="base_price_"]`);

//       // extract the index number attached to value fields like errorName_${index}
//       const match = nameInput.name.match(/_(\d+)$/);
//       const realIndex = match ? match[1] : null;
//       if (!realIndex) return;
//       // Get error display elements
//       errorBoxes[`errorIngName_${realIndex}`] = document.getElementById(`errorIngName_${realIndex}`);
//       errorBoxes[`errorQuantity_${realIndex}`] = document.getElementById(`errorQuantity_${realIndex}`);
//       errorBoxes[`errorUnit_${realIndex}`] = document.getElementById(`errorUnit_${realIndex}`);
//       errorBoxes[`errorBaseQuantity_${realIndex}`] = document.getElementById(`errorBaseQuantity_${realIndex}`);
//       errorBoxes[`errorBaseUnit_${realIndex}`] = document.getElementById(`errorBaseUnit_${realIndex}`);
//       errorBoxes[`errorBasePrice_${realIndex}`] = document.getElementById(`errorBasePrice_${realIndex}`);
//       //const  = document.getElementById(`_${index}`);

//       // Reset Error messages
//       errorBoxes[`errorIngName_${realIndex}`].textContent =  "";
//       errorBoxes[`errorQuantity_${realIndex}`].textContent =  "";
//       errorBoxes[`errorUnit_${realIndex}`].textContent =  "";
//       errorBoxes[`errorBaseQuantity_${realIndex}`].textContent =  "";
//       errorBoxes[`errorBaseUnit_${realIndex}`].textContent =  "";
//       errorBoxes[`errorBasePrice_${realIndex}`].textContent =  "";

//       // Collect values from all fields
//       const values = [
//         nameInput.value.trim(),
//         quantityInput.value.trim(),
//         unitSelect.value.trim(),
//         baseQtyInput.value.trim(),
//         baseUnitInput.value.trim(),
//         basePriceInput.value.trim()
//       ];

//       // //console.log("Quantity Input: ", quan)
//       // Check if any field is filled
//       const isAnyFieldFilled = values.some(v => v !== "");
//       // Check if all fields are filled
//       const isAllFieldsFilled = values.every(v => v !== "");

//       // Validate that partially filled rows are not allowed
//       if (isAnyFieldFilled && !isAllFieldsFilled) {
//         if(nameInput.value.trim() == ""){errorBoxes[`errorIngName_${realIndex}`].textContent =  "Name required" };
//         if(quantityInput.value.trim() == ""){errorBoxes[`errorQuantity_${realIndex}`].textContent =  "Quantity required" };
//         if(unitSelect.value.trim() == ""){errorBoxes[`errorUnit_${realIndex}`].textContent =  "Select a Unit" };
//         if(baseQtyInput.value.trim() == ""){errorBoxes[`errorBaseQuantity_${realIndex}`].textContent =  "Base quantity required" };
//         if(baseUnitInput.value.trim() == ""){errorBoxes[`errorBaseUnit_${realIndex}`].textContent =  "Base Unit required" };
//         if(basePriceInput.value.trim() == ""){errorBoxes[`errorBasePrice_${realIndex}`].textContent =  "Base Price required" };
//         errorMessage = `Check all the fields. One or more errors found.`;
//       }

//       // Process fully filled rows
//       if (isAllFieldsFilled) {
//         filledRowsCount++;
//         ingDisplayOrder++;
//         const ingredientObj = {
//           ingredient_id: parseInt(row.dataset.ingredientId),
//           quantity: parseFloat(quantityInput.value),
//           unit_id: parseInt(unitSelect.value),
//           ing_display_order : ingDisplayOrder
//         };

//         // Include base fields only if they differ from original values
//         if (parseFloat(baseQtyInput.value) != parseFloat(baseQtyInput.dataset.original) ||
//             baseUnitInput.value != baseUnitInput.dataset.original ||
//             parseFloat(basePriceInput.value) != parseFloat(basePriceInput.dataset.original)) {
//           ingredientObj.base_quantity = parseFloat(baseQtyInput.value);
//           ingredientObj.base_unit = baseUnitInput.value;
//           ingredientObj.base_price = parseFloat(basePriceInput.value);
//         }

//         if(componentIndex == -1){
//           componentIndex++;
//           ingredientsData[componentIndex] = {};
//           ingredientsData[componentIndex].component_display_order = 0;
//           ingredientsData[componentIndex].component_input_text = "";
//           ingredientsData[componentIndex].ingredients = [];
//         } else {        };
//         // console.log("componentIndex :", componentIndex);
//         ingredientsData[componentIndex].ingredients.push(ingredientObj);
//       }
//     };
//   });

//   //check if previous component has any ingredient. Cant be empty rows for ingredient
//   if (componentIndex != -1){
//     // console.log(ingredientsData[componentIndex].ingredients);
//     if(ingredientsData[componentIndex].ingredients.length === 0){
//       heading = ingredientsData[componentIndex].component_input_text;
//       errorMessage = `Cant have empty ingredients within sub heading -${heading}-. Either remove it or add ingredients`
//     };
//   }

//   // Ensure at least two rows are fully filled
//   if (!errorMessage && filledRowsCount < 2) {
//     errorMessage = "At least 2 rows of ingredients must be fully filled.";
//   }

//   // Display error if validation fails
//   if (errorMessage) {
//     document.getElementById("error").textContent = errorMessage;
//     return false;
//   }

//   // Clear error and return validated ingredient data
//   document.getElementById("error").textContent = "";
//   return ingredientsData;
// }

// validation of ingredient data
function validateIngredientRows() {
    const rows = Array.from(document.querySelectorAll("#ingredients-tbody tr"));//.filter(row => row.dataset.removed !== "true");
    // const deletedRows = Array.from(document.querySelectorAll("#ingredients-tbody tr")).filter(row => row.dataset.removed === "true");
    // const filledRows = [];
    const add_ingredients = [];
    const add_components = [];
    const update_ingredients = [];
    const update_components = [];
    const remove_ingredients = [];
    const remove_components = [];

    let filledRowsCount = 0;
    let compDisplayOrder = 0;
    let ingDisplayOrder = 0;
    // let errorMessage = "";
    const ingredientsData = [];
    const ingredientsCheckWithOriginalData = [];
    const errorBoxes = {};
    const errorCompBox ={};
    let componentInputText ="";
    let componentIndex = -1;
    let recipe_component_id;

    let errorMessage = "";

    rows.forEach((row, index) => {
        const isThisRowComponent = row.classList.contains("component-row");
        const isThisRowIngredient = row.classList.contains("ingredient-row");
    
        if(isThisRowComponent){
            // check if the rows is removed
            recipe_component_id = row.dataset.recipeComponentId; // may be undefined

            // check if component row is removed and put it in the remove_component Obj
            if(row.dataset.removed === 'true'){
                remove_components.push({ 
                    recipe_component_id: parseInt(recipe_component_id),
                    component_display_order: parseInt(compDisplayOrder)
                });
                return;
            };
            
            const compTextField = row.querySelector(`input[name^="component_text_"]`);
            const compText = compTextField.value.trim().replace(/\s+/g, " ");
            // extract the index number attached to value fields like errorName_${index}
            const match = compTextField.name.match(/_(\d+)$/);
            const realIndex = match ? match[1] : null;
            if (!realIndex) return;

            // Get error display elements
            errorCompBox[`errorCompText_${realIndex}`] = document.getElementById(`errorCompText_${realIndex}`);

            // Reset Error messages
            errorCompBox[`errorCompText_${realIndex}`].textContent = "";

            // Collect values from all fields of component rows
            const values = [compText];

            // Check if all fields are filled
            const isAllFieldsFilled = values.every(v => v !== "");

            // validate if the 1st component display is none or block. if block then text cant be empty
            if (!isAllFieldsFilled && index === 0) {
                if(row.style.display != "none"){
                    if(compText == ""){errorCompBox[`errorCompText_${realIndex}`].textContent =  "Component text required" };
                    errorMessage = `Check first component fields.`;
                    console.log(errorMessage);
                }
            }
            

            // Validate that empty field of components are not allowed EXCEPT for index 0 (first row)
            if (!isAllFieldsFilled && index !== 0) {
                if(compText == ""){errorCompBox[`errorCompText_${realIndex}`].textContent =  "Component text required" };
                errorMessage = `Check all the fields. One or more errors found.`;
            }

            // check the very 1st component. if component_text(hidden component) and its ingredients are empty 
            // then reset the componentIndex which will make the next component as very 1st component from future.
            if (componentIndex === 0){
                const prevComponent = ingredientsData[componentIndex];
                if(prevComponent.component_text == ''){
                    if(prevComponent.ingredients.length === 0){
                        componentIndex = -1;
                        compDisplayOrder = 0;
                        update_components.pop();
                    }
                } else if(prevComponent.component_text !== ''){
                    const prevComponent = ingredientsData[componentIndex];
                    if(prevComponent && prevComponent.ingredients.length === 0){
                        const subheading = prevComponent.component_text;
                        errorMessage = `Cant have empty ingredients within sub heading -${subheading}-. Either remove it or add ingredients`
                    } 
                }               
            }

            // as above we have spcl condition for very 1st component, we will now check other components below
            // check if previous(which is not the 1st component) has any ingredient. Cant be empty rows for ingredient
            if (componentIndex !== 0 && componentIndex !== -1){
                const prevComponent = ingredientsData[componentIndex];
                if(prevComponent && prevComponent.ingredients.length === 0){
                    const subheading = prevComponent.component_text;
                    errorMessage = `Cant have empty ingredients within sub heading -${subheading}-. Either remove it or add ingredients`
                }                            
            };

            // Process filled component
            if ((isAllFieldsFilled || index == 0) && errorMessage == "") {
                componentInputText = compText; // used to add text for different ingredineet
                componentIndex++; // used to check the previous compoenents have ingredients
                const componentObj = {
                    component_display_order: parseInt(compDisplayOrder),
                    component_text: compText,
                    // ingredients: []
                };
                if (recipe_component_id) {
                    componentObj.recipe_component_id = parseInt(recipe_component_id);
                    update_components.push(structuredClone(componentObj));
                } else {
                    add_components.push(structuredClone(componentObj));
                }

                // ingredientsCheckWithOriginalData.push(componentObj);
                componentObj.ingredients = [];
                ingredientsData.push(componentObj);
                compDisplayOrder++;
            };
        };

        if(isThisRowIngredient){
            // check if the rows is removed
            const recipe_ingredient_id = row.dataset.recipeIngredientId; // may be undefined

            if(row.dataset.removed === 'true'){
                remove_ingredients.push({ recipe_ingredient_id: parseInt(recipe_ingredient_id)});
                return;
            };

            // Get input and select elements for the row
            const nameInput = row.querySelector(`input[name^="ingredient_name_"]`);
            const quantityInput = row.querySelector(`input[name^="quantity_"]`);
            const unitSelect = row.querySelector(`select[name^="unit_"]`);
            const baseQtyInput = row.querySelector(`input[name^="base_quantity_"]`);
            const baseUnitInput = row.querySelector(`select[name^="base_unit_"]`);
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
                if(baseUnitInput.value.trim() == ""){errorBoxes[`errorBaseUnit_${realIndex}`].textContent =  "Select Base Unit" };
                if(basePriceInput.value.trim() == ""){errorBoxes[`errorBasePrice_${realIndex}`].textContent =  "Base Price required" };
                errorMessage = `Check all the fields. One or more errors found.`;
            }
            // check if recipe_ingredient_id exists and no fields are field then push that row in remove_ingredient
            if(recipe_ingredient_id && !isAnyFieldFilled){
                remove_ingredients.push({recipe_ingredient_id: parseInt(recipe_ingredient_id)});
                return;
            }
            // Process fully filled rows
            if (isAllFieldsFilled) {
                filledRowsCount++;
                ingDisplayOrder++;
                const ingredientObj = {
                    ingredient_id: parseInt(row.dataset.ingredientId),
                    quantity: parseFloat(quantityInput.value),
                    unit_id: parseInt(unitSelect.value),
                    ingredient_display_order : ingDisplayOrder,
                    component_display_order : compDisplayOrder-1,
                    component_text : componentInputText
                };

                ingredientsCheckWithOriginalData[filledRowsCount-1] = {};
                ingredientsCheckWithOriginalData[filledRowsCount-1].ingredient_id= parseInt(row.dataset.ingredientId);
                ingredientsCheckWithOriginalData[filledRowsCount-1].quantity= parseFloat(quantityInput.value);
                ingredientsCheckWithOriginalData[filledRowsCount-1].unit_id= parseInt(unitSelect.value);
                ingredientsCheckWithOriginalData[filledRowsCount-1].ing_display_order = ingDisplayOrder;
                ingredientsCheckWithOriginalData[filledRowsCount-1].unit = baseUnitInput.value;
                ingredientsCheckWithOriginalData[filledRowsCount-1].base_price = parseFloat(basePriceInput.value);
                ingredientsCheckWithOriginalData[filledRowsCount-1].base_quantity = parseFloat(baseQtyInput.value);
                ingredientsCheckWithOriginalData[filledRowsCount-1].component_display_order = compDisplayOrder-1;
                ingredientsCheckWithOriginalData[filledRowsCount-1].component_text = componentInputText;
                if (recipe_component_id){
                    ingredientsCheckWithOriginalData[filledRowsCount-1].recipe_component_id = parseInt(recipe_component_id);
                    ingredientObj.recipe_component_id = parseInt(recipe_component_id);
                }
                // Include base fields only if they differ from original values
                if (parseFloat(baseQtyInput.value) != parseFloat(row.dataset.defaultBaseQuantity) ||
                    baseUnitInput.value != row.dataset.defaultBaseUnit ||
                    parseFloat(basePriceInput.value) != parseFloat(row.dataset.defaultBasePrice)) {
                ingredientObj.base_quantity = parseFloat(baseQtyInput.value);
                ingredientObj.base_unit = baseUnitInput.value;
                ingredientObj.base_price = parseFloat(basePriceInput.value);
                };

                // creating one more variable for complete row obj to check with original data
                // const rowObj = ingredientObj;

                
                
                 if (row.dataset.recipeIngredientId !== undefined){
                        ingredientsCheckWithOriginalData[filledRowsCount-1].recipe_ingredient_id= parseInt(row.dataset.recipeIngredientId);
                        ingredientObj.recipe_ingredient_id= parseInt(row.dataset.recipeIngredientId);
                        update_ingredients.push(ingredientObj);
                } else {
                        add_ingredients.push(ingredientObj);
                };
                
                // console.log("componentIndex :", componentIndex);
                if(componentIndex !== -1){
                    ingredientsData[componentIndex].ingredients.push(ingredientObj);
                }    
            };
        };
    });

    // after scaning whole table, Now check for errorMessage and total number of ingredients
    if (!errorMessage && filledRowsCount < 2) {
        errorMessage = "At least 2 rows of ingredients must be fully filled.";
    }

    if (errorMessage) {
        document.getElementById("error").textContent = errorMessage;
        // return false;
        return {hasError: true, remove_components: null, add_components: null, update_components: null,
                remove_ingredients: null, add_ingredients: null, update_ingredients: null, ingredientsData: null,
            errorMessage: errorMessage};
    }

    // NEW: Calculate order changes for PATCH
    // const orderUpdates = calculateNewOrders();
    return {hasError: false, remove_components, add_components, update_components,
            remove_ingredients, add_ingredients, update_ingredients, ingredientsData,
            errorMessage: null};
    // return { filledRows, add_ingredients, update_ingredients, remove_ingredients, orderUpdates, errorMessage: null };
}

//compare the original recipe ingredients and new. Only attach those that are not same - i.e. updated.
function getRecipePayload(originalRecipeData, completeRecipeData) {
    const payload = {};

    // Compare top-level recipe fields
    if (completeRecipeData.recipe.name !== originalRecipeData.recipe.name) {
        payload.name = completeRecipeData.recipe.name;
    }
    if (completeRecipeData.recipe.portion_size !== originalRecipeData.recipe.portion_size) {
        payload.portion_size = completeRecipeData.recipe.portion_size;
    }
    if (completeRecipeData.recipe.description !== originalRecipeData.recipe.description) {
        payload.description = completeRecipeData.recipe.description;
    }

    // --- Component Removals (always include) ---
    payload.remove_components = completeRecipeData.ingredients.remove_components;

    // --- Component Additions (always include) ---
    payload.add_components = completeRecipeData.ingredients.add_components;

    // --- Component Updates (check with original recipe data) ---
    payload.update_components = completeRecipeData.ingredients.update_components
        .map(updatedRow => {
            const originalRow = originalRecipeData.ingredients.find(
                comp => comp.recipe_component_id === updatedRow.recipe_component_id
            );

            if (!originalRow) return updatedRow; // this row idealy should never run

            const changes = { recipe_component_id: updatedRow.recipe_component_id };

            // CASE 1: Ingredient changed
            if (updatedRow.component_text !== originalRow.component_text) {
                changes.compoent_text = updatedRow.component_text;
            };
            if (updatedRow.component_display_order !== originalRow.component_display_order){
                changes.component_display_order = updatedRow.component_display_order;
            };

            return Object.keys(changes).length > 1 ? changes : null;
        })
    .filter(Boolean);

    // --- ingredient Removals (always include) ---
    payload.remove_ingredients = completeRecipeData.ingredients.remove_ingredients;

    // --- ingredients Additions (clean + selective fields) ---
    payload.add_ingredients = completeRecipeData.ingredients.add_ingredients.map(newRow => {
        const cleaned = {
            ingredient_id: newRow.ingredient_id,
            quantity: parseFloat(newRow.quantity),
            unit_id: parseInt(newRow.unit_id),
            component_display_order: parseInt(newRow.component_display_order),
            ingredient_display_order: parseInt(newRow.ingredient_display_order)
        };

        // Compare against defaults
        const defaultBaseQuantity = parseFloat(newRow._default_base_quantity);
        const defaultBaseUnit = newRow._default_base_unit;
        const defaultBasePrice = parseFloat(newRow._default_base_price);

        if (
            parseFloat(newRow.base_quantity) !== defaultBaseQuantity ||
            newRow.base_unit !== defaultBaseUnit ||
            parseFloat(newRow.base_price) !== defaultBasePrice
            ){
            cleaned.base_quantity = parseFloat(newRow.base_quantity);
            cleaned.base_unit = newRow.base_unit;
            cleaned.base_price = Number(parseFloat(newRow.base_price).toFixed(2));
        }

        return cleaned;
    });

    // --- ingredient Updates (your existing logic with tweak above) ---
    payload.update_ingredients = completeRecipeData.ingredients.update_ingredients
        .map(updatedRow => {
            const originalRow = originalRecipeData.ingredients.find(
                ing => ing.recipe_ingredient_id === updatedRow.recipe_ingredient_id
            );

            if (!originalRow) return updatedRow;

            const changes = { recipe_ingredient_id: updatedRow.recipe_ingredient_id };

            //  change in display order
            if (updatedRow.ingredient_display_order != originalRow.ingredient_display_order){
                 changes.ingredient_display_order = updatedRow.ingredient_display_order;
            }

            // CASE 1: Ingredient changed
            if (updatedRow.ingredient_id && updatedRow.ingredient_id !== originalRow.ingredient_id) {
                changes.ingredient_id = updatedRow.ingredient_id;
                changes.quantity = parseFloat(updatedRow.quantity);
                changes.unit_id = parseInt(updatedRow.unit_id);

                // const newDefaults = {
                //     base_quantity: parseFloat(updatedRow._default_base_quantity),
                //     base_unit: updatedRow._default_base_unit,
                //     base_price: parseFloat(updatedRow._default_base_price)
                // };

                if (updatedRow.default_base_unit
                    // parseFloat(updatedRow.base_quantity) !== originalRow.dataset.defaultBaseQuantity ||
                    // updatedRow.base_unit !== originalRow.dataset.defaultBaseUnit ||
                    // parseFloat(updatedRow.base_price) !== originalRow.dataset.defaultBasePrice
                ) {
                    changes.base_quantity = parseFloat(updatedRow.base_quantity);
                    changes.base_unit = updatedRow.base_unit;
                    changes.base_price = parseFloat(updatedRow.base_price.toFixed(2));
                }

                return changes;
            }

            // CASE 2: Same ingredient
            if(updatedRow.ingredient_id === originalRow.ingredient_id){
                    if (parseFloat(updatedRow.quantity) !== parseFloat(originalRow.quantity)) {
                    changes.quantity = parseFloat(updatedRow.quantity);
                }
                if (parseInt(updatedRow.unit_id) !== parseInt(originalRow.unit_id)) {
                    changes.unit_id = parseInt(updatedRow.unit_id);
                }

                if (updatedRow.base_unit
                    // parseFloat(updatedRow.base_quantity) !== parseFloat(originalRow.base_quantity) ||
                    // updatedRow.base_unit !== originalRow.unit ||
                    // parseFloat(updatedRow.base_price) !== Number(parseFloat(originalRow.base_price).toFixed(2))
                ) {
                    changes.base_quantity = parseFloat(updatedRow.base_quantity);
                    changes.base_unit = updatedRow.base_unit;
                    changes.base_price = parseFloat(updatedRow.base_price.toFixed(2));
                }
            }
            

            return Object.keys(changes).length > 1 ? changes : null;
        })
        .filter(Boolean);

    return payload;
}

// reload recipe for edit via reset button
function resetLoadRecipeForEdit(data){
    // populate form fields with data.recipe, ingredients, steps...
    document.getElementById("recipe-name-input").value = data.recipe.name;
    document.getElementById("portion-size-input").value = data.recipe.portion_size;
    document.getElementById("description-input").value = data.recipe.description;

    // Populate ingredients table
    const ingredients = data.ingredients;// console.log("ingredients:", ingredients);
    const totalIngredientRows = ingredients.length; // console.log("total rows from db are :", totalIngredientRows);
    const tbody = document.getElementById("ingredients-tbody");
    tbody.innerHTML = ""; // clear existing rows

    // Get unique component_display_order values in ascending order
    const uniqueComponents = [...new Set(ingredients.map(item => item.component_display_order))].sort((a, b) => a - b);
    
    let rowIndex = 0;
    // Iterate through each component_display_order
    for (const order of uniqueComponents) {
        // Get the component_text for the first item of this component_display_order
        const component = ingredients.find(item => item.component_display_order === order);
        const componentText = component.component_text ? component.component_text.trim() : "";
        
        // Before create component row, check if the rowIndex is more than 0 to add empty ingredient row
        if (rowIndex !== 0){
            const tr = document.createElement("tr");
            tr.classList.add("ingredient-row");
            tr.innerHTML = getEmptyIngredientRow(rowIndex);
            tbody.appendChild(tr);
            rowIndex++                
            initializeIngredientRow(tr, token);
            
        }
        
        const componentRow = document.createElement("tr");
        componentRow.classList.add("component-row");
        componentRow.dataset.recipeComponentId = component.recipe_component_id || 0;
        componentRow.innerHTML = `
            <td colspan="7" style="background-color:#f2f2f2; font-weight:bold;">
            <input type="text" name="component_text_${rowIndex}" value="${componentText}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
            <div class="error-create-recipe" id="errorCompText_${rowIndex}"></div>
            </td>
            <td><button class="remove-component-btn">Remove</button></td>
        `;
        
        // Only create a component row if component_text is non-empty
        if (componentText == "" && rowIndex == 0) {
            componentRow.style.display="none";
        }
        tbody.appendChild(componentRow);
        rowIndex++

        // create rows for ingredient for the component above in ascending order
        componentIngredients = ingredients.filter(item => item.component_display_order === component.component_display_order).sort((a,b) => a.ingredient_display_order - b.ingredient_display_order);        
        for (const i of componentIngredients) {
            const tr = document.createElement("tr");
            tr.classList.add("ingredient-row");
            tr.dataset.recipeIngredientId = i.recipe_ingredient_id || "";
            tr.dataset.ingredientId = i.ingredient_id || "";
            tr.dataset.originalOrder = rowIndex || 0;
            tr.innerHTML = `
                <td style="position: relative;">
                    <input type="text" name="ingredient_name_${rowIndex}" class="ingredient-input" value="${i.name}" placeholder="Eg. Milk" autocomplete="off">
                    <div class="suggestions" id="suggestions_${rowIndex}"></div>
                    <div class="error-create-recipe" id="errorIngName_${rowIndex}"></div>
                </td>
                <td>
                    <input type="number" step="any" name="quantity_${rowIndex}" placeholder="Qty" class="validated-number" value="${i.quantity}">
                    <div class="error-create-recipe" id="errorQuantity_${rowIndex}"></div>
                </td>
                <td>
                    <select name="unit_${rowIndex}" class="unit-select">
                        <option value="${i.unit_id}"> ${i.unit_name} </option>
                    </select>
                    <div class="error-create-recipe" id="errorUnit_${rowIndex}"></div>
                </td>
                <td class="cost-input" style="text-align: center;"></td>
                <td>
                    <input type="number" step="any" name="base_quantity_${rowIndex}" placeholder="Base Qty" min="0.01" class="validated-number" value="${Number(1)}">
                    <div class="error-create-recipe" id="errorBaseQuantity_${rowIndex}"></div>
                </td>
                <td>
                    <select name="base_unit_${rowIndex}" class="base-unit-select">
                        <option value="${i.unit}"> ${i.unit} </option>
                    </select>
                    <div class="error-create-recipe" id="errorBaseUnit_${rowIndex}"></div>
                </td>
                <td>
                    <input type="number" step="any" name="base_price_${rowIndex}" placeholder="Base Price" min="0.01" class="validated-number" value="${Number(i.base_price).toFixed(2)}">
                    <div class="error-create-recipe" id="errorBasePrice_${rowIndex}"></div>
                </td>
                <td><button class="remove-ingredient-btn">Remove</button></td>
            `;
            tbody.appendChild(tr);
            rowIndex++
            
            populateUnits(tr, token);
            populateBaseUnits(tr);
            recalcCost(tr);
            initializeIngredientRow(tr, token);

            // For normal quantity (only number without -/+ signs and no e. Also 3 decimal places)
            // enforceQuantityValidation(tr.querySelector('input[name^="quantity_"]'),{allowDecimal : 3});

            // // For base quantity (only number without -/+ signs and no e. Also 3 decimal places)
            // enforceQuantityValidation(tr.querySelector('input[name^="base_quantity_"]'), {allowDecimal : 3});

            // // For base price (only number without -/+ signs and no e. Also 2 decimal places)
            // enforceQuantityValidation(tr.querySelector('input[name^="base_price_"]'), {allowDecimal : 3});

            
        };
    };
    // add an empty ingredientrow at the end of table. (kept in 'if' for easy understanding)
    if (true) {
        const tr = document.createElement("tr");
        tr.classList.add("ingredient-row");
        tr.innerHTML = getEmptyIngredientRow(rowIndex);
        tbody.appendChild(tr);
        rowIndex++                
        // await populateUnits(tr, token);
        // populateBaseUnits(tr);
        // recalcCost(tr);
        initializeIngredientRow(tr, token);
        
    };
    // update total cost
    updateTotalRecipeCost();

    // Populate steps
    steps = data.steps;
    const stepsContainer = document.getElementById("steps-container");
    stepsContainer.innerHTML = "";
    steps.forEach(s => {
    const div = document.createElement("div");
    div.classList.add("step-row");
    div.innerHTML = `
        <textarea class="step-text">${s.step_text}</textarea>
        <button class="remove-step-btn">Remove</button>
    `;
    stepsContainer.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const tbody = document.getElementById("ingredients-tbody");
    const addFirstComponentBtn = document.getElementById(`add-first-component-btn`);
    const addComponentBtn = document.getElementById(`add-component-btn`);

    // component buttons to add the heading for the ingredient list
    [addFirstComponentBtn, addComponentBtn].forEach( button => 
        button.addEventListener("click", function () {
            const rows = Array.from(tbody.querySelectorAll("tr"));
            // Depending on the button, place it on the top or at the bottom
            if(button == addFirstComponentBtn){
                // tbody.prepend(tr);
                const tr = rows[0];
                tr.style.display = 'table-row';
                addFirstComponentBtn.style.display ='none';
            } else if(button == addComponentBtn){
                 const index = rows.length;
                // Create the component row
                const tr = document.createElement("tr");
                tr.classList.add("component-row");
                tr.innerHTML = getEmptyComponentRow(index);
                tbody.appendChild(tr);
                addComponentBtn.style.display ='none';
                 attachRowListeners(tr);
            };   
           
        })
    );

    // Calculate new display_order for rows and detect changes for PATCH
    function calculateNewOrders() {
        const rows = document.querySelectorAll("#ingredients-tbody tr");
        const orderUpdates = []; 

        rows.forEach((row, index) => {
            // Skip removed rows
            if (row.dataset.removed === "true") return;

            const newOrder = index + 1; 
            const recipeIngredientId = row.dataset.recipeIngredientId;

            // Only check existing rows (with ID) for order changes
            if (recipeIngredientId) {
                const originalOrder = parseInt(row.dataset.originalOrder) || 0;
                if (newOrder !== originalOrder) {
                    orderUpdates.push({
                        recipe_ingredient_id: parseInt(recipeIngredientId),
                        display_order: newOrder
                    });
                }
            }
        });

        return orderUpdates;
    }
    
    // remove-button logic for ingredients
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-ingredient-btn")) {
            const row = e.target.closest("tr");
            const recipeIngredientId = row.dataset.recipeIngredientId;
            const ingredientName = row.querySelector('input[name^="ingredient_name_"]').value;

            // If ingredient is empty, remove row immediately
            if (!ingredientName) {
                row.remove();
                //updateTotalRecipeCost();
                return;
            }

            // Ask for confirmation using the modal
            const confirmed = await showConfirm(`Remove ${ingredientName}?`);

            if (!confirmed) return; // user cancelled
            if (recipeIngredientId) {
            // Mark the row as removed
            row.dataset.removed = "true";
            row.style.display = "none";
            } else {
            // New ingredient row → remove from DOM
            row.remove();
            }

            // Recalculate total cost if needed
            updateTotalRecipeCost();
        }
    });

    // remove-button logic for components 
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-component-btn")) {
            const currentRow = e.target.closest("tr");
            const tbody = document.getElementById("ingredients-tbody");
            const rows = Array.from(tbody.querySelectorAll("tr")).filter(row => row.dataset.removed !== "true");
            const currentRowIndex = rows.indexOf(currentRow); //
            const componentName = currentRow.querySelector('input[name^="component_text_"]').value;
            const prevRow = rows[currentRowIndex - 1];

            // If current component index is 0 i.e. very first at the top component then display:none and addFirstComponentBtn display:block
            if (currentRowIndex == 0){
                const firstCellInput = rows[0].querySelector('td input');
                if (firstCellInput) firstCellInput.value = "";
                rows[0].style.display = 'none';
                addFirstComponentBtn.style.display="block";
                return;
            }

            // component text is empty and if recipeComponentId DOESNT exist then remove tr
            if (!componentName && !rows[currentRowIndex].dataset.recipeCompnentId) {
                if (rows[currentRowIndex + 1]) {
                    prevRow.remove();
                } else {
                    addComponentBtn.style.display="block";
                }
                currentRow.remove();
                return;
            }
            
            // Ask for confirmation using the modal
            const confirmed = await showMultiConfirm(`Remove ${componentName}?`,componentName);

            // component text present and if recipeComponentId DOESNT exist
            if(componentName && !rows[currentRowIndex].dataset.recipeComponentId ){
                if (confirmed === "component") {
                    currentRow.remove();
                    //document.getElementById(`add-first-component-btn`).style.display="block";
                    if (currentRowIndex > 0) {
                        prevRow.remove();
                    }
                } else if (confirmed === "with-ingredients") {
                    let nextIndex = currentRowIndex + 1;
                    while (rows[nextIndex] && !rows[nextIndex].classList.contains("component-row")) {
                        const nextRow = rows[nextIndex];
                        nextRow.remove();
                        nextIndex++;
                    };
                    currentRow.remove();
                } else {
                    return;
                };
            };
           
            // if row created thru data fetched from db i.e. recipeComponentId exist
            if(rows[currentRowIndex].dataset.recipeComponentId){
                if (confirmed === "component") {
                    currentRow.dataset.removed = 'true';
                    currentRow.style.display = 'none';
                    //document.getElementById(`add-first-component-btn`).style.display="block";
                    if (currentRowIndex > 0) {
                        prevRow.remove();
                    }
                } else if (confirmed === "with-ingredients") {
                    let nextIndex = currentRowIndex + 1;
                    while (rows[nextIndex] && !rows[nextIndex].classList.contains("component-row")) {
                        const nextRow = rows[nextIndex];
                        if(nextRow.dataset.recipeIngredientId){
                            nextRow.dataset.removed ='true';
                            nextRow.style.display = 'none';
                        }else{
                            nextRow.remove();
                        }
                        nextIndex++;
                    };
                    currentRow.dataset.removed = 'true';
                    currentRow.style.display = 'none';
                } else {
                    return;
                };

            };

            // Recalculate total cost if needed
            updateTotalRecipeCost();
        }
    });

    // cancel changes (dont do any changes and go back to previous page)
    document.getElementById("cancel-edit-btn").addEventListener("click", ()=>{
        window.history.back();
    });

    // reset any changes and stay on same page 
    // (does NOT go back or fetch from back end.rather reload from the originalRecipeData object)
    document.getElementById("reset-recipe-btn").addEventListener("click", ()=>{
        resetLoadRecipeForEdit(originalRecipeData);
    });

    // submitting changes of recipe Save BUTTON
    document.getElementById("save-recipe-btn").addEventListener("click", async () => {
        
        let completeRecipeData = {};
        const errorBox = document.getElementById(`error`);
        errorBox.textContent = "";
        // Validating all sections of the form. First with RECIPE table data
        const recipeData = validateRecipeForm();
        if (!recipeData){
            errorBox.textContent = "Check all the fields. One or more errors found.";
            return;
        } 
        // validating Ingredients(table) with the recipe of the form
        const ingredientsData  = validateIngredientRows();
        if (ingredientsData.hasError) {
            // console.log("error from ingredients table:", ingredientsData.errorMessage);
            return;
        }
        // const stepsData = validateStepsForm();
        // if (!stepsData) return;

        completeRecipeData.recipe = recipeData;
        completeRecipeData.ingredients = ingredientsData;
        completeRecipeData.steps = [];
        console.log("compelete recipe data :", completeRecipeData);

        const recipePayload = getRecipePayload(originalRecipeData, completeRecipeData);
        console.log("recipePayLoad is:", recipePayload);
        // return;
        //console.log("originalRecipeData : ", originalRecipeData);

        // Submit recipe to backend API
        //console.log(" recipeId :", recipeId)
        try {
        const response = await fetch(`/recipes/api/update-recipe/${recipeId}`, {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(recipePayload)
        });
        const data = await response.json();
        //console.log("After fetch command for update-recipe", response)

        if (!response.ok) {
            errorBox.textContent = data.error || "Something went wrong while doing api fetch for update-recipe.";
            console.log("Submitted data (for debug):", data.submitted_data);
            return;
        };

        // // NEW: After main update succeeds, PATCH any changed orders
        // for (const update of orderUpdates) {
        //     try {
        //         const orderResponse = await fetch(`/recipes/api/ingredient-order/${update.recipe_ingredient_id}`, {
        //             method: "PATCH",
        //             headers: {
        //                 "Content-Type": "application/json",
        //                 "Authorization": `Bearer ${token}`
        //             },
        //             body: JSON.stringify({ display_order: update.display_order })
        //         });
        //         const orderData = await orderResponse.json();
        //         if (!orderResponse.ok) {
        //             console.warn("Order update failed for ID", update.recipe_ingredient_id, ":", orderData.error);
        //             // Don't block success—log and continue
        //         } else {
        //             console.log("Order updated successfully for ID", update.recipe_ingredient_id);
        //         }
        //     } catch (orderErr) {
        //         console.error("Error updating order for ID", update.recipe_ingredient_id, ":", orderErr);
        //     }
        // }
        
        // Display success message and redirect
        showAlert(data.message || "Recipe updated successfully!");
        setTimeout(() => { window.location.href = `/recipes/details/${recipeId}`; }, 1000);
        } catch (err) {
        errorBox.textContent = err.message;
        }        

    });
    
});

