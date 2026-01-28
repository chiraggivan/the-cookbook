import { isTokenValid } from "../../core/utils.js"; 

const token = localStorage.getItem("access_token");//console.log(token)
const decoded = parseJwt(token); // 
console.log("decoded : ",decoded);
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

getIngredients();

const ingredientsContainer = document.getElementById('ingredients-container');
const errorBox = document.getElementById('errorBox');
const emptyState = document.getElementById('empty-state');

// After successful fetch:
function renderIngredients(data) {
  if (data.count === 0) {
    ingredientsContainer.innerHTML = '';                // clear loading
    emptyState?.classList.remove('d-none');             // show empty message
    return;
  }

  emptyState?.classList.add('d-none');

  let html = '';   // start Bootstrap grid (optional)
  const ingredients =data.ingredients;
  ingredients.forEach(ingredient => {

    // <div class="col-auto">
    //     <img
    //         src="/static/images/sugar.png"
    //         alt="Sugar"
    //         class="ingredient-image"
    //     >
    // </div>
    html += `
    <!-- Ingredient Card -->
    <div class="card ingredient-card mb-3" 
        data-name="${ingredient.name.toLowerCase()}" 
        data-ingredient-id = "${ingredient.ingredient_id}"
        data-unit ="${ingredient.unit}"
        data-price="${ingredient.price}"
        data-quantity="${ingredient.quantity}"
        data-notes ="${ingredient.notes}"
        ${ingredient.cup_weight != null ? `data-cup-weight="${ingredient.cup_weight}"` : ''}
        ${ingredient.cup_unit   != null ? `data-cup-unit="${ingredient.cup_unit}"`   : ''}>
        <div class="card-body">
            <div class="row align-items-center">

                <div class="col">
                    <div class="ingredient-name">
                        ${ingredient.name}
                    </div>
                    <div class="ingredient-meta">
                        <Span class="ingredient-price">£ ${ingredient.price}</span> for 
                        <span class="ingredient-units">${ingredient.quantity} ${ingredient.unit}</span>`
    if(ingredient.cup_weight){
        html += `,  Cup weight: <span class="cup-units">${ingredient.cup_weight} ${ingredient.cup_unit}</span>
                    </div>
                </div>`
    }else{
        html += `   </div>
                </div>`
    }    

    html += `   <div class="col-auto">
                    <a href="#" class="btn btn-success edit-ingredient-btn">
                        Edit
                        <i class="bi bi-pencil ms-1"></i>
                    </a>
                </div>

            </div>
        </div>
    </div>
    `;

  });

  

  ingredientsContainer.innerHTML = html;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('d-none');
  ingredientsContainer.innerHTML = '';   // clear loading
}

// get all the ingredients of user
async function getIngredients() {
    
    try{
        const response = await fetch("/user_ingredients/api/get_user_all_ingredients",{
            method:"GET",
            headers:{ "Authorization": `Bearer ${token}`}            
        })

        const responseData = await response.json();
        ingredientData = responseData.ingredients;
        console.log("ingredientdata is: ", ingredientData);
        if (!response.ok) {
            errorBox.textContent = responseData.error || "Something went wrong while doing api fetch for update-recipe.";
            console.log("Submitted data (for debug):", data.submitted_data);
            return;
        };
        
        console.log("backend data:", responseData);
        renderIngredients(responseData);
    }
    catch (err) {
        console.log("error is :", err.message);
        showError(err.message);
    } 
}

//to store the user ingredient data in session
function handleEditIngredient(ingredient) {
    sessionStorage.setItem(
        "editIngredient",
        JSON.stringify(ingredient)
    );

    window.location.href = "/user_ingredients/update";
}

document.addEventListener("DOMContentLoaded", () => {
    const ingSearch = document.getElementById("ingredientSearch");

    ingSearch.addEventListener("input", () => {
        const q = ingSearch.value;
        ingredientData.forEach(ing => ing.name.filter(ingSearch))
    })

    // update button clicked
    document.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-ingredient-btn");
        if (!editBtn) return;

        e.preventDefault();

        // Find parent card
        const card = editBtn.closest(".ingredient-card");
        if (!card) return;
        
        let cupWeight;
        if (card.dataset.cupWeight){
           cupWeight = parseFloat(card.dataset.cupWeight)
        }else{
            cupWeight = card.dataset.cupWeight;
        }
        // Extract dataset
        const ingredientData = {
            ingredient_id: parseInt(card.dataset.ingredientId),
            name: card.dataset.name,
            unit: card.dataset.unit,
            price: parseFloat(card.dataset.price),
            quantity: parseFloat(card.dataset.quantity),
            cup_weight: cupWeight ?? null,
            cup_unit: card.dataset.cupUnit ?? null,
            notes: ""
        };

        console.log("Editing ingredient:", ingredientData);
        handleEditIngredient(ingredientData);

    })

})