// Authentication System for Essay CMS
// Uses bcrypt for password hashing (upgrade from SHA-256)

// Your password hash - REPLACE with a bcrypt hash generated via browser console:
//   1. Open admin/index.html in browser
//   2. Open DevTools console (F12)
//   3. Run: bcrypt.hash("your-password-here", 12).then(h => console.log(h))
//   4. Copy the resulting hash and paste it below
//   5. Commit and push
//
// IMPORTANT: The hash below is your OLD SHA-256 hash kept for backwards compatibility.
// Generate a bcrypt hash (starts with $2a$ or $2b$) to upgrade security.
const ADMIN_PASSWORD_HASH = '070d3c9befacc3ef929c2e612ce7bd4462fc0878e8320e70f9bf3e2d3ac1cca6';

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

    try {
        const isValid = await verifyPassword(password, ADMIN_PASSWORD_HASH);

        if (isValid) {
            // Generate session token with fingerprint
            const token = generateToken();
            const fingerprint = generateFingerprint();
            sessionStorage.setItem('adminToken', token);
            sessionStorage.setItem('adminFingerprint', fingerprint);
            sessionStorage.setItem('loginTime', Date.now().toString());

            // Reset login attempts
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lockoutUntil');

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            return true;
        } else {
            // Add artificial delay to slow brute-force attacks
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

            // Increment failed attempts
            let attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
            localStorage.setItem('loginAttempts', attempts.toString());

            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                // Exponential lockout: doubles each time max is hit
                const lockoutMultiplier = parseInt(localStorage.getItem('lockoutMultiplier') || '1');
                const lockoutTime = Date.now() + (LOCKOUT_DURATION * lockoutMultiplier);
                localStorage.setItem('lockoutUntil', lockoutTime.toString());
                localStorage.setItem('lockoutMultiplier', (lockoutMultiplier * 2).toString());
                showError(`Too many failed attempts. Locked out for ${15 * lockoutMultiplier} minutes.`);
            } else {
                showError('Invalid password. Please try again.');
            }

            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
        return false;
    }
}

// Verify password - supports bcrypt (preferred) and SHA-256 (legacy)
async function verifyPassword(password, hash) {
    // Check if hash is bcrypt format (starts with $2a$ or $2b$)
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
        // Use bcrypt verification
        if (typeof bcrypt === 'undefined') {
            console.error('bcryptjs library not loaded');
            showError('Authentication library failed to load. Please refresh.');
            return false;
        }
        return await bcrypt.compare(password, hash);
    }

    // Legacy SHA-256 fallback
    // WARNING: SHA-256 is not a password-hashing algorithm. Upgrade to bcrypt.
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Timing-safe comparison to prevent timing attacks
    if (passwordHash.length !== hash.length) return false;
    let result = 0;
    for (let i = 0; i < passwordHash.length; i++) {
        result |= passwordHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    return result === 0;
}

// Generate browser fingerprint for session binding
function generateFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset()
    ];
    return components.join('|');
}

// Verify password only (for 2FA flow - doesn't complete login)
async function verifyPasswordOnly(password) {
    // Check if locked out
    const lockoutUntil = localStorage.getItem('lockoutUntil');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
        const remainingTime = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
        if (typeof showError === 'function') {
            showError('error-message', `Too many failed attempts. Try again in ${remainingTime} minute(s).`);
        }
        return false;
    }

    try {
        const isValid = await verifyPassword(password, ADMIN_PASSWORD_HASH);

        if (isValid) {
            // Password valid - don't complete login yet, wait for 2FA
            return true;
        } else {
            // Increment failed attempts
            let attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
            localStorage.setItem('loginAttempts', attempts.toString());

            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                const lockoutTime = Date.now() + LOCKOUT_DURATION;
                localStorage.setItem('lockoutUntil', lockoutTime.toString());
                if (typeof showError === 'function') {
                    showError('error-message', `Too many failed attempts. Locked out for 15 minutes.`);
                }
            } else {
                if (typeof showError === 'function') {
                    showError('error-message', 'Invalid password. Please try again.');
                }
            }

            return false;
        }
    } catch (error) {
        console.error('Password verification error:', error);
        if (typeof showError === 'function') {
            showError('error-message', 'An error occurred. Please try again.');
        }
        return false;
    }
}

// Check if user is authenticated
function isAuthenticated() {
    const token = sessionStorage.getItem('adminToken');
    const loginTime = sessionStorage.getItem('loginTime');
    const storedFingerprint = sessionStorage.getItem('adminFingerprint');

    if (!token || !loginTime) {
        return false;
    }

    // Check if session has expired
    const sessionAge = Date.now() - parseInt(loginTime);
    if (sessionAge > SESSION_DURATION) {
        logout();
        return false;
    }

    // Verify browser fingerprint hasn't changed (session hijacking protection)
    if (storedFingerprint && storedFingerprint !== generateFingerprint()) {
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
    sessionStorage.removeItem('adminFingerprint');
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
    const errorElement = document.getElementById('error-message');

    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');

        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    } else {
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
