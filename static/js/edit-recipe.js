document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");//console.log("token is :", token);
    if (!token) {
        window.location.href = "/auth/login";
        return;
    } else {
        loadRecipeForEdit(window.recipeId,token);
    }
    let originalRecipeData = null; // global variable
    recipeId = window.recipeId;//console.log("recipeId is :", window.recipeId);

    // Populate units dropdown for a selected ingredient
    async function populateUnits(row, ingredientId, selectedUnitId, token) {
        const unitSelect = row.querySelector(".unit-select");
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
            if (u.unit_id === selectedUnitId) option.selected = true; // keep current unit selected
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
    function populateBaseUnits(row, currentUnit) {
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

        const baseUnitSelect = row.querySelector(".base-unit-select");
        baseUnitSelect.innerHTML = "";

        if (group) {
            group.forEach(u => {
                const option = document.createElement("option");
                option.value = u;
                option.textContent = u;
                if (u === currentUnit) option.selected = true;
                baseUnitSelect.appendChild(option);
            });
        } else {
            const option = document.createElement("option");
            option.value = currentUnit;
            option.textContent = currentUnit;
            option.selected = true;
            baseUnitSelect.appendChild(option);
        }
    }

    const unitGroups = {
    weight: { base: "kg", factors: { kg: 1, g: 0.001, oz: 0.0283495, lbs: 0.453592 } },
    volume: { base: "l", factors: { l: 1, ml: 0.001, "fl.oz": 0.0295735, pint: 0.473176 } },
    bunch: {base: "bunch", factors: {bunch :1}},
    pc: {base: "pc", factors: {pc :1}}
};

    // recalculate the cost of ingredient as per the unit selected
    function recalcCost(row) {
        const quantityInput = row.querySelector(".quantity");
        const unitSelect = row.querySelector(".unit-select");
        const baseQuantityInput = row.querySelector(".base-quantity");
        const baseUnitSelect = row.querySelector(".base-unit-select");
        const basePriceInput = row.querySelector(".base-price");
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
        let group = null;
        for (const [key, def] of Object.entries(unitGroups)) {
            if (def.factors[baseUnit] !== undefined) {
                group = def;
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
        //console.log("total price is : ", total);
        const totalCostEl = document.getElementById("recipe-total-cost");
        if (totalCostEl) {
            totalCostEl.textContent = `Total Cost: £${total.toFixed(2).replace(/\.00$/, "")}`;
        }
    }

    // attach cost events
    function attachCostEvents(row) {
        const quantityInput = row.querySelector(".quantity");
        const baseQuantityInput = row.querySelector(".base-quantity");
        const basePriceInput = row.querySelector(".base-price");
        const unitSelect = row.querySelector(".unit-select");
        const baseUnitSelect = row.querySelector(".base-unit-select");

        quantityInput.addEventListener("input", () => recalcCost(row));
        baseQuantityInput.addEventListener("input", () => recalcCost(row));
        basePriceInput.addEventListener("input", () => recalcCost(row));
        unitSelect.addEventListener("change", () => recalcCost(row));
        baseUnitSelect.addEventListener("change", () => recalcCost(row));
    }

    // enforce quantities to be positive and more than zero and not more  than 1000000
    function enforceQuantityValidation(input, { allowEmpty = false, defaultValue = 1 } = {}) {
        const row = input.closest("tr");

        input.addEventListener("input", () => {
            let val = input.value;

            // Allow only numbers with up to 2 decimals
            if (!/^\d*\.?\d{0,2}$/.test(val)) {
                input.value = val.slice(0, -1); // remove last invalid char
            }
        });

        input.addEventListener("blur", () => {
            let val = input.value.trim();

            // Empty case → force 0
            if (val === "") {
                input.value = "";
                recalcCost(row);
                return;
            }

            let num = parseFloat(val);

            // Invalid → set to 0
            if (isNaN(num)) {
                input.value = "0";
                recalcCost(row);
                return;
            }

            // Negative → set to 0
            if (num < 0) num = 0;

            // Limit to 1,000,000
            if (num > 1000000) num = 1000000;

            // Fix to max 2 decimals
            input.value = num.toFixed(2).replace(/\.00$/, ""); // remove trailing .00
            recalcCost(row);
        });
    }

    // load all the details of recipe in the page
    async function loadRecipeForEdit(recipeId, token) {
        
        try {
            const res = await fetch(`/recipes/api/recipe/edit/${recipeId}`, {
            headers: { "Authorization": `Bearer ${token}` }
            });

            //console.log("response is: ", await res)
            if (res.status === 403) {
                alert("You don’t have permission to edit this recipe.");
                window.location.href = `/recipes/details/${recipeId}`; // redirect to view
                return;
        }
            const data = await res.json();//console.log("data is: ", data)
            originalRecipeData = structuredClone(data); // deep copy to preserve original
            
            // populate form fields with data.recipe, ingredients, steps...
            document.getElementById("recipe-name-input").value = data.recipe.name;
            document.getElementById("portion-size-input").value = data.recipe.portion_size;
            document.getElementById("description-input").value = data.recipe.description;

            // Populate ingredients table
            ingredients = data.ingredients;// console.log("ingredients:", ingredients);
            const tbody = document.getElementById("ingredients-tbody");
            tbody.innerHTML = ""; // clear existing rows

            
            ingredients.forEach(async (i) => {
                const tr = document.createElement("tr");
                tr.classList.add("ingredient-row");
                tr.dataset.recipeIngredientId = i.recipe_ingredient_id || "";
                tr.innerHTML = `
                    <td>
                        <input type="text" class="ingredient-name" value="${i.name}">
                        <div class="suggestions-box" style="display:none; position:absolute; background:white; border:1px solid #ccc; z-index:1000;"></div>
                    </td>
                    <td><input type="number" class="quantity" value="${i.quantity}" step="any"></td>
                    <td>
                    <select class="unit-select">
                        <option value="${i.unit_id}" selected>${i.unit_name}</option>
                        <!-- You can add other options later -->
                    </select>
                    </td>
                    <td class="cost-input" style="text-align: center;"></td>
                    <td><input type="number" class="base-quantity" value="${Number(1)}" step="any"></td>
                    <td>
                    <select class="base-unit-select">
                        <option value="${i.base_unit}" selected>${i.unit}</option>
                    </select>
                    </td>
                    <td><input type="number" class="base-price" value="${Number(i.base_price).toFixed(2)}" step="any"></td>
                    <td><button class="remove-ingredient-btn">Remove</button></td>
                `;
                tbody.appendChild(tr);
                //const costCell = row.querySelector(".cost-input"); 
                //costCell.textContent = i.price > 0 ? i.price.toFixed(4) : "";

                initializeIngredientInput(tr, token);

                await populateUnits(tr, i.ingredient_id, i.unit_id, token);

                populateBaseUnits(tr, i.unit)

                attachCostEvents(tr);

                recalcCost(tr);

                // For normal quantity (can be blank if user deletes it)
                enforceQuantityValidation(tr.querySelector(".quantity"), { allowEmpty: false, defaultValue: 1 });

                // For base quantity (cannot be blank, defaults to 1)
                enforceQuantityValidation(tr.querySelector(".base-quantity"), { allowEmpty: false, defaultValue: 1 });

                // For base quantity (cannot be blank, defaults to 1)
                enforceQuantityValidation(tr.querySelector(".base-price"), { allowEmpty: false, defaultValue: 1 });

                
            });

            // update total cost
            //updateTotalRecipeCost();

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

    // Initialize autocomplete for an ingredient
    function initializeIngredientInput(row, token) {
        const input = row.querySelector(".ingredient-name");
        const suggestionBox = row.querySelector(".suggestions-box");
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
                    const nextInput = row.querySelector(".quantity");
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
                    row.querySelector(".quantity").value = "";
                    row.querySelector(".base-quantity").value = "";
                    row.querySelector(".base-unit-select").innerHTML = "<option>Select unit</option>";
                    row.querySelector(".base-price").value = "";
                    row.querySelector(".unit-select").innerHTML = "<option value=''>Select unit</option>";
                    recalcCost(row);
                }
                suggestionBox.style.display = "none";
                activeIndex = -1;
            }, 150);
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

            row.querySelector(".base-quantity").value = 1;
            row.querySelector(".base-price").value = item.price ? Number(item.price).toFixed(2) : "";
            row.querySelector(".base-unit-select").innerHTML = `<option selected>${item.base_unit || ""}</option>`;

            // Store defaults for payload comparison
            row._default_base_quantity = 1;
            row._default_base_price = item.price ? Number(item.price).toFixed(2) : 0;
            row._default_base_unit = item.base_unit || "";

            // Populate the units dropdown using the correct 4 params
            await populateUnits(row, item.ingredient_id, null, token);
            populateBaseUnits(row, item.base_unit); 

            suggestionBox.style.display = "none";
        }
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

        return { filledRows, add_ingredients, update_ingredients, remove_ingredients, errorMessage: null };
    }

    //compare the original recipe ingredientsand new. Only attach those that are not same - i.e. updated.
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

     // add new row for ingredientin table
     document.getElementById("add-ingredient-btn").addEventListener("click", () => {
        const tbody = document.getElementById("ingredients-tbody");
        const tr = document.createElement("tr");
        tr.classList.add("ingredient-row");

        tr.innerHTML = `
            <td>
            <input type="text" class="ingredient-name" value="">
            <div class="suggestions-box" style="display:none; position:absolute; background:white; border:1px solid #ccc; z-index:1000;"></div>
            </td>
            <td><input type="number" class="quantity" value="" step="any"></td>
            <td>
            <select class="unit-select">
                <option value="">-- Select --</option>
            </select>
            </td>
            <td class="cost-input" style="text-align: right;"></td>
            <td><input type="number" class="base-quantity" value="" step="any"></td>
            <td>
            <select class="base-unit-select">
                <option value="">-- Select --</option>
            </select>
            </td>
            <td><input type="number" class="base-price" value="" step="any"></td>
            <td><button class="remove-ingredient-btn">Remove</button></td>
        `;

        tbody.appendChild(tr);

        // Now reapply all existing row initializers
        initializeIngredientInput(tr, token);   // autocomplete / search
        attachCostEvents(tr);                   // cost recalculation
        enforceQuantityValidation(tr.querySelector(".quantity"), { allowEmpty: false, defaultValue: 1 });
        enforceQuantityValidation(tr.querySelector(".base-quantity"), { allowEmpty: false, defaultValue: 1 });
        enforceQuantityValidation(tr.querySelector(".base-price"), { allowEmpty: false, defaultValue: 1 });
    });
   
    // remove button logic for ingredients 
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-ingredient-btn")) {
            const row = e.target.closest("tr");
            const recipeIngredientId = row.dataset.recipeIngredientId;
            const ingredientName = row.querySelector(".ingredient-name").value;

            // If ingredient is empty, remove row immediately
            if (!ingredientName) {
                row.remove();
                updateTotalRecipeCost();
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
        const { filledRows, add_ingredients, update_ingredients, remove_ingredients, errorMessage}  = validateIngredientRows();
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

        // Display success message and redirect
        showAlert(data.message || "Recipe updated successfully!");
        setTimeout(() => { window.location.href = `/recipes/details/${recipeId}`; }, 1000);
        } catch (err) {
        errorBox.textContent = err.message;
        }        

    });
    
});