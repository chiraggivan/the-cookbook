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
                // await populateUnits(tr, token);
                // populateBaseUnits(tr);
                // recalcCost(tr);
                initializeIngredientRow(tr, token);
                
            }
            // Only create a component row if component_text is non-empty
            if (componentText) {
                const componentRow = document.createElement("tr");
                componentRow.classList.add("component-row");
                // tr.dataset.originalOrder = rowIndex || 0;
                componentRow.innerHTML = `
                    <td colspan="7" style="background-color:#f2f2f2; font-weight:bold;">
                    <input type="text" name="component_text_${rowIndex}" value="${componentText}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
                    <div class="error-create-recipe" id="errorCompText_${rowIndex}"></div>
                    </td>
                    <td><button class="remove-component-btn">Remove</button></td>
                `;
                tbody.appendChild(componentRow);
                rowIndex++
            }

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
                        <div class="error-create-recipe" id="errorUnit_${rowIndex}"></div>
                    </td>
                    <td>
                        <input type="number" step="any" name="base_price_${rowIndex}" placeholder="Base Price" min="0.01" class="validated-number" value="${Number(i.base_price).toFixed(2)}">
                        <div class="error-create-recipe" id="errorBasePrice_${rowIndex}"></div>
                    </td>
                    <td><button class="remove-ingredient-btn">Remove</button></td>
                `;
                tbody.appendChild(tr);
                rowIndex++
                // //const costCell = row.querySelector(".cost-input"); 
                // //costCell.textContent = i.price > 0 ? i.price.toFixed(4) : "";
                
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

        //console.log("Recipe loaded successfully");
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
    //console.log("Fetching units for ingredient:", ingredientId, typeof ingredientId);

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

    // const baseUnitSelect = row.querySelector(".base-unit-select");
    // baseUnitSelect.innerHTML = "";
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
    //console.log("unit is :", unitSelect.value, " base unit is :", baseUnit);
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
                row.querySelector('select[name^="base_unit_"]').innerHTML = "<option>Select unit</option>";
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
        row._default_base_quantity = 1;
        row._default_base_price = item.price ? Number(item.price).toFixed(2) : 0;
        row._default_base_unit = item.base_unit || "";

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





document.addEventListener("DOMContentLoaded", async () => {
    const tbody = document.getElementById("ingredients-tbody");
    const addFirstComponentBtn = document.getElementById(`add-first-component-btn`);
    const addComponentBtn = document.getElementById(`add-component-btn`);

    // component buttons to add the heading for the ingredient list
    [addFirstComponentBtn, addComponentBtn].forEach( button => 
        button.addEventListener("click", function () {
            const rows = Array.from(tbody.querySelectorAll("tr"));
            const index = rows.length;
            // Create the component row
            const tr = document.createElement("tr");
            tr.classList.add("component-row");
            tr.innerHTML = getEmptyComponentRow(index);
            // Depending on the button, place it on the top or at the bottom
            if(button == addFirstComponentBtn){
                tbody.prepend(tr);
                addFirstComponentBtn.style.display ='none';
            } else if(button == addComponentBtn){
                tbody.appendChild(tr);
                console.log("added component at the very end");
            };
            
            attachRowListeners(tr);
        })
    );
    


    const unitGroups = {
    weight: { base: "kg", factors: { kg: 1, g: 0.001, oz: 0.0283495, lbs: 0.453592 } },
    volume: { base: "l", factors: { l: 1, ml: 0.001, "fl.oz": 0.0295735, pint: 0.473176 } },
    bunch: {base: "bunch", factors: {bunch :1}},
    pc: {base: "pc", factors: {pc :1}}
    };

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

    // validation of ingredient data
    function validateIngredientRows() {
        const rows = document.querySelectorAll("#ingredients-tbody tr");
        const filledRows = [];
        const add_ingredients = [];
        const update_ingredients = [];
        const remove_ingredients = [];

        let errorMessage = "";

        rows.forEach((row, index) => {
            const recipe_ingredient_id = row.dataset.recipeIngredientId; // may be undefined
            // Check if row is marked as removed
            if (row.dataset.removed === "true" && recipe_ingredient_id) {
                remove_ingredients.push({ recipe_ingredient_id: parseInt(recipe_ingredient_id) });
                return; // skip validation for removed row
            }
            const ingredient_id = row.dataset.ingredientId || null;
            const name = row.querySelector(".ingredient-name").value.trim();
            const quantity = row.querySelector(".quantity").value.trim();
            const unit_id = row.querySelector(".unit-select").value;
            const base_quantity = row.querySelector(".base-quantity").value.trim();
            const base_unit = row.querySelector(".base-unit-select").value;
            const base_price = row.querySelector(".base-price").value.trim();

            const values = [name, quantity, unit_id, base_quantity, base_unit, base_price];
            const isAnyFilled = values.some(v => v !== "" && v !== "0" && v !=="Select unit");
            const isAllFilled = values.every(v => v !== "" && v !== "0" && v !=="Select unit");

            if (isAnyFilled && !isAllFilled) {
            errorMessage = `Row ${index + 1}: All fields must be filled if any field is entered.`;
            }

            if (isAllFilled) {
                const ingredientObj = {
                    recipe_ingredient_id: recipe_ingredient_id ? parseInt(recipe_ingredient_id) : null,
                    name,
                    ingredient_id: parseInt(ingredient_id),
                    quantity: parseFloat(quantity),
                    unit_id: parseInt(unit_id),
                    base_quantity: parseFloat(base_quantity),
                    base_unit,
                    base_price: parseFloat(base_price),

                     // --- attach defaults ---
                    _default_base_quantity: row._default_base_quantity,
                    _default_base_unit: row._default_base_unit,
                    _default_base_price: row._default_base_price
                };
                // check if its a new row or updating existing row
                if (ingredientObj.recipe_ingredient_id) {
                    update_ingredients.push(ingredientObj);
                } else {
                    add_ingredients.push(ingredientObj);
                }
                filledRows.push(ingredientObj);
            } else if (recipe_ingredient_id && !isAnyFilled) {
            remove_ingredients.push({ recipe_ingredient_id: parseInt(recipe_ingredient_id) });
            }
        });

        if (!errorMessage && filledRows.length < 2) {
            errorMessage = "At least 2 rows of ingredients must be fully filled.";
        }

        if (errorMessage) {
            document.getElementById("error").textContent = errorMessage;
            return {filledRows: null, remove_ingredients: null, errorMessage: errorMessage} ;
        }

        // NEW: Calculate order changes for PATCH
        const orderUpdates = calculateNewOrders();
        return { filledRows, add_ingredients, update_ingredients, remove_ingredients, orderUpdates, errorMessage: null };
    }

    // window.validateIngredientRows = validateIngredientRows; -------------------> FOR TESTING
    //compare the original recipe ingredients and new. Only attach those that are not same - i.e. updated.
    function getRecipePayload(originalRecipeData, completeRecipeData) {
        const payload = {};

        // Compare top-level recipe fields
        if (completeRecipeData.name !== originalRecipeData.recipe.name) {
            payload.name = completeRecipeData.name;
        }
        if (completeRecipeData.portion_size !== originalRecipeData.recipe.portion_size) {
            payload.portion_size = completeRecipeData.portion_size;
        }
        if (completeRecipeData.description !== originalRecipeData.recipe.description) {
            payload.description = completeRecipeData.description;
        }

        // --- Additions (clean + selective base fields) ---
        payload.add_ingredients = completeRecipeData.add_ingredients.map(newRow => {
            const cleaned = {
                ingredient_id: newRow.ingredient_id,
                quantity: parseFloat(newRow.quantity),
                unit_id: parseInt(newRow.unit_id)
            };

            // Compare against defaults
            const defaultBaseQuantity = parseFloat(newRow._default_base_quantity);
            const defaultBaseUnit = newRow._default_base_unit;
            const defaultBasePrice = parseFloat(newRow._default_base_price);

            if (
                parseFloat(newRow.base_quantity) !== defaultBaseQuantity ||
                newRow.base_unit !== defaultBaseUnit ||
                parseFloat(newRow.base_price) !== defaultBasePrice
            ) {
                cleaned.base_quantity = parseFloat(newRow.base_quantity);
                cleaned.base_unit = newRow.base_unit;
                cleaned.base_price = Number(parseFloat(newRow.base_price).toFixed(2));
            }

            return cleaned;
        });

        // --- Removals (always include) ---
        payload.remove_ingredients = completeRecipeData.remove_ingredients;

        // --- Updates (your existing logic with tweak above) ---
        payload.update_ingredients = completeRecipeData.update_ingredients
            .map(updatedRow => {
                const originalRow = originalRecipeData.ingredients.find(
                    ing => ing.recipe_ingredient_id === updatedRow.recipe_ingredient_id
                );

                if (!originalRow) return updatedRow;

                const changes = { recipe_ingredient_id: updatedRow.recipe_ingredient_id };

                // CASE 1: Ingredient changed
                if (updatedRow.ingredient_id && updatedRow.ingredient_id !== originalRow.ingredient_id) {
                    changes.ingredient_id = updatedRow.ingredient_id;
                    changes.quantity = parseFloat(updatedRow.quantity);
                    changes.unit_id = parseInt(updatedRow.unit_id);

                    const newDefaults = {
                        base_quantity: parseFloat(updatedRow._default_base_quantity),
                        base_unit: updatedRow._default_base_unit,
                        base_price: parseFloat(updatedRow._default_base_price)
                    };

                    if (
                        parseFloat(updatedRow.base_quantity) !== newDefaults.base_quantity ||
                        updatedRow.base_unit !== newDefaults.base_unit ||
                        parseFloat(updatedRow.base_price) !== newDefaults.base_price
                    ) {
                        changes.base_quantity = parseFloat(updatedRow.base_quantity);
                        changes.base_unit = updatedRow.base_unit;
                        changes.base_price = parseFloat(updatedRow.base_price).toFixed(2);
                    }

                    return changes;
                }

                // CASE 2: Same ingredient
                if (parseFloat(updatedRow.quantity) !== parseFloat(originalRow.quantity)) {
                    changes.quantity = parseFloat(updatedRow.quantity);
                }
                if (parseInt(updatedRow.unit_id) !== parseInt(originalRow.unit_id)) {
                    changes.unit_id = parseInt(updatedRow.unit_id);
                }

                if (
                    parseFloat(updatedRow.base_quantity) !== parseFloat(originalRow.base_quantity) ||
                    updatedRow.base_unit !== originalRow.unit ||
                    parseFloat(updatedRow.base_price) !== Number(parseFloat(originalRow.base_price).toFixed(2))
                ) {
                    changes.base_quantity = parseFloat(updatedRow.base_quantity);
                    changes.base_unit = updatedRow.base_unit;
                    changes.base_price = Number(parseFloat(updatedRow.base_price).toFixed(2));
                }

                return Object.keys(changes).length > 1 ? changes : null;
            })
            .filter(Boolean);

        return payload;
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
            const rows = Array.from(tbody.querySelectorAll("tr"));
            const currentRowIndex = rows.indexOf(currentRow); //console.log("current row index:", currentRowIndex);
            const componentName = currentRow.querySelector('input[name^="component_text_"]').value;
            const prevRow = rows[currentRowIndex - 1];

            // If ingredient is empty, remove row immediately
            if (!componentName ) {
                if (currentRowIndex != 0 && rows[currentRowIndex + 1]) {
                    prevRow.remove();
                }
                currentRow.remove();
                return;
            }

            // Ask for confirmation using the modal
            const confirmed = await showMultiConfirm(`Remove ${componentName}?`,componentName);

            if (confirmed === "component") {
                currentRow.dataset.removed = "true";
                currentRow.style.display = "none";
                if (currentRowIndex > 0) {
                    prevRow.remove();
                }
                //currentRow.remove();
            } else if (confirmed === "with-ingredients") {
                currentRow.dataset.removed = "true";
                currentRow.style.display = "none";
                let nextIndex = currentRowIndex + 1;
                while (rows[nextIndex] && !rows[nextIndex].classList.contains("component-row")) {
                    const nextRow = rows[nextIndex];
                    nextRow.dataset.removed = "true";
                    nextRow.style.display = "none";
                    nextIndex++;
                };
            } else {
                return;
            }
            // if (!confirmed) return; // user cancelled
            // if (recipeIngredientId) {
            // Mark the row as removed
            
            // } //  else {
            // // New ingredient row → remove from DOM
            
            // }

            // Recalculate total cost if needed
            // updateTotalRecipeCost();
        }
    });

    // submitting changes of recipe Save BUTTON
    document.getElementById("save-recipe-btn").addEventListener("click", async () => {
        // Validate all form sections
        const completeRecipe = {};
        document.getElementById("error").textContent = "";
        // validation of recipe data thru utils.js
        const name = document.getElementById("recipe-name-input").value;// console.log("recipe name : ", name);
        const portionSize = document.getElementById("portion-size-input").value;// console.log("recipe portion size : ", portionSize);
        const description = document.getElementById("description-input").value;
         //const privacy = document.getElementById("privacy-toggle").checked ? "private" : "public"; // not required as its handled separately
        const { errors, data } = validateRecipeForm({ 
        name, 
        portion_size: portionSize, 
        description
        });

        if (errors.name || errors.portion_size || errors.description) {
            console.log("Validation errors:", errors);
            document.getElementById("error").textContent = [errors.name, errors.portion_size, errors.description].filter(Boolean).join(" | ");
            return;
        } 
        const completeRecipeData = data;
        
        //console.log("originalRecipeData : ", originalRecipeData);
        const { filledRows, add_ingredients, update_ingredients, remove_ingredients, orderUpdates, errorMessage}  = validateIngredientRows();
        if (errorMessage) {
            console.log("error from ingredients table:", errorMessage);
            return;
        };
        
        completeRecipeData.add_ingredients = add_ingredients;
        completeRecipeData.update_ingredients = update_ingredients;
        completeRecipeData.remove_ingredients = remove_ingredients; // 
        //console.log("completeRecipeData : ", completeRecipeData);
        //console.log("filled rows:", filledRows.length);

        // Usage example
        const recipePayload = getRecipePayload(originalRecipeData, completeRecipeData);

        // Submit recipe to backend API
        //console.log("Payload for recipe update:", recipePayload);
        const errorBox = document.getElementById("error");
        const recipeId =window.recipeId; //console.log(" recipeId :", recipeId)
        
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
            errorBox.textContent = data.error || "Something went wrong while fetch new-recipe.";
            console.log("Submitted data (for debug):", data.submitted_data);
            return;
        };

        // NEW: After main update succeeds, PATCH any changed orders
        for (const update of orderUpdates) {
            try {
                const orderResponse = await fetch(`/recipes/api/ingredient-order/${update.recipe_ingredient_id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ display_order: update.display_order })
                });
                const orderData = await orderResponse.json();
                if (!orderResponse.ok) {
                    console.warn("Order update failed for ID", update.recipe_ingredient_id, ":", orderData.error);
                    // Don't block success—log and continue
                } else {
                    console.log("Order updated successfully for ID", update.recipe_ingredient_id);
                }
            } catch (orderErr) {
                console.error("Error updating order for ID", update.recipe_ingredient_id, ":", orderErr);
            }
        }
        
        // Display success message and redirect
        showAlert(data.message || "Recipe updated successfully!");
        setTimeout(() => { window.location.href = `/recipes/details/${recipeId}`; }, 1000);
        } catch (err) {
        errorBox.textContent = err.message;
        }        

    });
    
});

