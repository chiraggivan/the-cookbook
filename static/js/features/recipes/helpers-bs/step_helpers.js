export function initializeStepRow(row, token) {
  //   attachRowListeners(row);
  //   attachCostEvents(row);
  initializeStepInput(row, token);
}
// function to create empty row for steps
export function getEmptyStepRow() {
  return `
        <td>
            <div class="d-flex" style="justify-content: center; gap: 0.5rem">
                <i class="btn btn-sm btn-outline-success bi bi-arrow-up" style="display: none"></i>
                <i class="btn btn-sm btn-outline-success bi bi-arrow-down" style="display: none"></i>
            </div>
        </td>

        <td>
            <div class="step-no text-end"></div>
        </td>

        <td>
            <textarea
            name="recipe_step_1"
            class="form-control form-control-sm"
            placeholder=""
            autocomplete="off"
            rows="1"
            ></textarea>
            <div class="error-create-recipe" id="errorRecipeStep_1"></div>
        </td>

        <td>
            <input
            type="time"
            name="step_time_1"
            class="form-control form-control-sm"
            />
            <div class="error-create-recipe" id="errorStepTime_1"></div>
        </td>

        <td style="text-align: center">
            <div
            class="btn btn-sm btn-outline-danger bi bi-trash remove-step-btn"
            style="display: none"
            ></div>
        </td>
        `;
}

export function initializeStepInput(row, token) {
  const input = row.querySelector('textarea[name^="recipe_step_"]');

  let fetchedIngredientNames = [];
  let ingredientsData = [];
  let activeIndex = 1;
  let rowIndex = 1;
  let initialValue = ""; // Track initial input value on focus

  // Store initial value when the input is focused
  input.addEventListener("focus", function () {
    initialValue = this.value.trim().toLowerCase();
  });

  input.addEventListener("input", () => {
    row.querySelector(".remove-step-btn").style.display = "inline-block";
    const tbody = document.getElementById("steps-tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const currentRow = row;
    const currentRowIndex = rows.indexOf(currentRow); //console.log("current row index:", currentRowIndex);
    // const nextRow = rows[currentRowIndex + 1];
    const lastRow = rows[rows.length - 1];
    const isCurrentRowLastRow = currentRow === lastRow;
    // const targetRow = isCurrentRowLastRow ? currentRow : null;
    // const currentRowInputs = targetRow
    //   ? Array.from(targetRow.querySelectorAll("input, select")).map((i) =>
    //       i.value.trim(),
    //     )
    //   : [];

    // Add new row if last row is filled
    if (isCurrentRowLastRow) {
      const index = rows.length + 1;
      const newRow = document.createElement("tr");
      //   newRow.classList.add("step-row");
      newRow.innerHTML = getEmptyStepRow(index);

      // Insert before the next component row, or append if none exists or last row is component
      //   if (isNextRowComponent) {
      //     tbody.insertBefore(newRow, nextRow);
      //   } else {
      tbody.appendChild(newRow);
      //   }

      initializeStepRow(newRow, token);
      updateSerialNo();
      //   updateMoveButtons();
    }
  });
}

// updating Step No function
export function updateSerialNo() {
  const tbody = document.getElementById("steps-tbody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach((row, index) => {
    const stepNoCell = row.querySelector(".step-no");

    if (stepNoCell) {
      stepNoCell.textContent = index + 1;
    }
  });
}
