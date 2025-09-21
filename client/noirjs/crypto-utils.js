// WebCrypto utilities for signature verification and hashing

// Import JWK public key and verify ECDSA P-256 signature
export async function verifyPortalSignature(publicKeyJWK, payload, signatureB64url) {
    try {
        // Import JWK public key
        const publicKey = await crypto.subtle.importKey(
            'jwk',
            publicKeyJWK,
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            false,
            ['verify']
        );

        // Convert payload to ArrayBuffer
        const payloadBuffer = new TextEncoder().encode(payload);

        // Convert base64url signature to ArrayBuffer
        const signatureBuffer = base64urlToArrayBuffer(signatureB64url);

        // Verify signature
        const isValid = await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: 'SHA-256'
            },
            publicKey,
            signatureBuffer,
            payloadBuffer
        );

        return isValid;

    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// SHA-256 hash using WebCrypto
export async function sha256Hash(input) {
    const inputBuffer = typeof input === 'string'
        ? new TextEncoder().encode(input)
        : input;

    const hashBuffer = await crypto.subtle.digest('SHA-256', inputBuffer);
    return arrayBufferToHex(hashBuffer);
}

// Convert base64url to ArrayBuffer
function base64urlToArrayBuffer(base64url) {
    // Add padding if needed
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const paddedBase64 = base64 + '='.repeat(padding ? 4 - padding : 0);

    // Convert to binary string then to ArrayBuffer
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

// Convert ArrayBuffer to hex string
function arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Convert hex string to ArrayBuffer
export function hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
}