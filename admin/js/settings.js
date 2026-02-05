// Settings Page JavaScript
// Handles 2FA setup and other account settings

// State for 2FA setup
let setupTOTPSecret = '';
let currentSetupStep = 1;

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    // Update 2FA status display
    updateTwoFAStatus();

    // Update session info
    updateSessionInfo();
}

// Update 2FA status based on configuration
function updateTwoFAStatus() {
    const badge = document.getElementById('twofa-badge');
    const statusText = document.getElementById('twofa-status-text');
    const setupSection = document.getElementById('twofa-setup-section');
    const enabledSection = document.getElementById('twofa-enabled-section');

    if (TwoFA.isConfigured()) {
        // 2FA is enabled
        badge.textContent = 'Enabled';
        badge.className = 'status-badge enabled';
        statusText.textContent = 'Two-factor authentication is active and protecting your account.';
        setupSection.style.display = 'none';
        enabledSection.style.display = 'block';
    } else {
        // 2FA is not configured
        badge.textContent = 'Disabled';
        badge.className = 'status-badge disabled';
        statusText.textContent = 'Two-factor authentication is not configured. Set it up to secure your account.';
        setupSection.style.display = 'block';
        enabledSection.style.display = 'none';
    }
}

// Update session information display
function updateSessionInfo() {
    const loginTime = sessionStorage.getItem('loginTime');
    const startTimeEl = document.getElementById('session-start-time');
    const expireTimeEl = document.getElementById('session-expire-time');

    if (loginTime) {
        const startDate = new Date(parseInt(loginTime));
        const expireDate = new Date(parseInt(loginTime) + (4 * 60 * 60 * 1000)); // 4 hours

        startTimeEl.textContent = formatDateTime(startDate);
        expireTimeEl.textContent = formatDateTime(expireDate);
    }
}

// Format date/time for display
function formatDateTime(date) {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Generate TOTP secret for setup
function generateTOTPSecret() {
    setupTOTPSecret = TOTP.generateSecret();

    // Display the secret
    document.getElementById('generated-secret').textContent = setupTOTPSecret;
    document.getElementById('secret-generated').style.display = 'block';

    // Prepare QR code for step 2
    const qrUrl = TOTP.getQRCodeUrl(setupTOTPSecret, 'admin', 'JevanGoldsmith Admin');
    document.getElementById('setup-qr-code').src = qrUrl;
    document.getElementById('manual-secret-key').textContent = setupTOTPSecret;

    // Prepare config output for step 4
    updateConfigOutput();
}

// Update the configuration code output
function updateConfigOutput() {
    const config = `// Update these values in admin/js/twofa.js

TOTP_SECRET: '${setupTOTPSecret}',
ENABLED: true,`;
    document.getElementById('twofa-config-output').textContent = config;
}

// Navigate between setup steps
function showSetupStep(step) {
    // Hide all steps
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById('setup-step-' + i);
        if (stepEl) stepEl.style.display = 'none';
    }
    document.getElementById('setup-complete').style.display = 'none';

    // Show target step
    const targetEl = document.getElementById('setup-step-' + step);
    if (targetEl) {
        targetEl.style.display = 'block';
        currentSetupStep = step;
    }

    // Focus on code input for step 3
    if (step === 3) {
        setTimeout(() => {
            document.getElementById('setup-verify-code').focus();
        }, 100);
    }
}

// Verify the setup code
async function verifySetupCode(event) {
    event.preventDefault();

    const code = document.getElementById('setup-verify-code').value.replace(/\s/g, '');
    const resultEl = document.getElementById('setup-verify-result');

    if (code.length !== 6) {
        resultEl.className = 'verify-result error';
        resultEl.textContent = 'Please enter a 6-digit code';
        return;
    }

    // Verify the code
    const isValid = await TOTP.verifyCode(setupTOTPSecret, code, 1);

    if (isValid) {
        resultEl.className = 'verify-result success';
        resultEl.textContent = 'Code verified successfully!';

        setTimeout(() => {
            showSetupStep(4);
        }, 1000);
    } else {
        resultEl.className = 'verify-result error';
        resultEl.textContent = 'Invalid code. Make sure your authenticator is synced correctly.';
        document.getElementById('setup-verify-code').value = '';
        document.getElementById('setup-verify-code').focus();
    }
}

// Copy TOTP config to clipboard
function copyTOTPConfig() {
    const config = document.getElementById('twofa-config-output').textContent;
    copyToClipboard(config, 'Configuration copied to clipboard!');
}

// Finish 2FA setup
function finishTwoFASetup() {
    // Hide all steps
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById('setup-step-' + i);
        if (stepEl) stepEl.style.display = 'none';
    }

    // Show completion
    document.getElementById('setup-complete').style.display = 'block';
}

// Show reconfigure warning
function showReconfigureWarning() {
    if (confirm('Warning: Reconfiguring 2FA will invalidate your current authenticator setup. You will need to update your authenticator app with a new secret key.\n\nAre you sure you want to continue?')) {
        // Reset and show setup
        setupTOTPSecret = '';
        currentSetupStep = 1;
        document.getElementById('secret-generated').style.display = 'none';
        document.getElementById('setup-verify-code').value = '';
        document.getElementById('setup-verify-result').textContent = '';
        document.getElementById('setup-verify-result').className = 'verify-result';

        // Show setup section
        document.getElementById('twofa-enabled-section').style.display = 'none';
        document.getElementById('twofa-setup-section').style.display = 'block';
        showSetupStep(1);
    }
}

// Utility: Copy text to clipboard
function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
        showSettingsToast(successMessage || 'Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showSettingsToast(successMessage || 'Copied to clipboard!');
    });
}

// Show toast notification
function showSettingsToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.settings-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'settings-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Auto-format code input
document.getElementById('setup-verify-code')?.addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
});
