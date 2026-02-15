// Two-Factor Authentication Management
// Integrates TOTP and Email backup verification

const TwoFA = {
    // ============================================
    // CONFIGURATION - Update these values after setup
    // ============================================

    // Your TOTP secret (generated during setup, paste here after setup)
    // KEEP THIS SECRET! Anyone with this can generate valid codes
    TOTP_SECRET: '', // Will be set during setup

    // Whether 2FA is enabled (set to true after completing setup)
    ENABLED: false,

    // EmailJS Configuration for backup codes
    // Sign up at https://www.emailjs.com/ (free tier: 200 emails/month)
    EMAILJS_PUBLIC_KEY: '', // Your EmailJS public key
    EMAILJS_SERVICE_ID: '', // Your EmailJS service ID
    EMAILJS_TEMPLATE_ID: '', // Your EmailJS template ID

    // Your email address for receiving backup codes
    BACKUP_EMAIL: '', // e.g., 'your@email.com'

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    currentBackupCode: null,
    backupCodeExpiry: null,
    BACKUP_CODE_VALIDITY: 5 * 60 * 1000, // 5 minutes

    // Check if 2FA is properly configured
    isConfigured() {
        return this.ENABLED && this.TOTP_SECRET && this.TOTP_SECRET.length > 0;
    },

    // Check if email backup is configured
    isEmailConfigured() {
        return this.EMAILJS_PUBLIC_KEY &&
               this.EMAILJS_SERVICE_ID &&
               this.EMAILJS_TEMPLATE_ID &&
               this.BACKUP_EMAIL;
    },

    // ============================================
    // TOTP VERIFICATION
    // ============================================

    // Verify a TOTP code from authenticator app
    async verifyTOTP(code) {
        if (!this.TOTP_SECRET) {
            console.error('TOTP secret not configured');
            return false;
        }

        // Clean the code (remove spaces)
        code = code.replace(/\s/g, '');

        // Verify using TOTP library
        return await TOTP.verifyCode(this.TOTP_SECRET, code, 1);
    },

    // ============================================
    // EMAIL BACKUP CODES
    // ============================================

    // Generate a random 6-digit backup code
    generateBackupCode() {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const code = (100000 + (array[0] % 900000)).toString();
        this.currentBackupCode = code;
        this.backupCodeExpiry = Date.now() + this.BACKUP_CODE_VALIDITY;
        return code;
    },

    // Send backup code via email using EmailJS
    async sendBackupCode() {
        if (!this.isEmailConfigured()) {
            throw new Error('Email backup not configured. Please set up EmailJS.');
        }

        // Generate new backup code
        const code = this.generateBackupCode();

        // Initialize EmailJS if not already done
        if (typeof emailjs !== 'undefined' && !emailjs._initialized) {
            emailjs.init(this.EMAILJS_PUBLIC_KEY);
            emailjs._initialized = true;
        }

        // Prepare email parameters
        const templateParams = {
            to_email: this.BACKUP_EMAIL,
            backup_code: code,
            expiry_minutes: Math.floor(this.BACKUP_CODE_VALIDITY / 60000),
            timestamp: new Date().toLocaleString()
        };

        try {
            // Send email via EmailJS
            await emailjs.send(
                this.EMAILJS_SERVICE_ID,
                this.EMAILJS_TEMPLATE_ID,
                templateParams
            );

            return {
                success: true,
                message: `Backup code sent to ${this.maskEmail(this.BACKUP_EMAIL)}`
            };
        } catch (error) {
            console.error('Failed to send backup code:', error);
            this.currentBackupCode = null;
            this.backupCodeExpiry = null;
            throw new Error('Failed to send backup code. Please try again.');
        }
    },

    // Verify backup code
    verifyBackupCode(code) {
        // Clean the code
        code = code.replace(/\s/g, '');

        // Check if code exists and hasn't expired
        if (!this.currentBackupCode || !this.backupCodeExpiry) {
            return false;
        }

        if (Date.now() > this.backupCodeExpiry) {
            this.currentBackupCode = null;
            this.backupCodeExpiry = null;
            return false;
        }

        // Verify code
        const isValid = code === this.currentBackupCode;

        // Clear code after use (one-time use)
        if (isValid) {
            this.currentBackupCode = null;
            this.backupCodeExpiry = null;
        }

        return isValid;
    },

    // Get remaining time for backup code
    getBackupCodeRemainingTime() {
        if (!this.backupCodeExpiry) return 0;
        const remaining = this.backupCodeExpiry - Date.now();
        return Math.max(0, Math.ceil(remaining / 1000));
    },

    // ============================================
    // VERIFICATION (combined)
    // ============================================

    // Verify any code (TOTP or backup)
    async verify(code) {
        code = code.replace(/\s/g, '');

        // First try TOTP
        const totpValid = await this.verifyTOTP(code);
        if (totpValid) {
            return { valid: true, method: 'totp' };
        }

        // Then try backup code
        const backupValid = this.verifyBackupCode(code);
        if (backupValid) {
            return { valid: true, method: 'backup' };
        }

        return { valid: false, method: null };
    },

    // ============================================
    // SETUP HELPERS
    // ============================================

    // Generate new TOTP secret for setup
    generateNewSecret() {
        return TOTP.generateSecret();
    },

    // Get QR code URL for setup
    getSetupQRCode(secret, accountName = 'admin') {
        return TOTP.getQRCodeUrl(secret, accountName, 'JevanGoldsmith Admin');
    },

    // Get remaining seconds in TOTP period
    getRemainingSeconds() {
        return TOTP.getRemainingSeconds();
    },

    // ============================================
    // UTILITIES
    // ============================================

    // Mask email for display (j***@email.com)
    maskEmail(email) {
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 2) {
            return `${localPart[0]}***@${domain}`;
        }
        return `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 5))}@${domain}`;
    }
};

// Export for use in other files
window.TwoFA = TwoFA;
