const token = localStorage.getItem("access_token");
const ingredientId = window.ingredientId;

if (token) {
    const role = getUserRole(token);
    if (role === 'admin') {
        document.querySelector('.admin-options').style.display = 'inline-flex';
        loadIngredientDetails();
    } else {
        document.getElementById("error").textContent = "Admin privileges required.";
        setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
    }
} else {
    document.getElementById("error").textContent = "Please log in to edit ingredient.";
    setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
}

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

async function loadIngredientDetails() {
    try {
        const res = await fetch(`/ingredients/api/ingredient/${ingredientId}`, {
        headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) {
        throw new Error("Failed to load ingredient details");
        }
        const data = await res.json();
        const details = data.details;
        document.getElementById("ingredientName").value = details.name || '';
        document.getElementById("referenceQuantity").value = details.reference_quantity || '1';
        document.getElementById("referenceUnit").value = details.base_unit || '';
        document.getElementById("defaultPrice").value = parseFloat(details.default_price || 0).toFixed(2);
        document.getElementById("cupWeight").value = (details.cup_weight && Number(details.cup_weight) !== 0) ? Number(details.cup_weight).toString() : '';
        document.getElementById("cupUnit").value = details.cup_unit || '';
        document.getElementById("notes").value = details.notes || '';
    } catch (err) {
        document.getElementById("error").textContent = err.message;
    }
}

  