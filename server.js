const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate proof endpoint
app.post('/api/generate-proof', async (req, res) => {
    console.log('📡 Received proof generation request:', req.body);
    
    try {
        const {
            userSecret,
            connectionNonce,
            venueId,
            networkSsidHash,
            timeWindowStart,
            timeWindowEnd,
            proofTimestamp
        } = req.body;

        // Validate inputs
        if (!userSecret || !connectionNonce || !venueId || !networkSsidHash || 
            !timeWindowStart || !timeWindowEnd || !proofTimestamp) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Validate time window
        const startTime = parseInt(timeWindowStart);
        const endTime = parseInt(timeWindowEnd);
        const proofTime = parseInt(proofTimestamp);
        
        if (proofTime < startTime || proofTime > endTime) {
            return res.status(400).json({
                success: false,
                error: 'Proof timestamp must be within the valid time window'
            });
        }

        // Generate Prover.toml content
        const proverTomlContent = `# WiFi Connection Proof - Generated from API
# Timestamp: ${new Date().toISOString()}

user_secret = "${userSecret}"
connection_nonce = "${connectionNonce}"
venue_id = "${venueId}"
network_ssid_hash = "${networkSsidHash}"
time_window_start = "${timeWindowStart}"
time_window_end = "${timeWindowEnd}"
proof_timestamp = "${proofTimestamp}"`;

        // Write Prover.toml
        await fs.writeFile('Prover.toml', proverTomlContent);
        console.log('✅ Generated Prover.toml');

        // Step 1: Compile circuit to JSON format for Barretenberg
        const compileResult = await execNoirCommand('nargo compile');
        console.log('✅ Noir compilation completed');

        // Step 2: Execute circuit to generate witness
        const executeResult = await execNoirCommand('nargo execute');
        console.log('✅ Noir execution completed');

        // Step 3: Generate proof using Barretenberg bb CLI
        const proveResult = await execNoirCommand('bb prove -b ./target/wifiproof.json -w ./target/wifiproof.gz -o ./target');
        console.log('✅ Barretenberg proof generated');

        // Step 4: Generate verification key
        const vkResult = await execNoirCommand('bb write_vk -b ./target/wifiproof.json -o ./target');
        console.log('✅ Verification key generated');

        // Read the Barretenberg proof output
        let proofData, publicInputsData, vkData;
        try {
            const proofFile = path.join(__dirname, 'target', 'proof');
            const publicInputsFile = path.join(__dirname, 'target', 'public_inputs');
            const vkFile = path.join(__dirname, 'target', 'vk');
            
            if (await fs.pathExists(proofFile)) {
                proofData = await fs.readFile(proofFile, 'hex');
                console.log('✅ Read Barretenberg proof file');
            }
            
            if (await fs.pathExists(publicInputsFile)) {
                publicInputsData = await fs.readFile(publicInputsFile, 'hex');
                console.log('✅ Read public inputs file');
            }
            
            if (await fs.pathExists(vkFile)) {
                vkData = await fs.readFile(vkFile, 'hex');
                console.log('✅ Read verification key file');
            }
        } catch (error) {
            console.warn('⚠️ Could not read Barretenberg files:', error.message);
        }

        // Parse execution output to get the public outputs
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
            proverToml: proverTomlContent,
            executionOutput: executeResult,
            compileOutput: compileResult,
            proofGenerated: !!proofData, // Successfully generated cryptographic proof
            proofData: proofData ? `0x${proofData.substring(0, 100)}...` : 'Proof generation failed',
            publicInputs: publicInputsData ? `0x${publicInputsData}` : 'No public inputs',
            verificationKey: vkData ? `VK generated (${vkData.length/2} bytes)` : 'VK generation failed',
            timestamp: new Date().toISOString()
        };

        console.log('🎉 Proof generation successful!');
        res.json(response);

    } catch (error) {
        console.error('❌ Error generating proof:', error);
        res.status(500).json({
            success: false,
            error: error.message
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

        // Use Barretenberg bb CLI for real proof verification
        try {
            const verifyResult = await execNoirCommand('bb verify -k ./target/vk -p ./target/proof -i ./target/public_inputs');
            
            res.json({
                success: true,
                verified: !verifyResult.toLowerCase().includes('error') && !verifyResult.toLowerCase().includes('failed'),
                verificationOutput: verifyResult || 'Proof verified successfully by Barretenberg',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.json({
                success: false,
                verified: false,
                verificationOutput: `Verification failed: ${error.message}`,
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
                console.error(`Error executing ${command}:`, error);
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