// Validate recipe form inputs (name, portion size, description, privacy)
export function validateRecipeForm() {
  // Get input values and trim whitespace
  const name = document.getElementById("recipe-name-input").value.trim();
  const portionSize = document.getElementById("portion-size-input").value.trim();
  const description = document.getElementById("description-input").value.trim();
  const privacy = document.getElementById("privacy-toggle").checked ? "private" : "public";

  const nameMaxLength = 50;
  const portionSizeMaxLength = 20;
  const descriptionMaxLength = 500;
  // Get error display elements
  const errorName = document.getElementById("errorName");
  const errorPS = document.getElementById("errorPortionSize");
  const errorDesc = document.getElementById("errorDesc");

  // Clear previous error messages
  errorName.textContent = "";
  errorPS.textContent = "";
  errorDesc.textContent = "";
  document.getElementById("error").textContent = "";

  let hasError = false;

  // Validate recipe name
  if (!name) {
    errorName.textContent = "Please write the recipe name.";
    errorName.style.display = "block";
    hasError = true;
  } else if (name.length > nameMaxLength) {
    errorName.textContent = `Not more than ${nameMaxLength} characters.`;
    hasError = true;
  }

  // Validate portion size
  if (!portionSize) {
    errorPS.textContent = "Please give the portion size.";
    errorPS.style.display = "block";
    hasError = true;
  } else if (portionSize.length > portionSizeMaxLength) {
    errorPS.textContent = `Not more than  ${portionSizeMaxLength} characters.`;
    hasError = true;
  }

  // Validate description
  if (description.length > descriptionMaxLength) {
    errorDesc.textContent = `Description must be ≤ ${descriptionMaxLength} characters.`;
    errorDesc.style.display = "block";
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

// validation of ingredient data
export function validateIngredientRows() {
  const rows = Array.from(document.querySelectorAll("#ingredients-tbody tr")); //.filter(row => row.dataset.removed !== "true");
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
  const errorCompBox = {};
  let componentInputText = "";
  let componentIndex = -1;
  let recipe_component_id;

  let errorMessage = "";

  rows.forEach((row, index) => {
    const isThisRowComponent = row.classList.contains("component-row");
    const isThisRowIngredient = row.classList.contains("ingredient-row");

    if (isThisRowComponent) {
      // check if the rows is removed
      recipe_component_id = row.dataset.recipeComponentId; // may be undefined

      // check if component row is removed and put it in the remove_component Obj
      if (row.dataset.removed === "true") {
        remove_components.push({
          recipe_component_id: parseInt(recipe_component_id),
          component_display_order: parseInt(compDisplayOrder),
        });
        return;
      }

      const compTextField = row.querySelector(`input[name^="component_text_"]`);
      const compText = compTextField.value.trim().replace(/\s+/g, " ");
      // extract the index number attached to value fields like errorName_${index}
      const match = compTextField.name.match(/_(\d+)$/);
      const realIndex = match ? match[1] : null;
      if (!realIndex) return;

      // Get error display elements
      errorCompBox[`errorCompText_${realIndex}`] = document.getElementById(
        `errorCompText_${realIndex}`,
      );

      // Reset Error messages
      errorCompBox[`errorCompText_${realIndex}`].textContent = "";

      // Collect values from all fields of component rows
      const values = [compText];

      // Check if all fields are filled
      const isAllFieldsFilled = values.every((v) => v !== "");

      // validate if the 1st component display is none or block. if block then text cant be empty
      if (!isAllFieldsFilled && index === 0) {
        if (row.style.display != "none") {
          if (compText == "") {
            errorCompBox[`errorCompText_${realIndex}`].textContent = "Component text required";
            errorCompBox[`errorCompText_${realIndex}`].style.fontWeight = "lighter";
            errorCompBox[`errorCompText_${realIndex}`].style.display = "block";
          }
          errorMessage = `Check first component fields.`;
          console.log(errorMessage);
        }
      }

      // Validate that empty field of components are not allowed EXCEPT for index 0 (first row)
      if (!isAllFieldsFilled && index !== 0) {
        if (compText == "") {
          errorCompBox[`errorCompText_${realIndex}`].textContent = "Component text required";
          errorCompBox[`errorCompText_${realIndex}`].style.fontWeight = "lighter";
          errorCompBox[`errorCompText_${realIndex}`].style.display = "block";
        }
        errorMessage = `Check all the fields. One or more errors found.`;
      }

      // check the very 1st component. if component_text(hidden component) and its ingredients are empty
      // then reset the componentIndex which will make the next component as very 1st component from future.
      if (componentIndex === 0) {
        const prevComponent = ingredientsData[componentIndex];
        if (prevComponent.component_text == "") {
          if (prevComponent.ingredients.length === 0) {
            componentIndex = -1;
            compDisplayOrder = 0;
            update_components.pop();
          }
        } else if (prevComponent.component_text !== "") {
          const prevComponent = ingredientsData[componentIndex];
          if (prevComponent && prevComponent.ingredients.length === 0) {
            const subheading = prevComponent.component_text;
            errorMessage = `Cant have empty ingredients within sub heading - ${subheading} -. Either remove it or add ingredients`;
          }
        }
      }

      // as above we have spcl condition for very 1st component, we will now check other components below
      // check if previous(which is not the 1st component) has any ingredient. Cant be empty rows for ingredient
      if (componentIndex !== 0 && componentIndex !== -1) {
        const prevComponent = ingredientsData[componentIndex];
        if (prevComponent && prevComponent.ingredients.length === 0) {
          const subheading = prevComponent.component_text;
          errorMessage = `Cant have empty ingredients within sub heading -${subheading}-. Either remove it or add ingredients`;
        }
      }

      // Process filled component
      if ((isAllFieldsFilled || index == 0) && errorMessage == "") {
        componentInputText = compText; // used to add text for different ingredient
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
      }
    }

    if (isThisRowIngredient) {
      // check if the rows is removed
      const recipe_ingredient_id = row.dataset.recipeIngredientId; // may be undefined

      if (row.dataset.removed === "true") {
        remove_ingredients.push({
          recipe_ingredient_id: parseInt(recipe_ingredient_id),
        });
        return;
      }

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
      errorBoxes[`errorIngName_${realIndex}`] = document.getElementById(
        `errorIngName_${realIndex}`,
      );
      errorBoxes[`errorQuantity_${realIndex}`] = document.getElementById(
        `errorQuantity_${realIndex}`,
      );
      errorBoxes[`errorUnit_${realIndex}`] = document.getElementById(`errorUnit_${realIndex}`);
      errorBoxes[`errorBaseQuantity_${realIndex}`] = document.getElementById(
        `errorBaseQuantity_${realIndex}`,
      );
      errorBoxes[`errorBaseUnit_${realIndex}`] = document.getElementById(
        `errorBaseUnit_${realIndex}`,
      );
      errorBoxes[`errorBasePrice_${realIndex}`] = document.getElementById(
        `errorBasePrice_${realIndex}`,
      );
      //const  = document.getElementById(`_${index}`);

      // Reset Error messages
      errorBoxes[`errorIngName_${realIndex}`].textContent = "";
      errorBoxes[`errorQuantity_${realIndex}`].textContent = "";
      errorBoxes[`errorUnit_${realIndex}`].textContent = "";
      errorBoxes[`errorBaseQuantity_${realIndex}`].textContent = "";
      errorBoxes[`errorBaseUnit_${realIndex}`].textContent = "";
      errorBoxes[`errorBasePrice_${realIndex}`].textContent = "";

      // Collect values from all fields
      const values = [
        nameInput.value.trim(),
        quantityInput.value.trim(),
        unitSelect.value.trim(),
        baseQtyInput.value.trim(),
        baseUnitInput.value.trim(),
        basePriceInput.value.trim(),
      ];

      // Check if any field is filled
      const isAnyFieldFilled = values.some((v) => v !== "");
      // Check if all fields are filled
      const isAllFieldsFilled = values.every((v) => v !== "");

      // Validate that partially filled rows are not allowed
      if (isAnyFieldFilled && !isAllFieldsFilled) {
        if (nameInput.value.trim() == "") {
          errorBoxes[`errorIngName_${realIndex}`].textContent = "Name required";
          errorBoxes[`errorIngName_${realIndex}`].style.display = "block";
        }
        if (quantityInput.value.trim() == "") {
          errorBoxes[`errorQuantity_${realIndex}`].textContent = "* Required";
          errorBoxes[`errorQuantity_${realIndex}`].style.display = "block";
        }
        if (unitSelect.value.trim() == "") {
          errorBoxes[`errorUnit_${realIndex}`].textContent = "* Required";
          errorBoxes[`errorUnit_${realIndex}`].style.display = "block";
        }
        if (baseQtyInput.value.trim() == "") {
          errorBoxes[`errorBaseQuantity_${realIndex}`].textContent = "* Required";
          errorBoxes[`errorBaseQuantity_${realIndex}`].style.display = "block";
        }
        if (baseUnitInput.value.trim() == "") {
          errorBoxes[`errorBaseUnit_${realIndex}`].textContent = "* Required";
          errorBoxes[`errorBaseUnit_${realIndex}`].style.display = "block";
        }
        if (basePriceInput.value.trim() == "") {
          errorBoxes[`errorBasePrice_${realIndex}`].textContent = "* Required";
          errorBoxes[`errorBasePrice_${realIndex}`].style.display = "block";
        }
        errorMessage = `Check all the fields. One or more errors found.`;
      }

      // check if recipe_ingredient_id exists and no fields are field then push that row in remove_ingredient
      if (recipe_ingredient_id && !isAnyFieldFilled) {
        remove_ingredients.push({
          recipe_ingredient_id: parseInt(recipe_ingredient_id),
        });
        return;
      }

      // Process fully filled rows
      if (isAllFieldsFilled) {
        filledRowsCount++;
        ingDisplayOrder++;
        const ingredientObj = {
          ingredient_id: parseInt(row.dataset.ingredientId),
          ingredient_source: row.dataset.ingredientSource,
          quantity: parseFloat(quantityInput.value),
          unit_id: parseInt(unitSelect.value),
          ingredient_display_order: ingDisplayOrder,
          component_display_order: compDisplayOrder - 1,
          component_text: componentInputText,
        };

        ingredientsCheckWithOriginalData[filledRowsCount - 1] = {};
        ingredientsCheckWithOriginalData[filledRowsCount - 1].ingredient_id = parseInt(
          row.dataset.ingredientId,
        );
        ingredientsCheckWithOriginalData[filledRowsCount - 1].quantity = parseFloat(
          quantityInput.value,
        );
        ingredientsCheckWithOriginalData[filledRowsCount - 1].unit_id = parseInt(unitSelect.value);
        ingredientsCheckWithOriginalData[filledRowsCount - 1].ing_display_order = ingDisplayOrder;
        ingredientsCheckWithOriginalData[filledRowsCount - 1].unit = baseUnitInput.value;
        ingredientsCheckWithOriginalData[filledRowsCount - 1].base_price = parseFloat(
          basePriceInput.value,
        );
        ingredientsCheckWithOriginalData[filledRowsCount - 1].base_quantity = parseFloat(
          baseQtyInput.value,
        );
        ingredientsCheckWithOriginalData[filledRowsCount - 1].component_display_order =
          compDisplayOrder - 1;
        ingredientsCheckWithOriginalData[filledRowsCount - 1].component_text = componentInputText;
        if (recipe_component_id) {
          ingredientsCheckWithOriginalData[filledRowsCount - 1].recipe_component_id =
            parseInt(recipe_component_id);
          ingredientObj.recipe_component_id = parseInt(recipe_component_id);
        }
        // Include base fields only if they differ from original values
        if (
          parseFloat(baseQtyInput.value) != parseFloat(row.dataset.defaultBaseQuantity) ||
          baseUnitInput.value != row.dataset.defaultBaseUnit ||
          parseFloat(basePriceInput.value) != parseFloat(row.dataset.defaultBasePrice)
        ) {
          ingredientObj.base_quantity = parseFloat(baseQtyInput.value);
          ingredientObj.base_unit = baseUnitInput.value;
          ingredientObj.base_price = parseFloat(basePriceInput.value);
        }

        // creating one more variable for complete row obj to check with original data
        // const rowObj = ingredientObj;

        if (row.dataset.recipeIngredientId !== undefined) {
          ingredientsCheckWithOriginalData[filledRowsCount - 1].recipe_ingredient_id = parseInt(
            row.dataset.recipeIngredientId,
          );
          ingredientObj.recipe_ingredient_id = parseInt(row.dataset.recipeIngredientId);
          update_ingredients.push(ingredientObj);
        } else {
          add_ingredients.push(ingredientObj);
        }

        // console.log("componentIndex :", componentIndex);
        if (componentIndex !== -1) {
          ingredientsData[componentIndex].ingredients.push(ingredientObj);
        }
      }

      // check if its last row of ingredient in the table and does the last component have any ingredients.
      if (index == rows.length - 1) {
        if (componentIndex != 0) {
          const prevComponent = ingredientsData[componentIndex];
          if (prevComponent && prevComponent.ingredients.length === 0) {
            const subheading = prevComponent.component_text;
            errorMessage = `Cant have empty ingredients within sub heading '${subheading}'. Either remove it or add ingredients`;
          }
        }
      }
    }
  });

  // after scaning whole table, Now check for errorMessage and total number of ingredients
  if (!errorMessage && filledRowsCount < 2) {
    errorMessage = "At least 2 rows of ingredients must be fully filled.";
  }

  if (errorMessage) {
    document.getElementById("error").textContent = errorMessage;
    // return false;
    return {
      hasError: true,
      remove_components: null,
      add_components: null,
      update_components: null,
      remove_ingredients: null,
      add_ingredients: null,
      update_ingredients: null,
      ingredientsData: null,
      errorMessage: errorMessage,
    };
  }

  return {
    hasError: false,
    remove_components,
    add_components,
    update_components,
    remove_ingredients,
    add_ingredients,
    update_ingredients,
    ingredientsData,
    errorMessage: null,
  };
}

// validation of Steps data
export function validateStepRows() {
  const stepRows = Array.from(document.querySelectorAll("#steps-tbody tr"));
  let displayOrder = 1;
  const stepsData = [];
  stepRows.forEach((row) => {
    const stepText = row.querySelector('textarea[name^="recipe_step_"');
    const stepTime = row.querySelector('input[name^="step_time_"');
    if (stepText.value) {
      const stepObj = {};
      stepObj.step_display_order = displayOrder;
      stepObj.step_text = stepText.value;
      stepObj.step_time = stepTime.value;
      displayOrder++;
      stepsData.push(stepObj);
    }
  });
  return stepsData;
}

//compare the original recipe ingredients and new. Only attach those that are not same - i.e. updated.
export function getRecipePayload(originalRecipeData, completeRecipeData) {
  const payload = {};

  // Compare top-level recipe fields
  if (completeRecipeData.recipe.name !== originalRecipeData.recipe.name) {
    payload.name = completeRecipeData.recipe.name;
  }
  if (completeRecipeData.recipe.portion_size !== originalRecipeData.recipe.portion_size) {
    payload.portion_size = completeRecipeData.recipe.portion_size;
  }
  if (completeRecipeData.recipe.privacy !== originalRecipeData.recipe.privacy) {
    payload.privacy = completeRecipeData.recipe.privacy;
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
    .map((updatedRow) => {
      const originalRow = originalRecipeData.ingredients.find(
        (comp) => comp.recipe_component_id === updatedRow.recipe_component_id,
      );

      if (!originalRow) return updatedRow; // this row idealy should never run

      const changes = {
        recipe_component_id: updatedRow.recipe_component_id,
        component_display_order: updatedRow.component_display_order,
      };

      // CASE 1: Ingredient changed
      if (updatedRow.component_text !== originalRow.component_text) {
        changes.component_text = updatedRow.component_text;
      }
      if (updatedRow.component_display_order !== originalRow.component_display_order) {
        changes.orderChanged = true;
      }

      return Object.keys(changes).length > 2 ? changes : null;
    })
    .filter(Boolean);

  // --- ingredient Removals (always include) ---
  payload.remove_ingredients = completeRecipeData.ingredients.remove_ingredients;

  // --- ingredients Additions (clean + selective fields) ---
  payload.add_ingredients = completeRecipeData.ingredients.add_ingredients.map((newRow) => {
    const cleaned = {
      ingredient_id: newRow.ingredient_id,
      ingredient_source: newRow.ingredient_source,
      quantity: parseFloat(newRow.quantity),
      unit_id: parseInt(newRow.unit_id),
      component_display_order: parseInt(newRow.component_display_order),
      ingredient_display_order: parseInt(newRow.ingredient_display_order),
    };

    if (newRow.base_quantity) {
      cleaned.base_quantity = parseFloat(newRow.base_quantity);
      cleaned.base_unit = newRow.base_unit;
      cleaned.base_price = Number(parseFloat(newRow.base_price).toFixed(2));
    }

    return cleaned;
  });

  // --- ingredient Updates (your existing logic with tweak above) ---
  payload.update_ingredients = completeRecipeData.ingredients.update_ingredients
    .map((updatedRow) => {
      const originalRow = originalRecipeData.ingredients.find(
        (ing) => ing.recipe_ingredient_id === updatedRow.recipe_ingredient_id,
      );

      if (!originalRow) return updatedRow;

      const changes = { recipe_ingredient_id: updatedRow.recipe_ingredient_id };

      //  change in ingredient display order
      if (updatedRow.ingredient_display_order != originalRow.ingredient_display_order) {
        changes.ingredient_display_order = updatedRow.ingredient_display_order;
      }

      //  change in component display order
      if (updatedRow.component_display_order != originalRow.component_display_order) {
        changes.component_display_order = updatedRow.component_display_order;
      }

      // CASE 1: Ingredient changed
      if (updatedRow.ingredient_id && updatedRow.ingredient_id !== originalRow.ingredient_id) {
        changes.ingredient_id = updatedRow.ingredient_id;
        changes.ingredient_source = updatedRow.ingredient_source;
        changes.quantity = parseFloat(updatedRow.quantity);
        changes.unit_id = parseInt(updatedRow.unit_id);

        if (updatedRow.default_base_unit) {
          changes.base_quantity = parseFloat(updatedRow.base_quantity);
          changes.base_unit = updatedRow.base_unit;
          changes.base_price = parseFloat(updatedRow.base_price.toFixed(2));
        }
        return changes;
      }

      // CASE 2: Same ingredient
      if (updatedRow.ingredient_id === originalRow.ingredient_id) {
        if (parseFloat(updatedRow.quantity) !== parseFloat(originalRow.quantity)) {
          changes.quantity = parseFloat(updatedRow.quantity);
        }
        if (parseInt(updatedRow.unit_id) !== parseInt(originalRow.unit_id)) {
          changes.unit_id = parseInt(updatedRow.unit_id);
        }

        if (updatedRow.base_unit) {
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
