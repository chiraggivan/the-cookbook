import{ isTokenValid, getUserFromToken, showAlert } from "../../core/utils.js";

const token = localStorage.getItem("access_token");

console.log("entered js.... Beware!!!!!!")
// validate token
if (!isTokenValid(token)) {
    setTimeout(() => { window.location.href = "/auth/login"; }, 10);
}

// get user details from toke
const data = getUserFromToken(token);
const userId = parseInt(data.user_id);
const role = data.role;
let foodPlanId;
console.log("user id: ", userId, " and role is : ", role );


// Initialize page functionality on load
document.addEventListener("DOMContentLoaded", async function () {
  const newPlanBtn = document.getElementById("plan-btn");
  const weekOne = document.getElementById("week-1");
  const errorBox = document.getElementById("error");
  try{
    const response = await fetch("/food_plans/api/check-user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log("returned data :", data);
    if (!response.ok) {
      errorBox.textContent = data.error || "Something went wrong while fetch new-recipe.";
      // console.log("Submitted data (for debug):", data.submitted_data);
      return;
    }

    if(data.userExist){
      newPlanBtn.style.display = 'none';
      weekOne.style.display = 'flex';
      foodPlanId = data.plan_id;
    } else{
      newPlanBtn.style.display = 'flex';
      weekOne.style.display = 'none';
    } 
  } catch (err){
      errorBox.textContent = err.message;
  }

  // On Button click, create a new food_plan in food_plans table and store the food_plan_id in a variable
  newPlanBtn.addEventListener("click", async () => {
    try{
      const response = await fetch(`/food_plans/api/`,{
        method:"GET",
        headers:{
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json();
      if (!response.ok) {
        errorBox.textContent = data.error || "Something went wrong while creating new food plan.";
        // console.log("Submitted data (for debug):", data.submitted_data);
        return;
      }
      console.log(data);
      foodPlanId = data.plan_id;
      console.log(data.plan_id);
      // Display success message and redirect
      showAlert(data.message || "Food Plan created successfully!");//console.log("submitted data: ", data)
      //errorBox.textContent = data.message || "Recipe created successfully!";
      setTimeout(() => { 
        newPlanBtn.style.display = 'none';
        weekOne.style.display = 'flex';
        }, 1500);
    }catch (err){
      errorBox.textContent = err.message;
    }
  })

})
