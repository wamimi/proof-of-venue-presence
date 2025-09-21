import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';

// Import crypto utilities
import { verifyPortalSignature, sha256Hash } from './crypto-utils.js';

class NoirJSProofGenerator {
    constructor() {
        this.noir = null;
        this.backend = null;
        this.circuit = null;
        this.portalEndpoint = 'http://localhost:3002';
        this.userSecret = null;

        this.initializeUserSecret();
    }

    // Initialize or load user secret from localStorage
    initializeUserSecret() {
        let secret = localStorage.getItem('wifi_proof_user_secret');
        if (!secret) {
            // Generate new user secret (32 bytes)
            const secretBytes = new Uint8Array(32);
            crypto.getRandomValues(secretBytes);
            secret = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem('wifi_proof_user_secret', secret);
            console.log('✅ Generated new user secret');
        } else {
            console.log('✅ Loaded existing user secret');
        }
        this.userSecret = secret;
    }

    // Load compiled Noir circuit
    async loadCircuit() {
        try {
            // Fetch compiled circuit artifacts
            const circuitResponse = await fetch('/target/wifiproof.json');
            if (!circuitResponse.ok) {
                throw new Error('Failed to fetch circuit artifacts. Ensure circuit is compiled.');
            }

            this.circuit = await circuitResponse.json();

            // Initialize UltraHonk backend
            this.backend = new UltraHonkBackend(this.circuit.bytecode);

            // Initialize Noir
            this.noir = new Noir(this.circuit);

            console.log('✅ NoirJS circuit loaded successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to load circuit:', error);
            throw error;
        }
    }

    // Fetch portal nonce
    async fetchPortalNonce() {
        try {
            console.log('📡 Requesting portal nonce...');

            const response = await fetch(`${this.portalEndpoint}/api/issue-nonce`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Portal nonce request failed: ${error.message || response.statusText}`);
            }

            const nonceData = await response.json();
            console.log('✅ Received portal nonce');

            return nonceData;

        } catch (error) {
            console.error('❌ Failed to fetch portal nonce:', error);
            throw error;
        }
    }

    // Verify portal signature using WebCrypto
    async verifyPortalNonce(nonceData) {
        try {
            console.log('🔐 Verifying portal signature...');

            const { venue_id, event_id, nonce, ts, signature, venue_pubkey_jwk } = nonceData;

            // Reconstruct canonical payload
            const payload = `${venue_id}|${event_id}|${nonce}|${ts}`;

            // Verify signature
            const isValid = await verifyPortalSignature(
                venue_pubkey_jwk,
                payload,
                signature
            );

            if (!isValid) {
                throw new Error('Portal signature verification failed');
            }

            console.log('✅ Portal signature verified');
            return true;

        } catch (error) {
            console.error('❌ Portal signature verification failed:', error);
            throw error;
        }
    }

    // Generate ZK proof using NoirJS
    async generateProof(timeWindowStart, timeWindowEnd) {
        try {
            console.log('⚡ Starting proof generation...');

            // 1. Load circuit if not already loaded
            if (!this.noir) {
                await this.loadCircuit();
            }

            // 2. Fetch and verify portal nonce
            const nonceData = await this.fetchPortalNonce();
            await this.verifyPortalNonce(nonceData);

            // 3. Prepare witness inputs
            const proofTimestamp = Math.floor(Date.now() / 1000);
            const connectionNonce = Math.floor(Math.random() * 1000000);

            // Hash portal data for public inputs
            const nonceHash = await sha256Hash(nonceData.nonce);
            const portalSigHash = await sha256Hash(nonceData.signature);

            // Convert hashes to Field format (hex string to number)
            const nonceHashField = '0x' + nonceHash;
            const portalSigHashField = '0x' + portalSigHash;

            const witness = {
                // Private inputs
                user_secret: this.userSecret,
                connection_nonce: connectionNonce.toString(),

                // Public inputs
                venue_id: nonceData.venue_id,
                event_id: nonceData.event_id,
                nonce_hash: nonceHashField,
                portal_sig_hash: portalSigHashField,
                time_window_start: timeWindowStart,
                time_window_end: timeWindowEnd,
                proof_timestamp: proofTimestamp
            };

            console.log('📝 Witness prepared, generating proof...');

            // 4. Generate witness and proof
            const { witness: generatedWitness } = await this.noir.execute(witness);
            console.log('✅ Witness generated successfully');

            const proof = await this.backend.generateProof(generatedWitness);
            console.log('✅ Proof generated successfully');

            // 5. Convert to hex format for submission
            const proofHex = Array.from(proof.proof, b => b.toString(16).padStart(2, '0')).join('');
            const publicInputsHex = Array.from(proof.publicInputs, b => b.toString(16).padStart(2, '0')).join('');
            const vkHex = Array.from(await this.backend.getVerificationKey(), b => b.toString(16).padStart(2, '0')).join('');

            return {
                proof_hex: proofHex,
                public_inputs_hex: publicInputsHex,
                vk_hex: vkHex,
                portal_nonce: nonceData.nonce,
                witness: witness,
                nonceData: nonceData
            };

        } catch (error) {
            console.error('❌ Proof generation failed:', error);
            throw error;
        }
    }

    // Submit proof to portal
    async submitProof(proofData) {
        try {
            console.log('📤 Submitting proof to portal...');

            const response = await fetch(`${this.portalEndpoint}/api/submit-proof`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proof_hex: proofData.proof_hex,
                    public_inputs_hex: proofData.public_inputs_hex,
                    vk_hex: proofData.vk_hex,
                    portal_nonce: proofData.portal_nonce
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Proof submission failed: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Proof submitted successfully');

            return result;

        } catch (error) {
            console.error('❌ Proof submission failed:', error);
            throw error;
        }
    }

    // Full proof generation and submission flow
    async generateAndSubmitProof(timeWindowStart, timeWindowEnd) {
        try {
            const proofData = await this.generateProof(timeWindowStart, timeWindowEnd);
            const result = await this.submitProof(proofData);

            return {
                success: true,
                proofData,
                submissionResult: result
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for use in HTML
window.NoirJSProofGenerator = NoirJSProofGenerator;

export default NoirJSProofGenerator;