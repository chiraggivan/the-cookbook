import { isTokenValid } from "../../core/utils.js"; 

const token = localStorage.getItem("access_token");//console.log(token)

let ingredientData;
let totalIngredients;
const infinity = true; // change ingredient search for fixed or infinity
// for infinite scroll
let ingredients = [];
let limit = 10;
let offset = 0;
let hasMore = true;
let isLoading = false;
let searchQuery = "";
let debounceTimer = null;
let activeController = null;
let scrollPagePercentage = 0.8;

// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
}

// select which way to show ingredient on screen. Traditional or infinity scroll;
if (infinity){
    getScrollIngredients();
}else{
    getIngredients();
}

const ingredientsContainer = document.getElementById('ingredients-container');
const errorBox = document.getElementById('errorBox');
const emptyState = document.getElementById('empty-state');
const noSuchIngredient = document.getElementById('no-such-ingredient');
const addIngredientBtn = document.getElementById("addIngredientBtn");
const searchBar = document.getElementById("ingredientSearch");
const heading = document.getElementById("heading");
const bottomSpinner = document.getElementById("loadingSpinner");

// Main list of user ingredients decides the top section of page
function renderIngredients(ingredients) {

    // initial page load when search is default empty
    if ( totalIngredients === 0 && searchQuery =="") {
        ingredientsContainer.innerHTML = '';                // clear loading
        heading.classList.remove("mb-4");               
        emptyState?.classList.remove('d-none');             // show empty message
        return;
    }
    // if no such ingredient found in user's ingredient list
    noSuchIngredient?.classList.add('d-none');
    if ( ingredients.length === 0 && searchQuery !="") {
        ingredientsContainer.innerHTML = '';                // clear loading              
        noSuchIngredient?.classList.remove('d-none');             // show empty message
        return;
    }  
    addIngredientBtn.classList.remove("d-none"); // done as the emptyState has a link/button to add ingredient
    
    // If total ingredients more than 5 then show search bar
    if (totalIngredients > 5) {
        searchBar.classList.remove("d-none");
    }
    emptyState?.classList.add('d-none');

    // start building ingredientContainer with html
    let html = '';

    ingredients.forEach(ingredient => {
        html += buildIngredientCard(ingredient);
    });

    ingredientsContainer.innerHTML = html;
}

function buildIngredientCard(ingredient) {
    const cupInfo = ingredient.cup_weight
        ? `, Cup weight: <span class="cup-units">
                ${ingredient.cup_weight} ${ingredient.cup_unit}
           </span>`
        : '';

    return `
    <div class="card ingredient-card mb-3"
        data-name="${escapeHtml(ingredient.name.toLowerCase())}"
        data-ingredient-id="${ingredient.ingredient_id}"
        data-unit="${ingredient.unit}"
        data-price="${ingredient.price}"
        data-quantity="${ingredient.quantity}"
        data-notes="${ingredient.notes || ''}"
        ${ingredient.cup_weight != null ? `data-cup-weight="${ingredient.cup_weight}"` : ''}
        ${ingredient.cup_unit   != null ? `data-cup-unit="${ingredient.cup_unit}"`   : ''}>

        <div class="card-body">
            <div class="row align-items-center">

                <div class="col">
                    <div class="ingredient-name">
                        ${ingredient.name}
                    </div>
                    <div class="ingredient-meta">
                        <span class="ingredient-price">£ ${ingredient.price}</span>for 
                        <span class="ingredient-units">${ingredient.quantity} ${ingredient.unit}</span>${cupInfo}
                    </div>
                </div>

                <div class="col-auto">
                    <button
                        class="btn btn-success edit-ingredient-btn"
                        data-id="${ingredient.ingredient_id}">
                        Edit
                        <i class="bi bi-pencil ms-1"></i>
                    </button>
                </div>

            </div>
        </div>
    </div>`;
}

//spinner while data is is being fetched for searched ingredient
function loadSpinner(){
    let html = `<div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading your ingredients...</p>
            </div>`;
    
    ingredientsContainer.innerHTML = html;
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
        totalIngredients = responseData.count;
        // console.log("ingredientdata is: ", ingredientData);
        // console.log("totalIngredients are: ", totalIngredients);
        if (!response.ok) {
            errorBox.textContent = responseData.error || "Something went wrong while doing api fetch for update-recipe.";
            console.log("Submitted data (for debug):", data.submitted_data);
            return;
        };
        
        // console.log("backend data:", responseData);
        ingredients.push(...ingredientData); // used for non infinity scroll search
        renderIngredients(ingredientData);
    }
    catch (err) {
        console.log("error is :", err.message);
        showError(err.message);
    } 
}

// ---------- for infinite scroll ---------------
async function getScrollIngredients(reset = false) {
    
    if (isLoading) return;
    if (!hasMore && !reset) return;
    // console.log("isLoading : ", isLoading, " hasMore :", hasMore, " offset is : ", offset, " reset :", reset);
    // Abort previous request on reset (new search)
    if (reset && activeController) {
        activeController.abort();
    }

    isLoading = true;

    if (!reset && offset > 0) {
        bottomSpinner.classList.remove("d-none");
        await sleep(1000);                          //just for testing to show how spinner will look for 1 second at the bottom 
    }

    // aborting the fetch result due to another fetch
    activeController = new AbortController();
    const signal = activeController.signal
    
    if (reset) {
        offset = 0;
        ingredients = [];
        hasMore = true;
    }

    // build the url
    const url = new URL("/user_ingredients/api/user_ingredients", window.location.origin);
    url.searchParams.set("limit", limit);
    url.searchParams.set("offset", offset);

    if (searchQuery) {
        url.searchParams.set("q", searchQuery);
    }                                                       //console.log("url :", url);

    // fetch data based on url
    try {
        
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` },
            signal
        });
        const data = await response.json();
        
        
        ingredients.push(...data.data);
        
        // get the count of user ingredients on load AND dont update it on search
        if(searchQuery == ''){
            totalIngredients = ingredients.length;
        }
        
        if(offset > 0){
             data.data.forEach(item => {
                ingredientsContainer.innerHTML += buildIngredientCard(item);                
             })
        }else{
            renderIngredients(ingredients);
        }
        
        offset += limit;
        hasMore = data.hasMore;

    } catch (err) {
        console.error(err);
        showError(err.message);
    } finally {
        isLoading = false;
        bottomSpinner.classList.add("d-none");
    }
}
// ----------------------------------------------

// safely for XSS attack/ html injection
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}

// SCROLL WINDOW decide when to fetch the new list at the scroll of the page
// console.log("scroll height :",document.documentElement.scrollHeight);
// console.log("inner height :",window.innerHeight);
window.addEventListener("scroll", () => {
    if (isLoading || !hasMore) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;

    const scrolledPercentage = (scrollTop + windowHeight) / fullHeight;
    if (scrolledPercentage >= scrollPagePercentage) {
        getScrollIngredients();
    }
});

//  function to display error
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('d-none');
  ingredientsContainer.innerHTML = '';   // clear loading
}



// DOMContentLoaded 
document.addEventListener("DOMContentLoaded", () => {

    // search bar filter
    searchBar.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if(infinity){
            if(query.length >= 0){
                noSuchIngredient?.classList.add('d-none');
                loadSpinner();
                searchQuery = query;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    searchQuery = query;
                    getScrollIngredients(true); 
                }, 1000);
                
            }
        }else{
            searchQuery = query;
            const filtered = ingredients.filter(ing =>
                ing.name.toLowerCase().includes(query)
            );
        
            renderIngredients(filtered);
        }   
    });

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
        };   // console.log("Editing ingredient:", ingredientData);

        // store ingredientData in session
        sessionStorage.setItem(
            "editIngredient",
            JSON.stringify(ingredientData)
        );

        window.location.href = "/user_ingredients/update";
    });
})


// test functions-------------------------------------------------------
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve,ms));
}