// static/js/utils.js

// * Normalize user input: Trim leading/trailing spaces - Collapse multiple spaces into one
function normalizeInput(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\s+/g, " ").trim();
}

// show alert function common for all pages
export function showAlert(message, isError = false, autoClose = true) {
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
export function showConfirm(message) {
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

// Show a multi-option confirm modal
export function showMultiConfirm(message, componentName) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("multi-modal-overlay");
    const alertBox = document.querySelector(".multi-alert-box");
    const alertMessage = document.getElementById("multi-alert-message");
    const alertActions = document.getElementById("multi-alert-actions");

    alertMessage.textContent = message;
    alertBox.className = "multi-alert-box";
    overlay.style.display = "flex";

    // Replace actions with three options
    alertActions.innerHTML = `
      <button id="confirm-delete-component" class="select-btn">Remove ${componentName} Only</button>
      <button id="confirm-delete-with-ingredients" class="select-btn">Remove ${componentName} + Ingredients</button>
      <button id="confirm-cancel" style="background:#f44336;">Cancel</button>
    `;
    alertActions.style.display = "block";

    // Button events
    document.getElementById("confirm-delete-component").onclick = () => {
      overlay.style.display = "none";
      resolve("component");
    };

    document.getElementById("confirm-delete-with-ingredients").onclick = () => {
      overlay.style.display = "none";
      resolve("with-ingredients");
    };

    document.getElementById("confirm-cancel").onclick = () => {
      overlay.style.display = "none";
      resolve("cancel");
    };
  });
}

// validate recipe table data for create and update recipe
function validateRecipeForm({rName, portion_size, rDescription } ={}) {
  let errors = {};

  // Normalize inputs
  const recipeName = normalizeInput(rName);
  const portionSize = normalizeInput(portion_size);
  const  description = normalizeInput(rDescription);

  // Recipe name
  if (!recipeName) {
    errors.name = "Recipe name is required.";
  } else if (recipeName.length > 50) {
    errors.name = "Recipe name must be less than 50 characters.";
  }

  // Portion size
  if (!portionSize) {
    errors.portion_size = "Portion size is required.";
  } else if (portionSize.length < 1 || portionSize.length > 20) {
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
  
  return {errors, data: { recipeName, portionSize, description} };
}

// check if token is valid
export function isTokenValid(token) {
    if (!token) return true; // no token = treat as expired
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1])); // decode the middle part
        const exp = payload.exp;
        if (!exp) return true; // no exp field? treat as invalid
        const now = Math.floor(Date.now() / 1000); // current time in seconds
        return exp > now; // true if valid
    } catch (err) {
        console.error("Invalid token:", err);
        return true; // if token can’t be decoded → treat as invalid
    }
}

// Function to decode JWT, check role and get user_i
export function getUserFromToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);

    return {
      user_id: payload.sub,  
      role: payload.role
    };
  } catch (e) {
    return null;
  }
}


// --- Hybrid global compatibility (for non-module scripts) ---
if (typeof window !== "undefined") {
  window.isTokenValid = isTokenValid;
  window.showConfirm = showConfirm;
  window.showMultiConfirm = showMultiConfirm;
  window.showAlert = showAlert;
}
