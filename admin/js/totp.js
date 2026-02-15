// TOTP (Time-based One-Time Password) Implementation
// Compatible with Microsoft Authenticator, Google Authenticator, etc.
// RFC 6238 compliant

const TOTP = {
    // Base32 alphabet for encoding/decoding secrets
    BASE32_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',

    // Generate a random secret key (160 bits = 20 bytes)
    generateSecret() {
        const array = new Uint8Array(20);
        crypto.getRandomValues(array);
        return this.base32Encode(array);
    },

    // Base32 encode a byte array
    base32Encode(buffer) {
        let result = '';
        let bits = 0;
        let value = 0;

        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;

            while (bits >= 5) {
                result += this.BASE32_CHARS[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }

        if (bits > 0) {
            result += this.BASE32_CHARS[(value << (5 - bits)) & 31];
        }

        return result;
    },

    // Base32 decode a string to byte array
    base32Decode(encoded) {
        encoded = encoded.replace(/\s/g, '').toUpperCase();
        const output = [];
        let bits = 0;
        let value = 0;

        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            if (char === '=') continue;

            const index = this.BASE32_CHARS.indexOf(char);
            if (index === -1) {
                throw new Error('Invalid base32 character: ' + char);
            }

            value = (value << 5) | index;
            bits += 5;

            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }

        return new Uint8Array(output);
    },

    // HMAC-SHA1 implementation using Web Crypto API
    async hmacSha1(key, message) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
        return new Uint8Array(signature);
    },

    // Generate TOTP code
    async generateCode(secret, timestamp = Date.now(), period = 30, digits = 6) {
        // Decode the base32 secret
        const key = this.base32Decode(secret);

        // Calculate time counter (number of time periods since Unix epoch)
        const counter = Math.floor(timestamp / 1000 / period);

        // Convert counter to 8-byte big-endian buffer
        const counterBuffer = new ArrayBuffer(8);
        const counterView = new DataView(counterBuffer);
        counterView.setUint32(4, counter, false); // Big-endian

        // Generate HMAC-SHA1
        const hmac = await this.hmacSha1(key, new Uint8Array(counterBuffer));

        // Dynamic truncation
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);

        // Generate OTP
        const otp = binary % Math.pow(10, digits);

        // Pad with leading zeros if necessary
        return otp.toString().padStart(digits, '0');
    },

    // Verify TOTP code (allows for time drift, checks +-1 period)
    async verifyCode(secret, code, window = 1) {
        const now = Date.now();
        const period = 30000; // 30 seconds in milliseconds

        // Check current and adjacent time windows
        for (let i = -window; i <= window; i++) {
            const timestamp = now + (i * period);
            const expectedCode = await this.generateCode(secret, timestamp);

            if (code === expectedCode) {
                return true;
            }
        }

        return false;
    },

    // Generate otpauth:// URI for authenticator apps
    // Returns the URI directly - use a client-side QR library to display it
    getOtpauthUrl(secret, accountName, issuer = 'JevanGoldsmith Admin') {
        const encodedIssuer = encodeURIComponent(issuer);
        const encodedAccount = encodeURIComponent(accountName);
        return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
    },

    // Generate QR code as data URL (client-side, no external API)
    // Requires QRCode library or returns the otpauth URL for manual entry
    getQRCodeUrl(secret, accountName, issuer = 'JevanGoldsmith Admin') {
        return this.getOtpauthUrl(secret, accountName, issuer);
    },

    // Get remaining seconds in current period
    getRemainingSeconds() {
        return 30 - (Math.floor(Date.now() / 1000) % 30);
    }
};

// Export for use in other files
window.TOTP = TOTP;
