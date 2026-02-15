// Two-Factor Authentication Management
// Stores config in Firestore instead of source code

const TwoFA = {
    // Runtime state (loaded from Firestore)
    _config: null,
    _loaded: false,

    currentBackupCode: null,
    backupCodeExpiry: null,
    BACKUP_CODE_VALIDITY: 5 * 60 * 1000, // 5 minutes

    // Load 2FA config from Firestore
    async loadConfig() {
        if (this._loaded) return this._config;

        try {
            const doc = await db.collection('admin').doc('twofa').get();
            if (doc.exists) {
                this._config = doc.data();
            } else {
                this._config = null;
            }
            this._loaded = true;
            return this._config;
        } catch (error) {
            console.error('Error loading 2FA config:', error);
            this._loaded = true;
            this._config = null;
            return null;
        }
    },

    // Save 2FA config to Firestore
    async saveConfig(config) {
        try {
            await db.collection('admin').doc('twofa').set(config, { merge: true });
            this._config = { ...this._config, ...config };
            return true;
        } catch (error) {
            console.error('Error saving 2FA config:', error);
            throw new Error('Failed to save 2FA configuration.');
        }
    },

    // Check if 2FA is properly configured
    async isConfigured() {
        const config = await this.loadConfig();
        return config && config.enabled && config.totpSecret && config.totpSecret.length > 0;
    },

    // Check if email backup is configured
    async isEmailConfigured() {
        const config = await this.loadConfig();
        return config &&
               config.emailjsPublicKey &&
               config.emailjsServiceId &&
               config.emailjsTemplateId &&
               config.backupEmail;
    },

    // Verify a TOTP code from authenticator app
    async verifyTOTP(code) {
        const config = await this.loadConfig();
        if (!config || !config.totpSecret) {
            console.error('TOTP secret not configured');
            return false;
        }

        code = code.replace(/\s/g, '');
        return await TOTP.verifyCode(config.totpSecret, code, 1);
    },

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
        const config = await this.loadConfig();
        if (!config || !config.emailjsPublicKey || !config.emailjsServiceId || !config.emailjsTemplateId || !config.backupEmail) {
            throw new Error('Email backup not configured.');
        }

        const code = this.generateBackupCode();

        if (typeof emailjs !== 'undefined' && !emailjs._initialized) {
            emailjs.init(config.emailjsPublicKey);
            emailjs._initialized = true;
        }

        const templateParams = {
            to_email: config.backupEmail,
            backup_code: code,
            expiry_minutes: Math.floor(this.BACKUP_CODE_VALIDITY / 60000),
            timestamp: new Date().toLocaleString()
        };

        try {
            await emailjs.send(config.emailjsServiceId, config.emailjsTemplateId, templateParams);
            return {
                success: true,
                message: `Backup code sent to ${this.maskEmail(config.backupEmail)}`
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
        code = code.replace(/\s/g, '');
        if (!this.currentBackupCode || !this.backupCodeExpiry) return false;
        if (Date.now() > this.backupCodeExpiry) {
            this.currentBackupCode = null;
            this.backupCodeExpiry = null;
            return false;
        }
        const isValid = code === this.currentBackupCode;
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

    // Verify any code (TOTP or backup)
    async verify(code) {
        code = code.replace(/\s/g, '');

        const totpValid = await this.verifyTOTP(code);
        if (totpValid) return { valid: true, method: 'totp' };

        const backupValid = this.verifyBackupCode(code);
        if (backupValid) return { valid: true, method: 'backup' };

        return { valid: false, method: null };
    },

    // Setup helpers
    generateNewSecret() {
        return TOTP.generateSecret();
    },

    getSetupQRCode(secret, accountName = 'admin') {
        return TOTP.getQRCodeUrl(secret, accountName, 'JevanGoldsmith Admin');
    },

    getRemainingSeconds() {
        return TOTP.getRemainingSeconds();
    },

    // Mask email for display
    maskEmail(email) {
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
        return `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 5))}@${domain}`;
    }
};

window.TwoFA = TwoFA;
