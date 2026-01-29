import { isTokenValid } from "../../core/utils.js"; 
import { showConfirm, showAlert, showMessage } from "../../core/confirmModal.js"

const token = localStorage.getItem("access_token");//console.log(token)
const decoded = parseJwt(token); //console.log("decoded : ",decoded);
const loggedInUserId = parseInt(decoded ? decoded.sub : null); //console.log("user _id: ",loggedInUserId)
let ingredientData;

function parseJwt(token) {
    try {
        const base64Payload = token.split('.')[1]; 
        const payload = atob(base64Payload);  // decode base64
        return JSON.parse(payload);
    } catch (e) {
        console.error("Invalid token", e);
        return null;
    }
}

// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
}

// safely for XSS attack/ html injection
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}

// get session variable data 
const ingredient = JSON.parse(
    sessionStorage.getItem("editIngredient")
);

// console.log("ingredient in session is: ", ingredient);
// if session variable not found 
if (!ingredient) {
    console.log("something went wrong while retreiving session variable")
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("name").value = ingredient.name;
    document.getElementById("price").value = ingredient.price;
    document.getElementById("quantity").value = ingredient.quantity;
    document.getElementById("unit").value = ingredient.unit;
    document.getElementById("cup-weight").value = ingredient.cup_weight;
    document.getElementById("cup-unit").value = ingredient.cup_unit ?? '';

    const errorBox = document.getElementById("error");
    const cupErrorBox = document.getElementById("cupError");

    // making sure to remove cup error message on input of cup weight
    document.getElementById("cup-weight").addEventListener("input", ()=> {
        document.getElementById("cupError").classList.add("d-none");
    })

    // making sure to remove cup error message on input of cup unit
    document.getElementById("cup-unit").addEventListener("input", ()=> {
        document.getElementById("cupError").classList.add("d-none");
    })

    // block invalid keys in number input field
    const numberValue = document.querySelectorAll(".no-invalid-number");
    numberValue.forEach(input => {

        // blocking signs,arrow button, alphabets, etc
        input.addEventListener("keydown", (e) =>{
            const blockedKeys = ["+", "-", "e", "E", "ArrowUp", "ArrowDown"];
            if(blockedKeys.includes(e.key)){
                e.preventDefault();
            }
        })
        // safety + maximum digits after demical
        input.addEventListener("input", () =>{
            if(input.value < 0){
                input.value = "";
            }
            
            if (input.value.includes(".")) {
                const [int, dec] = input.value.split(".");
                if(input.id == 'price'){
                        if (dec.length > 2) {
                        input.value = int + "." + dec.slice(0, 2);
                    }
                }else{
                    if (dec.length > 3) {
                        input.value = int + "." + dec.slice(0, 3);
                    }
                }
                    
            }
        })
    })

    // clear nameError if display
    document.getElementById("name").addEventListener("click", () =>{
        if(document.getElementById("name").value.trim() == ''){
            document.getElementById("name").value ='';
        }
        nameError.textContent ='';
    })

    // cancel button
    document.getElementById("cancelBtn").addEventListener("click", (e) => {
        e.preventDefault();
        window.history.back();
    });

    // delete ingredient button
    const deleteBtn = document.getElementById("deleteBtn");
    deleteBtn.addEventListener("click", async () => {
        //use custom modal confirm instead of native confirm
        const confirmed = await showConfirm(`Are you sure you want to delete ingredient : ${(ingredient.name)}`);
        if (!confirmed) return;

        try {
            const response = await fetch(`/user_ingredients/api/delete/${ingredient.ingredient_id}`, {
                method: "DELETE",
                headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
                }
            });
            const data = await response.json(); // console.log("data is : ", data);

            if (response.ok) {
                showMessage(data.message || "Ingredient deleted successfully!");
                setTimeout(() => { window.location.href = "/user_ingredients/"; }, 1000);
            } else {
                showMessage(data.error || "Failed to delete recipe.", true);
            }
        } catch (err) {
                console.error("Error deleting recipe:", err);
                showMessage("Something went wrong.", true);
        }
    })

    // submit form (update button)
    document.querySelector("form").addEventListener("submit", async function (e) {
        e.preventDefault();

        //check if ingredient name is available
        if(document.getElementById("name").value.trim() == ''){
            nameError.textContent ="Name required";
            return;
        }

        let i_cup_weight;
        let i_cup_unit;
        
        //  check cup weight and cup unit- Both field or both empty
        if((document.getElementById("cup-weight").value && !document.getElementById("cup-unit").value) ||
            (!document.getElementById("cup-weight").value && document.getElementById("cup-unit").value)){
                cupErrorBox.textContent = " Both weight and unit should be provided or keep both empty.";
                cupErrorBox.classList.remove("d-none");
                return;
            }

        if(document.getElementById("cup-weight").value){
            i_cup_weight = parseFloat(document.getElementById("cup-weight").value);
            i_cup_unit = document.getElementById("cup-unit").value
        } else {
            i_cup_weight = null;
            i_cup_unit = null;
        }

        // Read inputs
        const payload = {
            ingredient_id: ingredient.ingredient_id,
            name: document.getElementById("name").value,
            price: parseFloat(document.getElementById("price").value),
            quantity: parseFloat(document.getElementById("quantity").value),
            unit: document.getElementById("unit").value,
            cup_weight: i_cup_weight,
            cup_unit: i_cup_unit,
            notes: ""
        };

        // console.log("sent payload is :", payload);
        try{
            const response = await fetch("/user_ingredients/api/edit", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json(); // console.log("After fetch command for update-recipe", response)

            if (!response.ok) {
                errorBox.textContent = data.error || "Something went wrong while doing api fetch for update-recipe.";
                console.log("Submitted data (for debug):", data.submitted_data);
                return;
            };

            // Display success message and redirect
            showMessage(data.message || "Recipe updated successfully!");
            setTimeout(() => { window.location.href = `/user_ingredients/`; }, 1500);
            
        } catch(error){
            console.error("Fetch failed:", error);
        }
        
    });
})

