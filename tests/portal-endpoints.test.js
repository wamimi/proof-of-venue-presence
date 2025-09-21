const request = require('supertest');
const app = require('../portal/index.js');
const path = require('path');
const fs = require('fs');

describe('Portal Endpoints', () => {
    beforeAll(async () => {
        // Clean up test database
        const testDbPath = path.join(__dirname, '../portal/test.db');
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('POST /api/issue-nonce', () => {
        test('should issue nonce for local IP', async () => {
            const response = await request(app)
                .post('/api/issue-nonce')
                .expect(200);

            expect(response.body).toHaveProperty('venue_id');
            expect(response.body).toHaveProperty('event_id');
            expect(response.body).toHaveProperty('nonce');
            expect(response.body).toHaveProperty('ts');
            expect(response.body).toHaveProperty('signature');
            expect(response.body).toHaveProperty('venue_pubkey_jwk');

            // Verify nonce is 64 hex characters (32 bytes)
            expect(response.body.nonce).toMatch(/^[a-f0-9]{64}$/);

            // Verify timestamp is recent
            const now = Math.floor(Date.now() / 1000);
            expect(response.body.ts).toBeGreaterThan(now - 10);
            expect(response.body.ts).toBeLessThan(now + 10);
        });

        test('should reject non-local IP', async () => {
            const response = await request(app)
                .post('/api/issue-nonce')
                .set('X-Forwarded-For', '8.8.8.8')
                .expect(403);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Access denied');
        });
    });

    describe('POST /api/submit-proof', () => {
        let testNonce;

        beforeEach(async () => {
            // Get a fresh nonce for each test
            const nonceResponse = await request(app)
                .post('/api/issue-nonce')
                .expect(200);
            testNonce = nonceResponse.body.nonce;
        });

        test('should accept valid proof submission', async () => {
            const proofData = {
                proof_hex: '0x1234567890abcdef',
                public_inputs_hex: '0xfedcba0987654321',
                vk_hex: '0xabcdef1234567890',
                portal_nonce: testNonce
            };

            const response = await request(app)
                .post('/api/submit-proof')
                .send(proofData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });

        test('should reject proof with used nonce', async () => {
            const proofData = {
                proof_hex: '0x1234567890abcdef',
                public_inputs_hex: '0xfedcba0987654321',
                vk_hex: '0xabcdef1234567890',
                portal_nonce: testNonce
            };

            // Submit once
            await request(app)
                .post('/api/submit-proof')
                .send(proofData)
                .expect(200);

            // Try to submit again with same nonce
            const response = await request(app)
                .post('/api/submit-proof')
                .send(proofData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid nonce');
        });

        test('should reject proof with invalid nonce', async () => {
            const proofData = {
                proof_hex: '0x1234567890abcdef',
                public_inputs_hex: '0xfedcba0987654321',
                vk_hex: '0xabcdef1234567890',
                portal_nonce: 'invalid_nonce_12345'
            };

            const response = await request(app)
                .post('/api/submit-proof')
                .send(proofData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid nonce');
        });

        test('should reject incomplete proof data', async () => {
            const incompleteProof = {
                proof_hex: '0x1234567890abcdef',
                // Missing other required fields
                portal_nonce: testNonce
            };

            const response = await request(app)
                .post('/api/submit-proof')
                .send(incompleteProof)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Missing required fields');
        });
    });

    describe('GET /api/health', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('venue_id');
            expect(response.body).toHaveProperty('event_id');
            expect(response.body).toHaveProperty('zkverify_configured');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
});