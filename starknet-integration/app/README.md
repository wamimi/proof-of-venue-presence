# WiFiProof - Starknet Web Application

Zero-knowledge proof system for privacy-preserving venue attendance verification on Starknet.

This web app demonstrates the complete WiFiProof workflow from generating proofs to verifying them on-chain.

## What This App Does

WiFiProof allows users to prove they attended a venue (connected to its WiFi portal) without revealing:
- Which specific WiFi network they connected to
- Their personal device information
- Their user secret

The proof is verified on-chain on Starknet, providing cryptographic certainty while preserving privacy.

## Prerequisites

Before running the app, install the required tools:

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup --version 1.0.0-beta.5

# Install Barretenberg
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/bbup/install | bash
bbup --version 0.87.4-starknet.1

# Install Starknet tooling
curl --proto '=https' --tlsv1.2 -sSf https://sh.starkup.dev | sh

# Install Starknet Devnet
asdf plugin add starknet-devnet
asdf install starknet-devnet 0.4.3

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Create Python virtual environment and install Garaga
python3 -m venv garaga-venv
source garaga-venv/bin/activate
pip install garaga==0.18.1
```

## Setup and Installation

```bash
# Navigate to the app directory
cd starknet-integration/app

# Install dependencies
bun install

# Copy circuit artifacts
cd .. && make artifacts && cd app
```

## Complete Workflow

### Step 1: Start the Portal Server

The portal server simulates a WiFi captive portal that provides nonces:

```bash
# In terminal 1, from project root
cd portal-server
node server.js
```

Portal runs on http://localhost:3000

### Step 2: Build the Circuit

Compile the Noir circuit that defines the proof logic:

```bash
# From starknet-integration directory
make build-circuit
```

**Output:**
- `circuit/target/circuit.json` - Compiled circuit (ACIR bytecode)

This file contains the arithmetic circuit that will verify WiFi portal attendance.

### Step 3: Execute Circuit with Test Data

Run the circuit with sample inputs to generate a witness:

```bash
make exec-circuit
```

**Output:**
- `circuit/target/witness.gz` - Witness file containing all circuit wire values

The witness proves that valid inputs satisfy all circuit constraints.

### Step 4: Generate the Proof

Create a zero-knowledge proof using Barretenberg Ultra Honk:

```bash
make prove-circuit
```

**Output:**
- `circuit/target/proof` - ZK proof file (~14KB)

This proof can be verified without revealing the private inputs (user secret, WiFi details).

### Step 5: Generate Verification Key

Create the verification key needed to verify proofs:

```bash
make gen-vk
```

**Output:**
- `circuit/target/vk` - Verification key
- `circuit/target/public_inputs` - Public circuit inputs

### Step 6: Generate Cairo Verifier Contract

Convert the Barretenberg verifier to Cairo for Starknet:

```bash
make gen-verifier
```

**Output:**
- `contracts/verifier/src/honk_verifier.cairo` - Cairo verifier contract

Garaga translates the verifier logic to Cairo so it can run on Starknet.

### Step 7: Build the Cairo Contract

Compile the Cairo verifier contract:

```bash
make build-verifier
```

**Output:**
- `contracts/verifier/target/release/` - Compiled contract artifacts

### Step 8: Deploy to Starknet Devnet

Start a local Starknet node:

```bash
# In terminal 2
make devnet
```

Devnet runs on http://localhost:5050

The devnet will output account information. Save the account details.

### Step 9: Declare and Deploy the Contract

Declare the contract class to Starknet:

```bash
# In terminal 3, activate Python environment
source garaga-venv/bin/activate

# Declare the contract
make declare-verifier
```

**Output:**
```
Class hash declared: 0x5e9e0c845bd72c71f8e509833f049e0d66a108d2d696b4c1142d9835f2f32f8
```

If you see "already declared", the contract is already in devnet - proceed to deploy.

Deploy the contract:

```bash
make deploy-verifier
```

**Output:**
```
Contract address: 0x058ac88555300d527ac9de972c254f880be16d8af08fbb818ba0c7102464cda6
```

### Step 10: Verify Proof On-Chain

Generate calldata and verify the proof:

```bash
./verify_proof.sh
```

**Output:**
```
Generating calldata...
Calldata generated. Length: 2864 felts
```

The 2864 felts include:
- Polynomial commitments (BN254 elliptic curve points)
- Evaluation points and openings
- Public inputs (venue ID, event ID, timestamp)
- Transcript elements for Fiat-Shamir

```
Calling verifier contract...
Success: Call completed

Response: [0x0, 0x7, 0x10932, ...]
```

The response array contains the public inputs that were verified:
- `0x10932` - Venue ID hash
- `0xe4e6c8ae` - Event ID hash
- Timestamp range
- Commitment hash

**Success!** The proof has been verified on-chain on Starknet.

## Running the Web Application

Start the development server:

```bash
# From starknet-integration directory
make run-app
```

Navigate to http://localhost:5173

### Using the Web Interface

The app has three main steps:

**Step 1: Fetch Portal Nonce**
- Click "Fetch Nonce from Portal"
- Connects to http://localhost:3000/nonce
- Receives signed nonce from portal
- Shows nonce value and signature

**Step 2: Generate Witness**
- Enter your user secret (or use default test value)
- Click "Generate Witness"
- Runs the Noir circuit in browser
- Creates witness file from circuit execution

**Step 3: Generate Proof**
- Click "Generate Proof"
- Status: Currently optimized for command-line use
- Browser proof generation works but is being optimized for performance

**Recommendation**: Use command-line proof generation for now:
```bash
make prove-circuit  # Takes ~5 seconds
```

Browser proving will be optimized in future updates.

## Project Structure

```
app/
├── src/
│   ├── App.tsx              # Main application logic
│   ├── main.tsx             # Entry point
│   └── assets/              # Circuit artifacts
│       ├── circuit.json     # Compiled circuit
│       └── Prover.toml      # Test inputs
├── index.html               # HTML template with Buffer polyfill
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies
```

## Technical Details

### Dependencies

- `@noir-lang/noir_js` (1.0.0-beta.5) - Noir circuit execution
- `@aztec/bb.js` (0.87.4-starknet.1) - Barretenberg prover
- `garaga` (0.18.1) - Cairo verifier generation
- `starknet` (7.1.0) - Starknet interactions
- `react` (19.0.0) - UI framework

### Configuration

The app uses Vite with special configuration for Barretenberg:
- Buffer polyfill injected in index.html
- Worker file served from node_modules
- Global definitions for browser compatibility

## Troubleshooting

### "Failed to fetch portal nonce"

Make sure the portal server is running:
```bash
cd portal-server && node server.js
```

### "Witness generation failed"

Check that circuit artifacts are copied to app:
```bash
make artifacts
```

### Browser proof generation hangs

Use command-line proof generation instead:
```bash
make prove-circuit
```

This is a known optimization issue - CLI proving works perfectly.

### Devnet connection issues

Ensure devnet is running on port 5050:
```bash
make devnet
```

## Future Enhancements

### In Progress
- Browser-based proof generation optimization
- Wallet integration (Argent, Braavos)

### Planned
- Deploy to Starknet Sepolia testnet
- Multiple venue support
- Proof aggregation for multiple check-ins
- Venue operator dashboard
- Mainnet deployment
- Integration with real captive portal systems

## License

MIT License

Built for Starknet Hackathon - Privacy & Identity Track
