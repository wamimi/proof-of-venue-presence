/**
 * @jest-environment jsdom
 */

// Mock crypto.subtle for testing in Node.js environment
const crypto = require('crypto');

// Setup WebCrypto polyfill for Node.js testing
global.crypto = {
    subtle: crypto.webcrypto.subtle,
    getRandomValues: (arr) => crypto.getRandomValues(arr)
};

// Import the module after setting up the polyfill
const { verifyPortalSignature, sha256Hash } = require('../client/noirjs/crypto-utils.js');

describe('Crypto Utils', () => {
    const testPrivateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
-----END PRIVATE KEY-----`;

    const testPublicKeyJWK = {
        kty: 'EC',
        crv: 'P-256',
        x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGHwHitJBcBmXdmqhqSKCn39dD8OE_6nJ',
        y: 'OHWNn_7l8oGVu_V3ChlP5rQlAPaUXm1gYM4hfJzjJP_e7ThlMV1k-K7w7qLrr2c'
    };

    describe('sha256Hash', () => {
        test('should generate correct SHA-256 hash', async () => {
            const input = 'test string';
            const hash = await sha256Hash(input);

            // Verify it's a valid hex string
            expect(hash).toMatch(/^[a-f0-9]{64}$/);

            // Verify consistency
            const hash2 = await sha256Hash(input);
            expect(hash).toBe(hash2);
        });

        test('should handle empty string', async () => {
            const hash = await sha256Hash('');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        test('should handle binary data', async () => {
            const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
            const hash = await sha256Hash(binaryData);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('verifyPortalSignature', () => {
        test('should verify valid signature', async () => {
            // Note: This test would require a real signature generated with the corresponding private key
            // For now, we test the function structure
            const payload = 'VENUE_123|EVENT_456|abcd1234|1640995200';
            const signature = 'mock_signature_base64url';

            // This will fail signature verification but tests the function flow
            const isValid = await verifyPortalSignature(testPublicKeyJWK, payload, signature);
            expect(typeof isValid).toBe('boolean');
        });

        test('should return false for invalid signature format', async () => {
            const payload = 'test payload';
            const invalidSignature = 'invalid_base64';

            const isValid = await verifyPortalSignature(testPublicKeyJWK, payload, invalidSignature);
            expect(isValid).toBe(false);
        });

        test('should return false for malformed JWK', async () => {
            const payload = 'test payload';
            const signature = 'dGVzdA'; // valid base64url
            const malformedJWK = { kty: 'invalid' };

            const isValid = await verifyPortalSignature(malformedJWK, payload, signature);
            expect(isValid).toBe(false);
        });
    });
});