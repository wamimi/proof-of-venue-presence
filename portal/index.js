const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');


const { generateKeyPair, signPayload, exportPublicKeyJWK } = require('./crypto');
const { initializeDB, insertNonce, markNonceUsed, isNonceValid } = require('./db');

const app = express();
const PORT = process.env.PORTAL_PORT || 3002;

// Environment configuration
const VENUE_ID = process.env.VENUE_ID || 'VENUE_67890';
const EVENT_ID = process.env.EVENT_ID || 'EVENT_20250921';
const KEY_PATH = process.env.PORTAL_KEY_PATH || path.join(__dirname, 'keys', 'venue-private-key.pem');
const ZKVERIFY_API_KEY = process.env.ZKVERIFY_API_KEY;
const ZKVERIFY_ENDPOINT = process.env.ZKVERIFY_ENDPOINT || 'https://api.zkverify.io/v1/verify';

// Middleware
app.use(cors());
app.use(express.json());

// IP whitelist for nonce issuance (local network only)
const isLocalIP = (ip) => {
    const cleanIP = ip.replace(/^::ffff:/, ''); // Remove IPv6 prefix
    return (
        cleanIP === '127.0.0.1' ||
        cleanIP === '::1' ||
        cleanIP.startsWith('192.168.') ||
        cleanIP.startsWith('10.') ||
        (cleanIP.startsWith('172.') &&
         parseInt(cleanIP.split('.')[1]) >= 16 &&
         parseInt(cleanIP.split('.')[1]) <= 31)
    );
};

// Initialize database and crypto keys on startup
let db;
let venuePrivateKey;
let venuePublicKeyJWK;

async function initializePortal() {
    try {
        // Initialize database
        db = await initializeDB();
        console.log('✅ Database initialized');

        // Load or generate venue keys
        if (fs.existsSync(KEY_PATH)) {
            venuePrivateKey = fs.readFileSync(KEY_PATH, 'utf8');
            console.log('✅ Loaded existing venue private key');
        } else {
            const keyPair = await generateKeyPair();
            venuePrivateKey = keyPair.privateKey;

            // Ensure directory exists
            fs.mkdirSync(path.dirname(KEY_PATH), { recursive: true });
            fs.writeFileSync(KEY_PATH, venuePrivateKey);
            console.log('✅ Generated new venue private key');
        }

        // Export public key in JWK format for client verification
        venuePublicKeyJWK = await exportPublicKeyJWK(venuePrivateKey);
        console.log('✅ Exported venue public key JWK');

    } catch (error) {
        console.error('❌ Failed to initialize portal:', error);
        process.exit(1);
    }
}

// POST /api/issue-nonce - Issue signed nonce for captive portal
app.post('/api/issue-nonce', async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    console.log(`📡 Nonce request from IP: ${clientIP}`);

    // Security: Only allow local network IPs
    if (!isLocalIP(clientIP)) {
        console.warn(`🚫 Rejected non-local IP: ${clientIP}`);
        return res.status(403).json({
            error: 'Access denied',
            message: 'Nonce issuance only available to local network clients'
        });
    }

    try {
        // Generate cryptographically secure nonce (32 bytes = 256 bits)
        const nonce = crypto.randomBytes(32).toString('hex');
        const ts = Math.floor(Date.now() / 1000); // Unix timestamp

        // Create canonical payload for signing
        const payload = `${VENUE_ID}|${EVENT_ID}|${nonce}|${ts}`;

        // Sign payload with ECDSA P-256
        const signature = await signPayload(venuePrivateKey, payload);

        // Store nonce in database
        await insertNonce(db, nonce, clientIP, ts);

        console.log(`✅ Issued nonce ${nonce.substring(0, 8)}... to ${clientIP}`);

        res.json({
            venue_id: VENUE_ID,
            event_id: EVENT_ID,
            nonce: nonce,
            ts: ts,
            signature: signature,
            venue_pubkey_jwk: venuePublicKeyJWK
        });

    } catch (error) {
        console.error('❌ Error issuing nonce:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to issue nonce'
        });
    }
});

// POST /api/submit-proof - Accept and relay proof to zkVerify
app.post('/api/submit-proof', async (req, res) => {
    console.log('📡 Received proof submission');

    try {
        const { proof_hex, public_inputs_hex, vk_hex, portal_nonce } = req.body;

        // Validate required fields
        if (!proof_hex || !public_inputs_hex || !vk_hex || !portal_nonce) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['proof_hex', 'public_inputs_hex', 'vk_hex', 'portal_nonce']
            });
        }

        // Verify nonce was issued and not yet used
        const isValid = await isNonceValid(db, portal_nonce);
        if (!isValid) {
            return res.status(400).json({
                error: 'Invalid nonce',
                message: 'Nonce was not issued or has already been used'
            });
        }

        // Mark nonce as used atomically
        await markNonceUsed(db, portal_nonce);
        console.log(`✅ Marked nonce ${portal_nonce.substring(0, 8)}... as used`);

        // Forward to zkVerify if API key is configured
        if (ZKVERIFY_API_KEY && ZKVERIFY_ENDPOINT) {
            try {
                const zkVerifyPayload = {
                    scheme: 'ultrahonk', // Match your circuit compilation
                    vk: vk_hex,
                    proof: proof_hex,
                    public_inputs: public_inputs_hex
                };

                const response = await fetch(ZKVERIFY_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ZKVERIFY_API_KEY}`
                    },
                    body: JSON.stringify(zkVerifyPayload)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Successfully submitted to zkVerify');

                    res.json({
                        success: true,
                        zkverify_job_id: result.job_id || result.id,
                        zkverify_status: result.status,
                        message: 'Proof submitted to zkVerify successfully'
                    });
                } else {
                    throw new Error(`zkVerify API error: ${response.status}`);
                }

            } catch (zkError) {
                console.error('❌ zkVerify submission failed:', zkError);

                // Still return success for proof acceptance, but note relay failure
                res.json({
                    success: true,
                    warning: 'Proof accepted but zkVerify submission failed',
                    error: zkError.message
                });
            }
        } else {
            // No zkVerify configuration - just accept the proof
            console.log('⚠️ No zkVerify configuration - proof accepted locally only');
            res.json({
                success: true,
                message: 'Proof accepted (zkVerify not configured)'
            });
        }

    } catch (error) {
        console.error('❌ Error processing proof submission:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        venue_id: VENUE_ID,
        event_id: EVENT_ID,
        zkverify_configured: !!(ZKVERIFY_API_KEY && ZKVERIFY_ENDPOINT),
        timestamp: new Date().toISOString()
    });
});

// Start server
initializePortal().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Portal server running on http://localhost:${PORT}`);
        console.log(`🏢 Venue: ${VENUE_ID} | Event: ${EVENT_ID}`);
        console.log(`🔧 Endpoints:`);
        console.log(`   POST /api/issue-nonce - Issue portal nonce`);
        console.log(`   POST /api/submit-proof - Submit ZK proof`);
        console.log(`   GET  /api/health - Health check`);
        console.log(`🔐 zkVerify: ${ZKVERIFY_API_KEY ? 'Configured' : 'Not configured'}`);
    });
});

module.exports = app;