// Firebase Authentication for Admin Panel
// Uses Firebase Auth for server-validated authentication

// Login with Firebase Auth
async function login(password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(ADMIN_EMAIL, password);
        return userCredential.user;
    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error('Invalid password. Please try again.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please try again later.');
        } else if (error.code === 'auth/user-not-found') {
            throw new Error('Admin account not found. Please set up your account in Firebase Console.');
        } else {
            throw new Error('An error occurred during login. Please try again.');
        }
    }
}

// Check if 2FA config exists in Firestore
async function load2FAConfig() {
    try {
        const doc = await db.collection('admin').doc('twofa').get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Error loading 2FA config:', error);
        return null;
    }
}

// Require authentication (call on protected pages)
// Uses onAuthStateChanged to wait for Firebase to resolve auth state
function requireAuth() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Check if 2FA was completed for this session
        const twofaVerified = sessionStorage.getItem('twofaVerified');
        const twofaRequired = sessionStorage.getItem('twofaRequired');

        if (twofaRequired === 'true' && twofaVerified !== 'true') {
            auth.signOut();
            window.location.href = 'index.html';
        }
    });
}

// Logout
function logout() {
    sessionStorage.removeItem('twofaVerified');
    sessionStorage.removeItem('twofaRequired');
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        setTimeout(() => errorElement.classList.remove('show'), 5000);
    } else {
        alert(message);
    }
}
