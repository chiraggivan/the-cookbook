// import float from Math
 
const token = localStorage.getItem("access_token");

// Function to decode JWT and check role
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

// Show admin options if user is admin
if (token) {
  loadDishes();
} else {
  document.getElementById("error").textContent = "Not logged in. Please log in to view dishes.";
  setTimeout(() => { window.location.href = "auth/login"; }, 1000);
}

async function loadDishes() {
  try {
    const res = await fetch("/dishes/api/my_dishes", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error("Failed to load all dishes");
    }
    const data = await res.json();
    const tbody = document.querySelector("#recipeList tbody");
    tbody.innerHTML = "";
    data.forEach(r => {
        const tr = document.createElement("tr");
        //   const dish_cost = Number(r.cost);
        const dish_date = new Date(r.preparation_date).toLocaleDateString("en-GB", {
            month: "short",
            day: "2-digit"
        });
        tr.dataset.createdAt = r.created_at
        tr.dataset.recipeId = r.recipe_id
        tr.innerHTML = `
            <td>${dish_date}</td>
            <td>${r.meal}</td>
            <td><a href="/dishes/details/${r.dish_id}" class="recipe-link">${r.recipe_name}</a></td>
            <td>${r.portion_size}</td>
            <td>${r.total_cost}</td>
            <td>${r.comment}</td>
            <td>DELETE</td>
        `;
        tbody.appendChild(tr);
    });
  } catch (err) {
    document.getElementById("error").textContent = err.message;
  }
}
 