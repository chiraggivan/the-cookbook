// import { updateStepMoveButtons } from "./UI-animation_helpers";

export function initializeStepRow(row) {
  //   attachRowListeners(row);
  //   attachCostEvents(row);
  initializeStepInput(row);
  updateStepMoveButtons();
}

// function to create empty row for steps
export function getEmptyStepRow(index) {
  return `
        <td>
            <div class="d-flex" style="justify-content: center; gap: 0.5rem">
                <i class="btn btn-sm btn-outline-success bi bi-arrow-up move-step-up-btn" style="display:none" ></i>
                <i class="btn btn-sm btn-outline-success bi bi-arrow-down move-step-down-btn" style="display:none"></i>
            </div>
        </td>

        <td>
            <div class="step-no text-end"></div>
        </td>

        <td>
            <textarea
            name="recipe_step_${index}"
            class="form-control form-control-sm"
            placeholder=""
            autocomplete="off"
            rows="1"
            ></textarea>
            <div class="error-create-recipe" id="errorRecipeStep_${index}"></div>
        </td>

        <td>
            <input
            type="time"
            name="step_time_${index}"
            class="form-control form-control-sm"
            />
            <div class="error-create-recipe" id="errorStepTime_${index}"></div>
        </td>

        <td style="text-align: center">
            <div
            class="btn btn-sm btn-outline-danger bi bi-trash remove-step-btn"
            style="display: none"
            ></div>
        </td>
        `;
}
// display 'move' button of Steps according to their position in table
export function updateStepMoveButtons() {
  const tbody = document.getElementById("steps-tbody");

  // during update make sure only those visible rows and not the ones deleted are considered
  const rows = Array.from(tbody.querySelectorAll("tr")); //.filter((r) => r.dataset.removed !== "true");

  rows.forEach((row, i) => {
    const upBtn = row.querySelector(".move-step-up-btn");
    const downBtn = row.querySelector(".move-step-down-btn");

    // const input = row.querySelector('input[name^="step_text_"]');
    // const isEmpty = input?.value.trim() === "";
    const prevRow = rows[i - 1];
    const lastRow = rows[rows.length - 1];
    const isItlastRow = row === lastRow;

    // dont show anything move buttons until 3 rows
    if (rows.length < 3) {
      upBtn.style.display = "none";
      downBtn.style.display = "none";
      return;
    }

    // the very first row will only have down down button once 3 rows are there
    if (i == 0) {
      // console.log("rows more than 2");
      upBtn.style.display = "none";
      downBtn.style.display = "block";
      return;
    }

    // for the rest of the row except last
    if (i > 0 && row != lastRow) {
      // console.log("last row reached");
      upBtn.style.display = "block";
      downBtn.style.display = "block";
      return;
    }

    //  for last row and making sure second last row is having only move up button
    if (isItlastRow) {
      upBtn.style.display = "none";
      downBtn.style.display = "none";
      if (prevRow) {
        prevRow.querySelector(".move-step-down-btn").style.display = "none";
      }
    }
  });
}

// initialise step rows with eventlisteners
export function initializeStepInput(row) {
  const input = row.querySelector('textarea[name^="recipe_step_"]');

  // Store initial value when the input is focused
  input.addEventListener("focus", function () {
    const initialValue = this.value.trim().toLowerCase();
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

    // Add new row if last row is filled
    if (isCurrentRowLastRow) {
      const index = rows.length + 1;
      const newRow = document.createElement("tr");
      newRow.innerHTML = getEmptyStepRow(index);
      tbody.appendChild(newRow);

      setTimeout(() => {
        initializeStepRow(newRow);
        updateSerialNo();
      }, 100);
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
