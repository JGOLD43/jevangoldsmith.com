const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// Placeholder API endpoint - will be expanded in Phase 3+
exports.api = onRequest((req, res) => {
    res.json({ status: "ok" });
});
