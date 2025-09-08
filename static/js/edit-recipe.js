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
                    <td><input type="text" class="ingredient-name" value="${i.name}"></td>
                    <td><input type="number" class="quantity" value="${i.quantity}" step="any"></td>
                    <td>
                    <select class="unit-select">
                        <option value="${i.unit_id}" selected>${i.unit_name}</option>
                        <!-- You can add other options later -->
                    </select>
                    </td>
                    <td><input type="number" class="cost" value="${Number(i.cost).toFixed(2)}" readonly></td>
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

                // Now populate the <select class="unit-select"> for this ingredient
                const unitSelect = tr.querySelector(".unit-select");
                try {
                    const res = await fetch(`/recipes/api/units/${i.ingredient_id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                    });

                    if (!res.ok) throw new Error("Failed to load units for ingredient " + i.ingredient_id);

                    const units = await res.json();

                    units.forEach(u => {
                    const option = document.createElement("option");
                    option.value = u.unit_id;
                    option.textContent = u.unit_name;
                    if (u.unit_id === i.unit_id) option.selected = true; // keep current unit selected
                    unitSelect.appendChild(option);
                    });
                } catch (err) {
                    console.error("Error loading units for ingredient", i.ingredient_id, err);
                    const option = document.createElement("option");
                    option.value = "";
                    option.textContent = "No units found";
                    unitSelect.appendChild(option);
                }
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

});