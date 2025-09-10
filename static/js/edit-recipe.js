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
        console.log("Fetching units for ingredient:", ingredientId, typeof ingredientId);
        try {
            const res = await fetch(`/recipes/api/ingredient-units?ingredient=${encodeURIComponent(ingredientId)}`, {
            headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to load units for ingredient " + ingredientId);

            const units = await res.json();

            units.forEach(u => {
            const option = document.createElement("option");
            option.value = u.unit_id;
            option.textContent = u.unit_name;
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

    // enforce quantities to be positive and more than zero and not more  than 1000000
    function enforceQuantityValidation(input, { allowEmpty = false, defaultValue = 1 } = {}) {
        input.addEventListener("input", () => {
            let val = input.value;

            // Allow empty temporarily while typing
            if (val === "") return;

            // Allow only numbers with up to 2 decimals
            if (!/^\d*\.?\d{0,2}$/.test(val)) {
                input.value = val.slice(0, -1); // remove last invalid char
            }
        });

        input.addEventListener("blur", () => {
            let val = input.value.trim();

            // Empty case
            if (val === "") {
                if (!allowEmpty && defaultValue !== null) {
                    input.value = defaultValue;
                }
                return;
            }

            let num = parseFloat(val);

            // Invalid or <= 0
            if (isNaN(num) || num <= 0) {
                input.value = allowEmpty ? "" : defaultValue;
                return;
            }

            // Limit to 1,000,000
            if (num > 1000000) num = 1000000;

            // Fix to max 2 decimals
            input.value = num.toFixed(2).replace(/\.00$/, ""); // remove trailing .00
        });
    }

    // load all the details of recipe in the page
    async function loadRecipeForEdit(recipeId, token) {
        
        try {
            const res = await fetch(`/recipes/api/recipe/${recipeId}`, {
            headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to load recipe");

            const data = await res.json();
            console.log("data is: ", data)
            originalRecipeData = structuredClone(data); // deep copy to preserve original
            
            // populate form fields with data.recipe, ingredients, steps...
            document.getElementById("recipe-name-input").value = data.recipe.name;
            document.getElementById("portion-size-input").value = data.recipe.portion_size;
            document.getElementById("description-input").value = data.recipe.description;

            // populate ingredients and steps into table/list as we did in Step 1
            // Populate ingredients table
            ingredients = data.ingredients;
            const tbody = document.getElementById("ingredients-tbody");
            tbody.innerHTML = ""; // clear existing rows

            
            ingredients.forEach(async (i) => {
                const tr = document.createElement("tr");
                tr.classList.add("ingredient-row");
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
                    <td>${Number(i.price).toFixed(4)}</td>
                    <td><input type="number" class="base-quantity" value="${Number(1)}" step="any"></td>
                    <td>
                    <select class="base-unit-select">
                        <option value="${i.base_unit}" selected>${i.unit}</option>
                        <!-- Options for kg/g/oz/lbs will come later -->
                    </select>
                    </td>
                    <td><input type="number" class="base-price" value="${Number(i.cost).toFixed(2)}" step="any"></td>
                    <td><button class="remove-ingredient-btn">Remove</button></td>
                `;
                tbody.appendChild(tr);

                initializeIngredientInput(tr, token);

                await populateUnits(tr, i.ingredient_id, i.unit_id, token);

                populateBaseUnits(tr, i.unit)

                // For normal quantity (can be blank if user deletes it)
                enforceQuantityValidation(tr.querySelector(".quantity"), { allowEmpty: false, defaultValue: 1 });

                // For base quantity (cannot be blank, defaults to 1)
                enforceQuantityValidation(tr.querySelector(".base-quantity"), { allowEmpty: false, defaultValue: 1 });

                
            });

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

            console.log("Recipe loaded successfully");
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

        // fetching list for ingredients by text in input and click the ingredient
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

        input.addEventListener("blur", function () {
            setTimeout(() => {
                const currentValue = this.value.trim().toLowerCase();
                if (!fetchedIngredients.includes(currentValue)) {
                    this.value = "";
                    delete row.dataset.ingredientId;
                    row.querySelector(".base-quantity").value = "";
                    row.querySelector(".base-unit-select").innerHTML = "<option selected></option>";
                    row.querySelector(".base-price").value = "";
                    row.querySelector(".unit-select").innerHTML = "<option value=''>-- Select unit --</option>";
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

            // Populate the units dropdown using the correct 4 params
            await populateUnits(row, item.ingredient_id, null, token);
            populateBaseUnits(row, item.base_unit); 

            suggestionBox.style.display = "none";
        }

        
    }      
      
});