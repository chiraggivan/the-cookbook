import { getEmptyIngredientRow, initializeIngredientRow } from "./ingredient_helpers.js";

const token = localStorage.getItem("access_token");

// Attach input listeners to a row
export function attachRowListeners(row) {
    row.querySelectorAll("input, select").forEach(input => {
        input.addEventListener("input", (event) =>  handleRowChange(row, event));
    });
}

// Handle row input changes to add new rows dynamically
export function handleRowChange(row, event) {
    if(row.classList.contains("ingredient-row")){
        row.querySelector(".remove-ingredient-btn").style.display="inline-block";
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

            initializeIngredientRow(newRow, token);
            updateMoveButtons();
        }   
    } else if (row.classList.contains("component-row")){
        const tbody = document.getElementById("ingredients-tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        const currentRow = event.target.closest("tr"); // Get the row containing the input
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
            updateMoveButtons();
            document.getElementById(`add-component-btn`).style.display="inline-block";   
        };

    };
};

// display 'move' button of ingredients according to their position in table
export function updateMoveButtons() {
    const tbody = document.getElementById("ingredients-tbody");

    // during update make sure only those visible rows and not the ones deleted are considered
    const rows = Array.from(tbody.querySelectorAll("tr")).filter(
        r => r.dataset.removed !== "true"
    );
    
    rows.forEach((row, i) => {
        const isIngredient = row.classList.contains("ingredient-row");
        if (!isIngredient) return;
        const upBtn = row.querySelector(".move-ing-up-btn");
        const downBtn = row.querySelector(".move-ing-down-btn");
        const input = row.querySelector('input[name^="ingredient_name_"]');
        const isEmpty = input?.value.trim() === "";
        const prevRow = rows[i - 1];
        const nextRow = rows[i + 1];

        // First ingredient in table as it will alway be at index 1 as index 0 will be always component.
        // if the next row after index 1 is component then no buttons should be displayed (as most likely its empty ingredient row)
        if (i == 1){
            if(nextRow && nextRow.classList.contains("component-row")){
                upBtn.style.display = 'none';
                downBtn.style.display = 'none'; 
            // else if next row after index 1 is ingredient then show only move down and disable move up
            } else if (nextRow && nextRow.classList.contains("ingredient-row")){
                upBtn.style.display = 'none';
                downBtn.style.display = 'block';
            }
            return;   
        }
        // if next row is component, most likely(~100%) the row is empty ingredient row - disable both buttons 
        if (nextRow && nextRow.classList.contains("component-row")&& (i+1) != (rows.length - 1)){
            upBtn.style.display = 'none';
            downBtn.style.display = 'none';
            return;
        }
        // if next row is ingredient row and next row is not a last row then show both buttons
        if (nextRow && nextRow.classList.contains("ingredient-row") && (i+1) != (rows.length - 1)){
            upBtn.style.display = 'block';
            downBtn.style.display = 'block';
            return;
        }
         // if next row is ingredient and next row is last row then disable move down button
        if(nextRow && nextRow.classList.contains("ingredient-row") && (i+1) == (rows.length - 1)){
            upBtn.style.display = 'block';
            downBtn.style.display = 'none';
            return;
        }
        // if next row is component and next row is last row then disable move down button
        if(nextRow && nextRow.classList.contains("component-row") && (i+1) == (rows.length - 1)){
            prevRow.querySelector(".move-ing-down-btn").style.display = 'none';
            return;
        }
        // if its the last row and no next row then dont show the move buttons
        // Hypothetical case -THIS CODE NOT REQUIRED. just kept to show how move down button will vanish if there is only one ingredient
        if (!nextRow){
            upBtn.style.display = 'none';
            downBtn.style.display = 'none';
            if(prevRow && prevRow.classList.contains("ingredient-row")){
                prevRow.querySelector(".move-ing-down-btn").style.display = 'none';
            }
        }
    });
}