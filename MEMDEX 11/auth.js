/**
 * Mock Authentication System for Memelabs
 * Uses localStorage for persistence - no backend required
 */

const AUTH_STORAGE_KEY = 'memelabs_auth';
const USER_STORAGE_KEY = 'memelabs_user';

// Default mock user data
const MOCK_USER = {
  id: 'user_001',
  username: 'memelord42',
  email: 'user@memelabs.fun',
  wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb7',
  date_created: '2024-01-15T10:30:00Z',
  isLoggedIn: true
};

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  const auth = localStorage.getItem(AUTH_STORAGE_KEY);
  return auth === 'true';
}

/**
 * Get current user data
 */
function getCurrentUser() {
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Login with email/password (mock - accepts any credentials)
 */
function login(email, password, rememberMe = false) {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // In a real app, you'd validate credentials against a backend
      // For mock, accept any non-empty email/password
      if (email && password) {
        const user = { ...MOCK_USER, email };
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        resolve({ success: true, user });
      } else {
        resolve({ success: false, message: 'Please enter email and password' });
      }
    }, 500);
  });
}

/**
 * Signup with username, email, password (mock)
 */
function signup(username, email, password) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (username && email && password) {
        const user = {
          id: 'user_' + Date.now(),
          username,
          email,
          wallet: '0x' + Math.random().toString(16).slice(2, 42),
          date_created: new Date().toISOString(),
          isLoggedIn: true
        };
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        resolve({ success: true, user });
      } else {
        resolve({ success: false, message: 'Please fill in all fields' });
      }
    }, 500);
  });
}

/**
 * Logout user
 */
function logout() {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      resolve({ success: true });
    }, 300);
  });
}

/**
 * Update user profile
 */
function updateProfile(updates) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = getCurrentUser();
      if (user) {
        const updatedUser = { ...user, ...updates };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        resolve({ success: true, user: updatedUser });
      } else {
        resolve({ success: false, message: 'Not authenticated' });
      }
    }, 300);
  });
}

/**
 * Send the user to the single app entry, on the login view.
 * Uses window.top so this still works when a dashboard page is
 * rendered inside the app.html iframe.
 */
function redirectToLogin() {
  const target = (window.top && window.top !== window.self) ? window.top : window;
  target.location.href = '../app.html#/login';
}

/**
 * Require authentication - redirect to login if not authenticated
 * Call this at the top of protected pages
 */
function requireAuth() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }
  return true;
}

/**
 * Initialize user UI elements (username, wallet, avatar)
 * Call this on dashboard pages after DOM is loaded
 */
function initUserUI() {
  const user = getCurrentUser();
  if (!user) return;

  // Top bar username
  const topBarUsername = document.querySelector('#top_bar_username');
  if (topBarUsername) {
    topBarUsername.textContent = user.username;
    topBarUsername.style.display = 'inline';
  }

  // Sidebar username
  const sbUsername = document.querySelector('#sb-username');
  if (sbUsername) {
    sbUsername.textContent = user.username;
  }

  // Sidebar wallet
  const sbWallet = document.querySelector('#sb-wallet');
  if (sbWallet && user.wallet) {
    const walletView = user.wallet.slice(0, 6) + '...' + user.wallet.slice(-4);
    sbWallet.textContent = walletView;
  }

  // Sidebar avatar
  const sbAvatar = document.querySelector('#sb-avatar');
  if (sbAvatar) {
    sbAvatar.textContent = user.username.charAt(0).toUpperCase();
  }

  // Profile page specific elements
  const displayName = document.querySelector('#display-name');
  if (displayName) displayName.textContent = user.username;

  const displayWallet = document.querySelector('#display-wallet');
  if (displayWallet && user.wallet) displayWallet.textContent = user.wallet;

  const bigAvatar = document.querySelector('#big-avatar');
  if (bigAvatar) bigAvatar.textContent = user.username.charAt(0).toUpperCase();

  const inputUsername = document.querySelector('#input-username');
  if (inputUsername) inputUsername.value = user.username;

  const inputEmail = document.querySelector('#input-email');
  if (inputEmail) inputEmail.value = user.email;

  const accAge = document.querySelector('#acc-age');
  if (accAge && user.date_created) {
    const joined = new Date(user.date_created);
    const now = new Date();
    const diff = now - joined;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    accAge.textContent = days === 0 ? 'Joined today' : days === 1 ? '1 day active' : `${days} days active`;
  }
}

/**
 * Setup logout button handlers
 */
function setupLogoutButtons() {
  document.querySelectorAll('[onclick="logout()"]').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      await logout();
      const target = (window.top && window.top !== window.self) ? window.top : window;
      target.location.href = '../app.html#/login';
    };
  });
}

// Export for use in other scripts
window.Auth = {
  isAuthenticated,
  getCurrentUser,
  login,
  signup,
  logout,
  updateProfile,
  requireAuth,
  redirectToLogin,
  initUserUI,
  setupLogoutButtons
};

// Auto-initialize user UI on dashboard pages
document.addEventListener('DOMContentLoaded', () => {
  // Only run on dashboard pages (not login/signup)
  if (window.location.pathname.includes('/dashboard/')) {
    if (!Auth.requireAuth()) return;
    Auth.initUserUI();
    Auth.setupLogoutButtons();
  }
});