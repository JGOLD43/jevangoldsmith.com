// Firebase configuration for jevangoldsmith.com admin
const firebaseConfig = {
    apiKey: "AIzaSyCxNPbwRsp1E_p82b1f1kK-wppAro_GZdg",
    authDomain: "jevan-goldsmith-website.firebaseapp.com",
    projectId: "jevan-goldsmith-website",
    storageBucket: "jevan-goldsmith-website.firebasestorage.app",
    messagingSenderId: "452641263863",
    appId: "1:452641263863:web:4d2753f325248f948ec3f2"
};

// Admin email (single-user admin panel)
const ADMIN_EMAIL = 'jjgoldsmith43@gmail.com';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export auth and firestore references
const auth = firebase.auth();
const db = firebase.firestore();
