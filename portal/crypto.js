const crypto = require('crypto');
const { promisify } = require('util');

// Generate ECDSA P-256 key pair
async function generateKeyPair() {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair('ec', {
            namedCurve: 'prime256v1', // P-256
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        }, (err, publicKey, privateKey) => {
            if (err) reject(err);
            else resolve({ publicKey, privateKey });
        });
    });
}

// Sign payload with ECDSA P-256 SHA-256
async function signPayload(privateKeyPEM, payload) {
    const sign = crypto.createSign('SHA256');
    sign.update(payload, 'utf8');
    sign.end();

    // Sign and return DER-encoded signature as base64url
    const signature = sign.sign(privateKeyPEM);
    return signature.toString('base64url');
}

// Export public key in JWK format for WebCrypto compatibility
async function exportPublicKeyJWK(privateKeyPEM) {
    // Extract public key from private key
    const privateKeyObj = crypto.createPrivateKey(privateKeyPEM);
    const publicKeyObj = crypto.createPublicKey(privateKeyObj);

    // Export as raw coordinates for JWK
    const publicKeyDER = publicKeyObj.export({
        type: 'spki',
        format: 'der'
    });

    // Parse DER to extract x, y coordinates
    // P-256 public key in DER: last 65 bytes = 0x04 + 32-byte x + 32-byte y
    const publicKeyBytes = publicKeyDER.slice(-65);
    if (publicKeyBytes[0] !== 0x04) {
        throw new Error('Invalid uncompressed public key format');
    }

    const x = publicKeyBytes.slice(1, 33);
    const y = publicKeyBytes.slice(33, 65);

    return {
        kty: 'EC',
        crv: 'P-256',
        x: x.toString('base64url'),
        y: y.toString('base64url')
    };
}

// Verify signature (for testing)
function verifySignature(publicKeyPEM, payload, signature) {
    const verify = crypto.createVerify('SHA256');
    verify.update(payload, 'utf8');
    verify.end();

    const signatureBuffer = Buffer.from(signature, 'base64url');
    return verify.verify(publicKeyPEM, signatureBuffer);
}

module.exports = {
    generateKeyPair,
    signPayload,
    exportPublicKeyJWK,
    verifySignature
};