// Authentication System for Essay CMS
// Password is hashed using bcrypt for security

// IMPORTANT: Replace this hash with your own using admin/tools/generate-hash.html
// This is a placeholder hash for the password "REPLACE_ME_WITH_REAL_PASSWORD"
const ADMIN_PASSWORD_HASH = '$2a$10$fK8kVQmh3yZ9c.jP8n9bOuHxN9vG.3KmD7qP9nLwQ8EzZxC6V5X2K';

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Login function
async function login(password) {
    // Check if locked out
    const lockoutUntil = localStorage.getItem('lockoutUntil');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
        const remainingTime = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
        showError(`Too many failed attempts. Try again in ${remainingTime} minute(s).`);
        return false;
    }

    // Verify password using bcrypt
    try {
        const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (isValid) {
            // Generate session token
            const token = generateToken();
            sessionStorage.setItem('adminToken', token);
            sessionStorage.setItem('loginTime', Date.now().toString());

            // Reset login attempts
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lockoutUntil');

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            return true;
        } else {
            // Increment failed attempts
            let attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
            localStorage.setItem('loginAttempts', attempts.toString());

            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                // Lock out user
                const lockoutTime = Date.now() + LOCKOUT_DURATION;
                localStorage.setItem('lockoutUntil', lockoutTime.toString());
                showError(`Too many failed attempts. Locked out for 15 minutes.`);
            } else {
                const remaining = MAX_LOGIN_ATTEMPTS - attempts;
                showError(`Invalid password. ${remaining} attempt(s) remaining.`);
            }

            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
        return false;
    }
}

// Check if user is authenticated
function isAuthenticated() {
    const token = sessionStorage.getItem('adminToken');
    const loginTime = sessionStorage.getItem('loginTime');

    if (!token || !loginTime) {
        return false;
    }

    // Check if session has expired
    const sessionAge = Date.now() - parseInt(loginTime);
    if (sessionAge > SESSION_DURATION) {
        // Session expired
        logout();
        return false;
    }

    return true;
}

// Require authentication (call this on protected pages)
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
    }
}

// Logout function
function logout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

// Generate secure random token
function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Show error message (works on both login page and dashboard)
function showError(message) {
    // Try to find error element on page
    const errorElement = document.getElementById('error-message');

    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');

        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    } else {
        // Fallback to alert if no error element
        alert(message);
    }
}

// Session activity tracking (extend session on activity)
let activityTimer;

function resetActivityTimer() {
    clearTimeout(activityTimer);

    if (isAuthenticated()) {
        // Extend session by updating login time
        sessionStorage.setItem('loginTime', Date.now().toString());

        // Set timer to check again in 5 minutes
        activityTimer = setTimeout(() => {
            if (!isAuthenticated()) {
                alert('Session expired. Please login again.');
                logout();
            }
        }, 5 * 60 * 1000);
    }
}

// Track user activity to extend session
if (typeof document !== 'undefined') {
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetActivityTimer, true);
    });
}
