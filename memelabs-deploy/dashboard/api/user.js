/**
 * Dashboard User API - Mock Implementation
 * Uses localStorage-based auth system instead of PHP backend
 */

document.addEventListener("DOMContentLoaded", function () {
    // Wait for Auth to be available
    function initUserUI() {
        const top_bar_username = document.querySelector("#top_bar_username");
        const sb_bar_username = document.querySelector("#sb-username");
        const sb_bar_wallet = document.querySelector("#sb-wallet");
        const avatar = document.querySelector("#sb-avatar");

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

        // Update UI with user data
        if (top_bar_username) {
            top_bar_username.textContent = user.username;
            top_bar_username.style.display = 'inline';
        }
        if (sb_bar_username) sb_bar_username.textContent = user.username;
        if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
        if (sb_bar_wallet && user.wallet) {
            const wallet_view = user.wallet.substr(0, 6) + '...' + user.wallet.slice(-4);
            sb_bar_wallet.textContent = wallet_view;
        } else if (sb_bar_wallet && user.email) {
            sb_bar_wallet.textContent = user.email.substr(0, 5) + '...' + user.email.slice(-7);
        }
    }

    // Initialize immediately
    initUserUI();

    // Refresh periodically in case user data changes in another tab
    setInterval(initUserUI, 5 * 60 * 1000);

    // Listen for storage changes (login/logout in another tab)
    window.addEventListener('storage', (e) => {
        if (e.key === 'memelabs_auth' || e.key === 'memelabs_user') {
            initUserUI();
        }
    });
});

// Mock logout function - replaces PHP backend call
function logout() {
    if (window.Auth) {
        window.Auth.logout().then(() => {
            Toastify({
                text: "Logging Out...",
                duration: 1000,
                gravity: "top",
                position: "right",
                style: { background: "#f5a623", color: "black" }
            }).showToast();
            setTimeout(() => { window.location.href = '.##/login'; }, 500);
        });
    } else {
        // Fallback if Auth not loaded
        localStorage.removeItem('memelabs_auth');
        localStorage.removeItem('memelabs_user');
        window.location.href = '.##/login';
    }
}

// Make logout globally available
window.logout = logout;