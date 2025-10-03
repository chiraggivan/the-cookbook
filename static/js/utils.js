// static/js/utils.js

// * Normalize user input: Trim leading/trailing spaces - Collapse multiple spaces into one
function normalizeInput(str) {
  return str.replace(/\s+/g, " ").trim();
}

// show alert function common for all pages
function showAlert(message, isError = false, autoClose = true) {
  const overlay = document.getElementById("modal-overlay");
  const alertBox = document.getElementById("alert-box");
  const alertMessage = document.getElementById("alert-message");
  const alertActions = document.getElementById("alert-actions");

  alertMessage.textContent = message;
  alertBox.className = "alert-box" + (isError ? " error" : " success");
  overlay.style.display = "flex";
  alertActions.style.display = "none"; // hide OK button if autoclose

  if (autoClose) {
    setTimeout(() => {
      overlay.style.display = "none";
    }, 2000); // hide after 2s
  } else {
    alertActions.style.display = "block"; // show OK button
    document.getElementById("alert-ok").onclick = () => {
      overlay.style.display = "none";
    };
  }
}
// show confirm message
function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("modal-overlay");
    const alertBox = document.getElementById("alert-box");
    const alertMessage = document.getElementById("alert-message");
    const alertActions = document.getElementById("alert-actions");

    alertMessage.textContent = message;
    alertBox.className = "alert-box";
    overlay.style.display = "flex";

    // Replace actions with Yes/No buttons
    alertActions.innerHTML = `
      <button id="confirm-yes">Yes</button>
      <button id="confirm-no" style="background:#f44336;">No</button>
    `;
    alertActions.style.display = "block";

    document.getElementById("confirm-yes").onclick = () => {
      overlay.style.display = "none";
      resolve(true);
    };
    document.getElementById("confirm-no").onclick = () => {
      overlay.style.display = "none";
      resolve(false);
    };
  });
}

// validate recipe table data for create and update recipe
function validateRecipeForm({ name, portion_size, description, privacy }) {
  let errors = {};

  // Normalize inputs
  name = normalizeInput(name);
  portion_size = normalizeInput(portion_size);
  description = normalizeInput(description);

  // Recipe name
  if (!name) {
    errors.name = "Recipe name is required.";
  } else if (name.length > 50) {
    errors.name = "Recipe name must be less than 50 characters.";
  }

  // Portion size
  if (!portion_size) {
    errors.portion_size = "Portion size is required.";
  } else if (portion_size.length < 1 || portion_size.length > 20) {
    errors.portion_size = "Portion size must not be empty and be less than 20 characters.";
  }

  // Description
  if (description.length > 500) {
    errors.description = "Description must be ≤ 500 characters.";
  }

  // Privacy
  //if (!["public", "private"].includes(privacy)) {
  //  errors.privacy = "Privacy must be public or private.";
  //}
  
  return {errors, data: { name, portion_size, description } };
}


