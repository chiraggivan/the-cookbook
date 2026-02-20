import { getEmptyComponentRow } from "./component_helpers.js";
import {
  initializeIngredientRow,
  populateUnits,
  populateBaseUnits,
  getEmptyIngredientRow,
} from "./ingredient_helpers.js";
import {
  getEmptyStepRow,
  initializeStepInput,
  updateSerialNo,
  updateStepMoveButtons,
} from "./step_helpers.js";
import { updateMoveButtons } from "./UI-animation_helpers.js";
const token = localStorage.getItem("access_token");

// update total cost of recipe
export function updateTotalRecipeCost() {
  //console.log("within update recipe cost");
  const costCells = document.querySelectorAll(".cost-input");
  let total = 0;

  costCells.forEach((cell) => {
    const row = cell.closest("tr");
    // Skip removed rows
    if (row.dataset.removed === "true") return;
    const value = parseFloat(cell.textContent.replace(/,/g, "")) || 0;
    total += value;
  });

  const totalCostEl = document.getElementById("totalCost");
  if (total != 0) {
    totalCostEl.textContent = `${total.toFixed(2).replace(/\.00$/, "")}`;
  } else {
    totalCostEl.textContent = `0.00`;
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
  const baseQuantity = parseFloat(baseQuantityInput.value) || "";
  const baseUnit = baseUnitSelect.value;
  const basePrice = parseFloat(basePriceInput.value) || "";

  if (!quantity || !baseQuantity || !baseUnit || !basePrice) {
    costCell.textContent = "";
    return;
  }

  // figure out which group the base unit belongs to
  const unitGroups = {
    weight: { base: "kg", factors: { kg: 1, g: 0.001, oz: 0.0283495, lbs: 0.453592 } },
    volume: { base: "l", factors: { l: 1, ml: 0.001, "fl.oz": 0.028413, pint: 0.568261 } },
    bunch: { base: "bunch", factors: { bunch: 1 } },
    pc: { base: "pc", factors: { pc: 1 } },
  };

  let group = null;

  for (const values of Object.values(unitGroups)) {
    if (values.factors[baseUnit] !== undefined) {
      group = values;
      break;
    }
  }

  if (!group) {
    costCell.textContent = "";
    return;
  }

  // price per 1 "canonical unit" (kg or l)
  const normalizedPrice = basePrice / baseQuantity / group.factors[baseUnit];
  const selectedOption = unitSelect.options[unitSelect.selectedIndex];
  const conversionFactor = parseFloat(selectedOption?.dataset.conversionFactor);
  const cost = quantity * conversionFactor * normalizedPrice; // console.log("cost of ingredient :", cost);
  costCell.textContent = cost > 0 ? parseFloat(cost.toFixed(4)) : "";

  updateTotalRecipeCost();
}

// attach cost events - recalculate the ingredient cost for any change in input/select fields on ingredient
export function attachCostEvents(row) {
  const ingredientInput = row.querySelector('input[name^="ingredient_name_"]');
  const quantityInput = row.querySelector('input[name^="quantity_"]');
  const baseQuantityInput = row.querySelector('input[name^="base_quantity_"]');
  const basePriceInput = row.querySelector('input[name^="base_price_"]');
  const unitSelect = row.querySelector('select[name^="unit_"]');
  const baseUnitSelect = row.querySelector('select[name^="base_unit_"]');

  // doing for bug in last ingredient for move up and move down button
  [
    ingredientInput,
    quantityInput,
    baseQuantityInput,
    basePriceInput,
    unitSelect,
    baseUnitSelect,
  ].forEach((el) => {
    el.addEventListener("focus", updateMoveButtons);
    el.addEventListener("blur", updateMoveButtons);
  });

  quantityInput.addEventListener("input", () => recalcCost(row));
  baseQuantityInput.addEventListener("input", () => recalcCost(row));
  basePriceInput.addEventListener("input", () => recalcCost(row));
  unitSelect.addEventListener("change", () => recalcCost(row));
  baseUnitSelect.addEventListener("change", () => recalcCost(row));
}

// enforce quantities to be positive and more than zero and not more  than 1000000
export function restrictNumberInput(el, maxInt, maxDec) {
  el.addEventListener("keydown", (e) => {
    if (["e", "E", "+", "-", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
  });

  //block mouse wheel increment/decrement
  el.addEventListener(
    "wheel",
    (e) => {
      if (document.activeElement === el) {
        // only when focused
        e.preventDefault();
      }
    },
    { passive: false },
  ); // passive: false needed to allow preventDefault

  el.addEventListener("input", function () {
    let value = this.value;
    if (value.includes(".")) {
      let [intPart, decPart] = value.split(".");
      if (intPart.length > maxInt) intPart = intPart.slice(0, maxInt);
      if (decPart.length > maxDec) decPart = decPart.slice(0, maxDec);
      this.value = intPart + "." + decPart;
    } else if (value.length > maxInt) {
      this.value = value.slice(0, maxInt);
    }

    // remove error message if present
    const currentCell = this.closest("td");
    if (currentCell) {
      const errorEl = currentCell.querySelector('div[id^="error"]');
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
  });
}

// load all the details of recipe in the page
export async function loadRecipeForEdit(recipeId, token) {
  try {
    const res = await fetch(`/recipes/api/recipe/edit/${recipeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }); //console.log("response is: ", await res)

    if (res.status === 403) {
      alert("You don’t have permission to edit this recipe.");
      window.location.href = `/recipes/details/${recipeId}`; // redirect to view
      return;
    }

    const data = await res.json(); // console.log("data is: ", data)

    const originalRecipeData = structuredClone(data); // deep copy to preserve original
    console.log("original recipe data : ", originalRecipeData);

    // call renderRecipeDataOnScreen
    await renderRecipeDataOnScreen(data);
    return originalRecipeData;
  } catch (err) {
    console.error("Error loading recipe for edit:", err);
  }
}

// reload recipe for edit via reset button
export async function resetLoadRecipeForEdit(data) {
  renderRecipeDataOnScreen(data);
}

// function to load the recipe data into table for loadRecipeForEdit and ResetRecipe
export async function renderRecipeDataOnScreen(data) {
  // populate fields with data.recipe, ingredients, steps...
  document.getElementById("recipe-name-input").value = data.recipe.name;
  document.getElementById("portion-size-input").value = data.recipe.portion_size;
  document.getElementById("description-input").value = data.recipe.description;
  // --- PRIVACY HANDLING ---
  const privacyToggle = document.getElementById("privacy-toggle");
  const privacyLabel = document.getElementById("privacy-label");

  // Set checkbox checked state
  privacyToggle.checked = data.recipe.privacy === "private";

  // Update label text
  privacyLabel.textContent = data.recipe.privacy === "private" ? "Private" : "Public";

  // Populate ingredients table
  const ingredients = data.ingredients; // console.log("ingredients:", ingredients);
  const totalIngredientRows = ingredients.length; // console.log("total rows from db are :", totalIngredientRows);
  const tbody = document.getElementById("ingredients-tbody");
  tbody.innerHTML = ""; // clear existing rows

  // Get unique component_display_order values in ascending order
  const uniqueComponents = [
    ...new Set(ingredients.map((item) => item.component_display_order)),
  ].sort((a, b) => a - b);
  const totalComponents = uniqueComponents.length;
  let rowIndex = 0;
  let ingredientIndex = 1;
  let componentIndex = 1;
  let stepIndex = 1;

  // Iterate through each component_display_order
  for (const order of uniqueComponents) {
    // Get the component_text for the first item of this component_display_order
    const component = ingredients.find((item) => item.component_display_order === order);
    const componentText = component.component_text ? component.component_text.trim() : "";

    // Before create component row, if the rowIndex for component is more than 0 then add empty ingredient row before new component row
    if (rowIndex !== 0) {
      const tr = document.createElement("tr");
      tr.classList.add("ingredient-row");
      tr.innerHTML = getEmptyIngredientRow(rowIndex);
      tbody.appendChild(tr);
      rowIndex++;
      initializeIngredientRow(tr, token);
    }

    const componentRow = document.createElement("tr");
    componentRow.classList.add("component-row");
    componentRow.dataset.recipeComponentId = component.recipe_component_id;
    componentRow.innerHTML = getEmptyComponentRow(rowIndex);
    componentRow.querySelector('input[name^="component_text_"]').value = componentText;

    // Only create a component row if component_text is non-empty
    if (componentText == "" && rowIndex == 0) {
      componentRow.style.display = "none";
      document.getElementById("add-first-component-btn").style.display = "block";
    }
    // to make sure that during reset recipe , it will not display add first component btn if componentText NOT empty
    if (componentText != "" && rowIndex == 0) {
      // componentRow.style.display="block";
      document.getElementById("add-first-component-btn").style.display = "none";
    }
    tbody.appendChild(componentRow);
    rowIndex++;

    // create rows for ingredient for the component above in ascending order
    const componentIngredients = ingredients
      .filter((item) => item.component_display_order === component.component_display_order)
      .sort((a, b) => a.ingredient_display_order - b.ingredient_display_order);
    for (const i of componentIngredients) {
      const tr = document.createElement("tr");
      tr.classList.add("ingredient-row");
      tr.dataset.recipeIngredientId = i.recipe_ingredient_id || "";
      tr.dataset.ingredientId = i.ingredient_id || "";
      tr.dataset.ingredientSource = i.ingredient_source;
      tr.dataset.originalOrder = rowIndex || 0;
      tr.dataset.defaultBaseQuantity = i.base_quantity;
      tr.dataset.defaultBaseUnit = i.unit;
      tr.dataset.defaultBasePrice = i.cost;
      tr.innerHTML = getEmptyIngredientRow(rowIndex);
      tr.querySelector('input[name^="ingredient_name_"]').value = i.name;
      tr.querySelector('input[name^="quantity_"]').value = i.quantity;
      tr.querySelector('input[name^="base_quantity_"]').value = i.base_quantity;

      tr.querySelector('input[name^="base_price_"]').value = Number(i.cost).toFixed(2);
      tr.querySelector(".remove-ingredient-btn").style.display = "block";

      const selectUnit = tr.querySelector('select[name^="unit_"]');
      selectUnit.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = i.unit_id;
      opt.textContent = i.unit_name;
      selectUnit.appendChild(opt);

      const selectBaseUnit = tr.querySelector('select[name^="base_unit_"]');
      selectBaseUnit.innerHTML = "";
      const optBase = document.createElement("option");
      optBase.value = i.unit;
      optBase.textContent = i.unit;
      selectBaseUnit.appendChild(optBase);

      tbody.appendChild(tr);
      rowIndex++;
      ingredientIndex++;

      updateMoveButtons();
      await populateUnits(tr, token); // runs without await
      populateBaseUnits(tr);
      recalcCost(tr);
      initializeIngredientRow(tr, token);
    }
    componentIndex++;
  }

  // add an empty ingredientrow at the end of table. (kept in 'if' for easy understanding)
  if (true) {
    const tr = document.createElement("tr");
    tr.classList.add("ingredient-row");
    tr.innerHTML = getEmptyIngredientRow(rowIndex);
    tbody.appendChild(tr);
    rowIndex++;
    initializeIngredientRow(tr, token);
    updateMoveButtons();
  }
  // update total cost
  updateTotalRecipeCost();

  // Populate steps
  const stepTbody = document.getElementById("steps-tbody");
  stepTbody.innerHTML = ""; // clear existing rows
  const steps = data.steps;
  steps.forEach((s, index) => {
    const tr = document.createElement("tr");
    tr.classList.add("step-row");
    tr.dataset.procedureId = s.procedure_id;
    tr.dataset.stepText = s.step_text;
    tr.dataset.stepOrder = s.step_order;
    tr.dataset.estimatedTime = s.estimated_time;
    tr.innerHTML = getEmptyStepRow(index + 1);
    tr.querySelector('textarea[name^="recipe_step_"]').value = s.step_text;
    tr.querySelector(".remove-step-btn").style.display = "inline-block";
    stepIndex++;
    stepTbody.appendChild(tr);
    updateSerialNo();
    updateStepMoveButtons();
  });

  // add an empty step row at the end of table. (kept in 'if' for easy understanding)
  if (true) {
    const tr = document.createElement("tr");
    tr.classList.add("step-row");
    tr.innerHTML = getEmptyStepRow(stepIndex);
    tr.querySelector(".step-no").textContent = stepIndex;
    stepTbody.appendChild(tr);
    stepIndex++;
    initializeStepInput(tr);
    updateStepMoveButtons();
  }
}
