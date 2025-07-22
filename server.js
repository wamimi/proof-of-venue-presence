const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');

// Set timezone to East African Time (GMT+3)
process.env.TZ = 'Africa/Nairobi';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.', { 
    exclude: ['node_modules', '.git', 'target']
}));

// Store generated proofs in memory (in production, use a database)
const storedProofs = new Map();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate proof endpoint
app.post('/api/generate-proof', async (req, res) => {
    console.log('📡 Received proof generation request');
    const targetDir = path.join(__dirname, 'target');
    const proofOutputDir = path.join(targetDir, 'proof_artifacts');
    const vkOutputDir = path.join(targetDir, 'vk_artifacts');

    try {
        // 1. Clean up and create directories for a fresh run
        await fs.remove(targetDir);
        await fs.ensureDir(targetDir);
        await fs.ensureDir(proofOutputDir);
        await fs.ensureDir(vkOutputDir);
        console.log('✅ Cleaned and prepared target directories');

        const {
            userSecret,
            connectionNonce,
            venueId,
            networkSsidHash,
            timeWindowStart,
            timeWindowEnd,
            proofTimestamp
        } = req.body;

        // Create separate Prover.toml for private inputs and Verifier.toml for public inputs
        const privateProverToml = `
user_secret = "${userSecret}"
connection_nonce = "${connectionNonce}"
venue_id = "${venueId}"
network_ssid_hash = "${networkSsidHash}"
time_window_start = "${timeWindowStart}"
time_window_end = "${timeWindowEnd}"
proof_timestamp = "${proofTimestamp}"
`.trim();

        const publicVerifierToml = `
venue_id = "${venueId}"
network_ssid_hash = "${networkSsidHash}"
time_window_start = "${timeWindowStart}"
time_window_end = "${timeWindowEnd}"
proof_timestamp = "${proofTimestamp}"
`.trim();

        await fs.writeFile('Prover.toml', privateProverToml);
        console.log('✅ Generated Prover.toml');

        // Step 2: Compile and Execute Noir circuit
        await execNoirCommand('nargo compile');
        const executeResult = await execNoirCommand('nargo execute');

        // Step 3: Generate cryptographic proof and VK with Barretenberg
        await execNoirCommand(`bb prove -b ${targetDir}/wifiproof.json -w ${targetDir}/wifiproof.gz -o ${proofOutputDir}`);
        await execNoirCommand(`bb write_vk -b ${targetDir}/wifiproof.json -o ${vkOutputDir}`);

        console.log('✅ Barretenberg proof and VK generation commands executed');
        
        // 4. Read all three essential artifacts: proof, vk, and the generated public_inputs
        const proofPath = path.join(proofOutputDir, 'proof');
        const publicInputsPath = path.join(proofOutputDir, 'public_inputs');
        const vkPath = path.join(vkOutputDir, 'vk');

        if (!await fs.pathExists(proofPath) || !await fs.pathExists(vkPath) || !await fs.pathExists(publicInputsPath)) {
            throw new Error('Barretenberg failed to generate all required proof artifacts (proof, vk, public_inputs).');
        }

        const proofData = await fs.readFile(proofPath, 'hex');
        const vkData = await fs.readFile(vkPath, 'hex');
        const publicInputsData = await fs.readFile(publicInputsPath, 'hex'); // Read as hex
        console.log('✅ Read proof, VK, and public_inputs files successfully');
        
        // Parse execution output to get the public outputs from the circuit
        const publicOutputs = parseExecutionOutput(executeResult);

        // Generate response
        const proofHash = generateProofHash(req.body);
        const nullifier = generateNullifier(userSecret, venueId, timeWindowStart);
        const userCommitment = generateUserCommitment(userSecret, venueId, proofTimestamp, connectionNonce);

        const response = {
            success: true,
            proofHash,
            nullifier,
            userCommitment,
            circuitOutputs: publicOutputs || {
                venue_id: venueId,
                network_hash: networkSsidHash,
                proof_timestamp: proofTimestamp
            },
            proverToml: publicVerifierToml,
            executionOutput: executeResult,
            compileOutput: 'Compilation successful',
            proofGenerated: !!proofData,
            proofData: proofData ? `0x${proofData.substring(0, 100)}...` : 'Proof generation failed',
            publicInputs: publicInputsData ? `0x${publicInputsData.substring(0,100)}...` : 'No public inputs generated',
            verificationKey: vkData ? `VK generated (${vkData.length/2} bytes)` : 'VK generation failed',
            timestamp: new Date().toISOString()
        };

        // Store all three proof artifacts for verification
        storedProofs.set(proofHash, {
            proofData,
            vkData,
            publicInputsData, // Store the hex string of the generated public inputs
            timestamp: response.timestamp,
        });
        console.log(`✅ Stored proof data for hash: ${proofHash}`);
        
        res.json(response);

    } catch (error) {
        console.error('❌ Error generating proof:', error);
        res.status(500).json({
            success: false,
            error: `Proof generation failed: ${error.message}`,
            details: error.stdout ? `${error.stdout}\n${error.stderr}` : 'No details available.'
        });
    }
});

// Verify proof endpoint
app.post('/api/verify-proof', async (req, res) => {
    console.log('📡 Received proof verification request');
    
    try {
        const { proofHash } = req.body;
        
        if (!proofHash) {
            return res.status(400).json({
                success: false,
                error: 'Proof hash is required'
            });
        }

        const storedProof = storedProofs.get(proofHash);
        
        if (!storedProof) {
            return res.json({
                success: false,
                verified: false,
                error: 'Proof not found. This proof hash does not correspond to any generated proof.',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`🔍 Verifying stored proof: ${proofHash}`);

        // Write the stored proof files temporarily for verification
        const tempDir = path.join(__dirname, 'temp_verification');
        await fs.ensureDir(tempDir);
        const tempProofFile = path.join(tempDir, 'proof');
        const tempVkFile = path.join(tempDir, 'vk');
        const tempPublicInputsFile = path.join(tempDir, 'public_inputs');

        try {
            await fs.writeFile(tempProofFile, Buffer.from(storedProof.proofData, 'hex'));
            await fs.writeFile(tempVkFile, Buffer.from(storedProof.vkData, 'hex'));
            await fs.writeFile(tempPublicInputsFile, Buffer.from(storedProof.publicInputsData, 'hex'));

            // Use Barretenberg bb CLI with the correct flags for all three artifacts
            const verifyResult = await execNoirCommand(`bb verify -k ${tempVkFile} -p ${tempProofFile} -i ${tempPublicInputsFile}`);
            
            await fs.remove(tempDir);

            const isVerified = verifyResult.toLowerCase().includes('proof verified successfully');

            res.json({
                success: true,
                verified: isVerified,
                verificationOutput: verifyResult,
                timestamp: new Date().toISOString()
            });

        } catch (verifyError) {
            await fs.remove(tempDir);

            res.json({
                success: false,
                verified: false,
                error: `Verification command failed: ${verifyError.message}`,
                details: verifyError.stdout ? `${verifyError.stdout}\n${verifyError.stderr}` : 'No details available.',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Error verifying proof:', error);
        res.json({
            success: false,
            verified: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        noir_version: 'checking...',
        timestamp: new Date().toISOString()
    });
});

// Helper function to execute Noir commands
function execNoirCommand(command) {
    return new Promise((resolve, reject) => {
        console.log(`⚡ Executing: ${command}`);
        exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing ${command}:`, stderr || stdout);
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
                return;
            }
            
            const output = stdout + stderr;
            console.log(`📤 Output from ${command}:`, output);
            resolve(output);
        });
    });
}

// Helper function to parse execution output
function parseExecutionOutput(output) {
    try {
        // Look for the circuit outputs in the execution log
        const lines = output.split('\n');
        const outputLine = lines.find(line => line.includes('Circuit outputs:') || line.includes('['));
        
        if (outputLine) {
            // Try to extract JSON-like output
            const jsonMatch = outputLine.match(/\[.*\]/);
            if (jsonMatch) {
                const values = JSON.parse(jsonMatch[0]);
                return {
                    venue_id: values[0],
                    network_hash: values[1], 
                    proof_timestamp: values[2]
                };
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not parse execution output:', error.message);
    }
    return null;
}

// Helper functions for generating hashes (simplified for demo)
function generateProofHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(40, '0').substring(0, 40);
}

function generateNullifier(userSecret, venueId, timeWindowStart) {
    const combined = userSecret + venueId + timeWindowStart;
    return generateProofHash({ data: combined, type: 'nullifier' });
}

function generateUserCommitment(userSecret, venueId, proofTimestamp, connectionNonce) {
    const combined = userSecret + venueId + proofTimestamp + connectionNonce;
    return generateProofHash({ data: combined, type: 'commitment' });
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 WiFi Proof Backend running on http://localhost:${PORT}`);
    console.log(`📱 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints:`);
    console.log(`   POST /api/generate-proof - Generate ZK proof`);
    console.log(`   POST /api/verify-proof - Verify ZK proof`);
    console.log(`   GET  /api/health - Health check`);
    
    // Verify Noir installation
    exec('nargo --version', (error, stdout, stderr) => {
        if (error) {
            console.warn('⚠️ Warning: Nargo not found in PATH. Install Noir to enable proof generation.');
        } else {
            console.log('✅ Noir version:', stdout.trim());
        }
    });
}); 