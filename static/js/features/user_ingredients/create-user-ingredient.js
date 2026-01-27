import { isTokenValid } from "../../core/utils.js";


const token = localStorage.getItem("access_token");//console.log(token)
const decoded = parseJwt(token); // console.log("decoded : ",decoded);
const loggedInUserId = parseInt(decoded ? decoded.sub : null); //console.log("user _id: ",loggedInUserId)

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
console.log("logged in user is: ",loggedInUserId);

document.addEventListener("DOMContentLoaded", () => {

    // making sure to remove cup error message on input of cup weight
    document.getElementById("cup_weight").addEventListener("input", ()=> {
        document.getElementById("cupError").classList.add("d-none");
    })

    // making sure to remove cup error message on input of cup unit
    document.getElementById("cup_unit").addEventListener("input", ()=> {
        document.getElementById("cupError").classList.add("d-none");
    })

    // block invalid keys in number input field
    const numberValue = document.querySelectorAll(".no-invalid-number");
    numberValue.forEach(input => {
        input.addEventListener("keydown", (e) =>{
            const blockedKeys = ["+", "-", "e", "E", "ArrowUp", "ArrowDown"];
            if(blockedKeys.includes(e.key)){
                e.preventDefault();
            }
        })
        // safety
        input.addEventListener("input", () =>{
            if(input.value < 0){
                input.value = "";
            }
        })
    })

    document.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();

        let i_cup_weight;
        let i_cup_unit;
        
        if((document.getElementById("cup_weight").value && !document.getElementById("cup_unit").value) ||
            (!document.getElementById("cup_weight").value && document.getElementById("cup_unit").value)){
                document.getElementById("cupError").textContent = " Both weight and unit should be provided or keep both empty.";
                document.getElementById("cupError").classList.remove("d-none");
                return;
            }


        if(document.getElementById("cup_weight").value){
            i_cup_weight = document.getElementById("cup_weight").value;
            i_cup_unit = document.getElementById("cup_unit").value
        } else {
            i_cup_weight = null;
            i_cup_unit = null;
        }

        // Read inputs
        const data = {
            name: document.getElementById("ingredient_name").value,
            price: parseFloat(document.getElementById("price").value),
            quantity: parseFloat(document.getElementById("quantity").value),
            unit: document.getElementById("unit").value,
            cup_weight: parseFloat(i_cup_weight),
            cup_unit: i_cup_unit,
            notes: ""
        };

        console.log("sent data is :", data);
        // Send JSON to backend
        fetch("/api/ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
    });


})
