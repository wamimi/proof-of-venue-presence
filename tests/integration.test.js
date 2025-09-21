const request = require('supertest');
const app = require('../portal/index.js');
const { verifySignature } = require('../portal/crypto.js');

describe('Integration Tests', () => {
    describe('End-to-End Portal Flow', () => {
        test('should complete full nonce issuance and proof submission flow', async () => {
            // Step 1: Issue nonce
            const nonceResponse = await request(app)
                .post('/api/issue-nonce')
                .expect(200);

            const { venue_id, event_id, nonce, ts, signature, venue_pubkey_jwk } = nonceResponse.body;

            // Verify response structure
            expect(venue_id).toBeDefined();
            expect(event_id).toBeDefined();
            expect(nonce).toMatch(/^[a-f0-9]{64}$/);
            expect(typeof ts).toBe('number');
            expect(signature).toBeDefined();
            expect(venue_pubkey_jwk).toHaveProperty('kty', 'EC');

            // Step 2: Verify signature format
            expect(venue_pubkey_jwk).toHaveProperty('crv', 'P-256');
            expect(venue_pubkey_jwk).toHaveProperty('x');
            expect(venue_pubkey_jwk).toHaveProperty('y');

            // Step 3: Submit proof with the issued nonce
            const proofData = {
                proof_hex: '0x' + 'a'.repeat(200), // Mock proof
                public_inputs_hex: '0x' + 'b'.repeat(64), // Mock public inputs
                vk_hex: '0x' + 'c'.repeat(128), // Mock verification key
                portal_nonce: nonce
            };

            const proofResponse = await request(app)
                .post('/api/submit-proof')
                .send(proofData)
                .expect(200);

            expect(proofResponse.body).toHaveProperty('success', true);

            // Step 4: Verify nonce is now marked as used
            const secondProofResponse = await request(app)
                .post('/api/submit-proof')
                .send(proofData)
                .expect(400);

            expect(secondProofResponse.body).toHaveProperty('error', 'Invalid nonce');
        });

        test('should handle concurrent nonce requests correctly', async () => {
            // Issue multiple nonces concurrently
            const requests = Array(5).fill().map(() =>
                request(app).post('/api/issue-nonce')
            );

            const responses = await Promise.all(requests);

            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });

            // All nonces should be unique
            const nonces = responses.map(r => r.body.nonce);
            const uniqueNonces = new Set(nonces);
            expect(uniqueNonces.size).toBe(nonces.length);
        });
    });

    describe('Security Tests', () => {
        test('should enforce IP restrictions', async () => {
            // Test various non-local IPs
            const nonLocalIPs = [
                '8.8.8.8',
                '1.1.1.1',
                '203.0.113.1',
                '172.15.0.1', // Outside 172.16-31 range
                '172.32.0.1'  // Outside 172.16-31 range
            ];

            for (const ip of nonLocalIPs) {
                const response = await request(app)
                    .post('/api/issue-nonce')
                    .set('X-Forwarded-For', ip)
                    .expect(403);

                expect(response.body).toHaveProperty('error', 'Access denied');
            }
        });

        test('should allow local network IPs', async () => {
            const localIPs = [
                '127.0.0.1',
                '192.168.1.100',
                '10.0.0.1',
                '172.16.0.1',
                '172.31.255.255'
            ];

            for (const ip of localIPs) {
                const response = await request(app)
                    .post('/api/issue-nonce')
                    .set('X-Forwarded-For', ip)
                    .expect(200);

                expect(response.body).toHaveProperty('nonce');
            }
        });

        test('should validate proof submission fields', async () => {
            const testCases = [
                { name: 'missing proof_hex', data: { public_inputs_hex: '0x123', vk_hex: '0x456', portal_nonce: 'abc' } },
                { name: 'missing public_inputs_hex', data: { proof_hex: '0x123', vk_hex: '0x456', portal_nonce: 'abc' } },
                { name: 'missing vk_hex', data: { proof_hex: '0x123', public_inputs_hex: '0x456', portal_nonce: 'abc' } },
                { name: 'missing portal_nonce', data: { proof_hex: '0x123', public_inputs_hex: '0x456', vk_hex: '0x789' } },
                { name: 'empty object', data: {} }
            ];

            for (const testCase of testCases) {
                const response = await request(app)
                    .post('/api/submit-proof')
                    .send(testCase.data)
                    .expect(400);

                expect(response.body).toHaveProperty('error', 'Missing required fields');
            }
        });
    });

    describe('Database Persistence', () => {
        test('should persist nonces across requests', async () => {
            // Issue a nonce
            const nonceResponse = await request(app)
                .post('/api/issue-nonce')
                .expect(200);

            const nonce = nonceResponse.body.nonce;

            // Submit proof to mark nonce as used
            await request(app)
                .post('/api/submit-proof')
                .send({
                    proof_hex: '0x123',
                    public_inputs_hex: '0x456',
                    vk_hex: '0x789',
                    portal_nonce: nonce
                })
                .expect(200);

            // Verify nonce is still marked as used in subsequent requests
            const secondResponse = await request(app)
                .post('/api/submit-proof')
                .send({
                    proof_hex: '0xabc',
                    public_inputs_hex: '0xdef',
                    vk_hex: '0x000',
                    portal_nonce: nonce
                })
                .expect(400);

            expect(secondResponse.body).toHaveProperty('error', 'Invalid nonce');
        });
    });
});