/**
 * Dashboard Profile API - Mock Implementation
 * Uses localStorage-based auth system instead of PHP backend
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile();
});

async function fetchUserProfile() {
    // Check authentication first
    if (!window.Auth || !window.Auth.isAuthenticated()) {
        window.location.href = ".##/login";
        return;
    }

    const user = window.Auth.getCurrentUser();
    if (!user) {
        window.location.href = ".##/login";
        return;
    }

    try {
        // Update UI Elements
        const displayName = document.getElementById('display-name');
        if (displayName) displayName.textContent = user.username;

        const displayWallet = document.getElementById('display-wallet');
        if (displayWallet && user.wallet) displayWallet.textContent = user.wallet;

        const bigAvatar = document.getElementById('big-avatar');
        if (bigAvatar) bigAvatar.textContent = user.username.charAt(0).toUpperCase();

        // Fill Form Inputs
        const inputUsername = document.getElementById('input-username');
        if (inputUsername) inputUsername.value = user.username;

        const inputEmail = document.getElementById('input-email');
        if (inputEmail) inputEmail.value = user.email;

        // Calculate account age
        function getDaysActive(dateStr) {
            if (!dateStr) return "N/A";
            const joined = new Date(dateStr);
            const now = new Date();
            const diff = now - joined;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (days === 0) return "Joined today";
            if (days === 1) return "1 day active";
            return `${days} days active`;
        }

        const accAge = document.getElementById('acc-age');
        if (accAge && user.date_created) {
            accAge.textContent = getDaysActive(user.date_created);
        }

    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

async function updateProfile() {
    const btn = document.querySelector('.btn-save');
    const usernameInput = document.getElementById('input-username');
    const emailInput = document.getElementById('input-email');

    if (!usernameInput || !emailInput) return;

    const username = usernameInput.value;
    const email = emailInput.value;

    btn.textContent = "Updating...";
    btn.disabled = true;

    try {
        // Use mock auth updateProfile
        if (window.Auth) {
            const result = await window.Auth.updateProfile({ username, email });
            if (result.success) {
                const displayName = document.getElementById('display-name');
                if (displayName) displayName.textContent = username;
                const bigAvatar = document.getElementById('big-avatar');
                if (bigAvatar) bigAvatar.textContent = username.charAt(0).toUpperCase();
                showToast("Profile updated successfully!");
            } else {
                showToast(result.message, "error");
            }
        } else {
            showToast("Auth system not available", "error");
        }
    } catch (error) {
        showToast("Update failed", "error");
    } finally {
        btn.textContent = "Update Profile";
        btn.disabled = false;
    }
}

function showToast(message, type = "success") {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: type === "success" ? "linear-gradient(to right, #f5a623, #d4891a)" : "#f87171",
            color: "#07060a",
            fontWeight: "600",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)"
        }
    }).showToast();
}