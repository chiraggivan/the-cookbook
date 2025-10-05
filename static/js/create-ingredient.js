const token = localStorage.getItem("access_token");

// check if user is admin and display menu accordingly
if (token) {
    const role = getUserRole(token);
    if (role === 'admin') {
        document.querySelector('.admin-options').style.display = 'inline-flex';
       
    } else {
        document.getElementById("error").textContent = "Admin privileges required.";
        setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
    }
} else {
    document.getElementById("error").textContent = "Please log in to edit ingredient.";
    setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
}

// get user's role from token
function getUserRole(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload).role;
    } catch (e) {
        return null;
    }
}

// validate form before submission
function validateIngredientForm(){
    // Get input values and trim whitespace
    const name = document.getElementById("ingredientName").value.trim().replace(/\s+/g, ' ').toLowerCase();
    const referenceQuantity = document.getElementById("referenceQuantity").value.trim();
    const referenceUnit = document.getElementById("referenceUnit").value.trim().toLowerCase();
    const defaultPrice = document.getElementById("defaultPrice").value.trim();
    const cupWeight = document.getElementById("cupWeight").value.trim();
    const cupUnit = document.getElementById("cupUnit").value.trim().toLowerCase();
    const notes = document.getElementById("notes").value.trim();
    

    // Get error display elements
    const errorName = document.getElementById("errorName");
    const errorRQ = document.getElementById("errorRQ");
    const errorDP = document.getElementById("errorDP");
    const errorRU = document.getElementById("errorRU");
    const errorCW = document.getElementById("errorCW");
    const errorCU = document.getElementById("errorCU");
    const errorNotes = document.getElementById("errorNotes");


    // Clear previous error messages
    errorName.textContent = "";
    errorRQ.textContent = "";
    errorDP.textContent = "";
    errorRU.textContent = "";
    errorCW.textContent = "";
    errorCU.textContent = "";
    errorNotes.textContent = "";
    document.getElementById("error").textContent = "";

    let hasError = false;

    // Validate recipe name
    if (!name) {
        errorName.textContent = "Ingredient name is required.";
        hasError = true;
    } else if (name.length > 30) {
        errorName.textContent = "Ingredient name must be less than 30 characters.";
        hasError = true;
    }

    // validate reference quantity
    if (!referenceQuantity) {
        errorRQ.textContent = 'Reference Quantity is required.';
        hasError = true;
    } else if (isNaN(referenceQuantity) || Number(referenceQuantity) <= 0) {
        errorRQ.textContent = 'Reference Quantity must be a positive number.';
        hasError = true;
    }

    // validate reference unit
    if (!referenceUnit) {
        errorRU.textContent = 'Reference Unit is required.';
        hasError = true;
    } else if (!['kg', 'g', 'oz', 'lbs', 'l', 'ml', 'fl.oz', 'pint', 'pc', 'bunch'].includes(referenceUnit))  {
        errorRU.textContent = 'Reference Unit must be one of these (kg, g, oz, lbs, l, ml, fl.oz, pint, pc, bunch).';
        hasError = true;
    }

     // validate default price
    if (!defaultPrice) {
        errorDP.textContent = 'Default Price is required';
        hasError = true;
    } else if (isNaN(defaultPrice) || Number(defaultPrice) <= 0) {
        errorDP.textContent = 'Default Price must be a positive number.';
        hasError = true;
    }

    // Check if both cup weight and cup unit are supplied. They both should be provided or empty
    if (cupWeight && cupWeight > 0 && !cupUnit) {
        errorCU.textContent = 'Select unit if Cup Weight provided.';
        hasError = true;
    } else if (!cupWeight && cupUnit) {
        errorCW.textContent = 'Enter weight if Cup Unit selected.';
        hasError = true;
    }

    // validate cup weight IF cup weight provided
    if (cupWeight) {
        if (isNaN(cupWeight) || Number(cupWeight) <= 0) {
            errorCW.textContent = 'Cup Weight must be a positive number.';
            hasError = true;
        }
    }

    // validate cup unit IF cup unit provided
    if (cupUnit) {
        if (!['kg', 'g', 'oz', 'lbs'].includes(cupUnit))  {
            errorCU.textContent = 'Cup Unit must be one of these (kg, g, oz, lbs).';
            hasError = true;
        }
    }

    // validate Notes IF cup Notes provided
    if (notes) {
        if (notes.length > 100)  {
            errorNotes.textContent = 'Notes must be less than 100.';
            hasError = true;
        }
    }

    // Return false if errors exist, otherwise return validated data
    if (hasError) return false;
    return { name, referenceQuantity, referenceUnit, defaultPrice, cupWeight, cupUnit, notes };
}

document.addEventListener('DOMContentLoaded', function() {
    
    // restrict numeric field to specific decimal and no e allowed
    ['referenceQuantity','defaultPrice','cupWeight'].forEach(id=> {
        // Prevent typing 'e', '+', '-' in the number input
        document.getElementById(id).addEventListener("keydown", function(e) {
            if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // Limit total digits and decimals
        document.getElementById(id).addEventListener("input", function() {
            let value = this.value;

            // Split integer and decimal parts
            if (value.includes(".")) {
                let [intPart, decPart] = value.split(".");
                // Max 5 digits before decimal
                if (intPart.length > 5) intPart = intPart.slice(0, 5);
                if(id == 'defaultPrice'){
                    // Max 2 digits after decimal
                    if (decPart.length > 2) decPart = decPart.slice(0, 2);
                    this.value = intPart + "." + decPart;
                } else {
                    // Max 3 digits after decimal
                    if (decPart.length > 3) decPart = decPart.slice(0, 3);
                    this.value = intPart + "." + decPart;
                }
                
            } else if (value.length > 5) {
                this.value = value.slice(0, 5);
            }
        });
    });  

    // Add autocomplete for ingredient name
    document.getElementById("ingredientName").addEventListener("input", async function() {
        const query = this.value.trim().toLowerCase();
        const existingIngredients = document.getElementById("existingIngredients");
        existingIngredients.value = ""; // Clear previous results

        if (query.length < 1) return;

        try {
            const res = await fetch(`/ingredients/api/ingredients/search?q=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to fetch ingredients");

            const data = await res.json();
            if (data.length === 0) {
                existingIngredients.value = "No matching ingredients found.";
                return;
            }

            // Display matching ingredient names as comma-separated list
            const names = data.map(item => item.name).join("\n");
            existingIngredients.value = names;
        } catch (err) {
            console.error("Error fetching ingredients:", err);
            existingIngredients.value = "Error fetching ingredients.";
        }
    });

    // Handle ingredient submission
    document.getElementById("saveIngredient").addEventListener("click", async () => {
        // Validate all form sections
        const ingredientData = validateIngredientForm();// console.log("ingredient data: ", ingredientData);
        if (!ingredientData) return;

        // Combine validated data
        const completeIngredient = {
        name: ingredientData["name"],
        reference_quantity: Number(ingredientData["referenceQuantity"]),
        reference_unit: ingredientData["referenceUnit"],
        default_price: Number(ingredientData["defaultPrice"]),
        cup_equivalent_weight: Number(ingredientData["cupWeight"]),
        cup_equivalent_unit: ingredientData["cupUnit"] || '',
        notes: ingredientData["notes"] || ''
        };

        // Submit recipe to backend API
        console.log("data sent:", completeIngredient)
        const errorBox = document.getElementById("error");
        try {
            const response = await fetch("/ingredients/api/new-ingredient", {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(completeIngredient)
            });

            const data = await response.json();
            if (!response.ok) {
                errorBox.textContent = data.error || "Something went wrong while fetch new-ingredient.";
                console.log("Submitted data (for debug):", data.submitted_data);
                return;
            }

            // Display success message and redirect
            showAlert(data.message || "Ingredient created successfully!");
            console.log("submitted data: ", data)
            //errorBox.textContent = data.message || "Recipe created successfully!";
            setTimeout(() => { window.location.href = "/admin/ingredients"; }, 2000);
        } catch (err) {
            errorBox.textContent = err.message;
        }
        
    });
});



