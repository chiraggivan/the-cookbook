import { initializeIngredientRow, populateUnits, populateBaseUnits, getEmptyIngredientRow } from "./ingredient_helpers.js";

const token = localStorage.getItem("access_token");

// update total cost of recipe
export function updateTotalRecipeCost() {
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

// recalculate the cost of ingredient as per the unit selected
export function recalcCost(row) {
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

// attach cost events - recalculate the ingredient cost for any change in input/select fields on ingredient
export function attachCostEvents(row) {
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
export function restrictNumberInput(el, maxInt, maxDec) {
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

// load all the details of recipe in the page
export async function loadRecipeForEdit(recipeId, token) {
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

        const originalRecipeData = structuredClone(data); // deep copy to preserve original
        console.log("original recipe data : ", originalRecipeData);

        // call renderRecipeDataOnScreen
        await renderRecipeDataOnScreen(data);
        return originalRecipeData;
    } catch (err) {
        console.error("Error loading recipe for edit:", err);
    }
}

// function to load the recipe data into table for loadRecipeForEdit and ResetRecipe
export async function renderRecipeDataOnScreen(data){
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
    const totalComponents = uniqueComponents.length;
    let rowIndex = 0;
    let ingredientIndex = 1;
    let componentIndex = 1;
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
            <td colspan="8" style="background-color:#f2f2f2; font-weight:bold;">
            <input type="text" name="component_text_${rowIndex}" value="${componentText}" class="component-input" placeholder="Sub Heading: (e.g., Sauce, Base)" style="width: calc(2 * 100% / 6);">
            <div class="error-create-recipe" id="errorCompText_${rowIndex}"></div>
            </td>
            <td><button class="remove-component-btn">Remove</button></td>
        `;
        
        // Only create a component row if component_text is non-empty
        if (componentText == "" && rowIndex == 0) {
            componentRow.style.display="none";
            document.getElementById("add-first-component-btn").style.display = "block";
        }
        // to make sure that during reset recipe , it will not display add first component btn if componentText NOT empty
        if (componentText != "" && rowIndex == 0) {
            // componentRow.style.display="block";
            document.getElementById("add-first-component-btn").style.display = "none";
        }
        tbody.appendChild(componentRow);
        rowIndex++

        // create rows for ingredient for the component above in ascending order
        const componentIngredients = ingredients.filter(item => item.component_display_order === component.component_display_order).sort((a,b) => a.ingredient_display_order - b.ingredient_display_order);        
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
                <td>
                    <button class="move-ing-up-btn">Move ↑ </button>
                    <button class="move-ing-down-btn">Move ↓ </button>
                </td>
                <td><button class="remove-ingredient-btn">Remove</button></td>
            `;
            tbody.appendChild(tr);

            //
            if (ingredientIndex == 1) {
                tr.querySelector(".move-ing-up-btn").style.display = 'none';
            }

            //
            if(componentIndex == totalComponents && ingredientIndex == ingredients.length){
                tr.querySelector(".move-ing-down-btn").style.display = 'none';
            }
            rowIndex++
            ingredientIndex++
            
            await populateUnits(tr, token);     // runs without await
            populateBaseUnits(tr);
            recalcCost(tr);
            initializeIngredientRow(tr, token);            
        };
        componentIndex++
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
    const steps = data.steps;
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

// reload recipe for edit via reset button
export async function resetLoadRecipeForEdit(data){
    renderRecipeDataOnScreen(data);
}

