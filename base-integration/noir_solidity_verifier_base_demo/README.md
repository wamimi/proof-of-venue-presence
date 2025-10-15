# WiFiProof Base Sepolia Integration

This project demonstrates on-chain verification of WiFiProof Zero-Knowledge proofs on Base Sepolia testnet using Noir circuits, Solidity verifiers, and Foundry.

The WiFiProof circuit cryptographically proves venue attendance through WiFi portal access while preserving user privacy.

---

##  Objectives

- Deploy WiFiProof verifier contract on Base Sepolia
- Verify Zero-Knowledge proofs of venue attendance on-chain
- Understand the integration between Noir circuits and Solidity verification
- Test proof verification both locally (Foundry) and on Base Sepolia

---

##  WiFiProof Circuit

The Noir circuit is located in `circuits/src/main.nr` and proves:

**"A user with a secret was physically present at a venue during a specific time window, as verified by a portal-issued nonce"**

### Circuit Inputs

**Private (Hidden):**
- `user_secret`: User's device secret (never revealed)
- `connection_nonce`: Random nonce for this proof session

**Public (Verifiable):**
- `venue_id`: Unique venue identifier
- `event_id`: Specific event identifier
- `nonce_hash`: SHA256 hash of portal-issued nonce
- `portal_sig_hash`: SHA256 hash of portal signature
- `time_window_start`: Valid attendance window start (Unix timestamp)
- `time_window_end`: Valid attendance window end (Unix timestamp)
- `proof_timestamp`: When proof was generated (Unix timestamp)

### What Gets Proven

✅ User was at the venue during the time window
✅ User possesses a valid device secret
✅ Proof includes portal-issued nonce (prevents off-site generation)
✅ Portal signature was verified (prevents forgery)
✅ Proof cannot be reused (nullifier system)

### What Stays Private

User's identity and device secret
Exact connection time
Other venues visited
Actual nonce and signature values

---

##  Project Structure

```bash
base-integration/noir_solidity_verifier_base_demo/
│
├── circuits/                    # Noir circuit
│   ├── src/main.nr             # WiFiProof circuit implementation
│   ├── Nargo.toml              # Circuit configuration
│   ├── Prover.toml             # Test inputs
│   └── build.sh                # Build script
│
├── js/                         # JavaScript proof generation
│   └── generate-proof.ts       # bb.js integration
│
├── contract/                   # Foundry project
│   ├── Verifier.sol           # Auto-generated verifier
│   ├── CyprianVerifierApp.sol # Wrapper contract with counter
│   ├── script/Deploy.s.sol    # Deployment script
│   └── test/VerifyProof.t.sol # Verification tests
│
├── cleanup.sh                  # Clean build artifacts
└── README.md                   # This file
```

---

##  Building the Circuit

### Quick Build (Recommended)

Use the automated build script that handles all steps:

```bash
cd circuits
./build.sh
```

This script will:
1. ✅ Compile the Noir circuit
2. ✅ Generate verification key
3. ✅ Generate Solidity verifier contract

### Manual Build (Step-by-Step)

If you prefer to run each step manually:

**1. Compile Noir Circuit**

```bash
cd circuits
nargo compile
```

This generates `target/noir_solidity_verifier_demo.json`

**2. Generate Verification Key**

```bash
bb write_vk --oracle_hash keccak \
  -b ./target/noir_solidity_verifier_demo.json \
  -o ./target
```

**3. Generate Solidity Verifier**

```bash
bb write_solidity_verifier \
  -k ./target/vk \
  -o ../contract/Verifier.sol
```

This creates the `HonkVerifier` contract used for on-chain verification.

### Generating Proofs

WiFiProof uses JavaScript/TypeScript with bb.js for proof generation:

```bash
cd js

yarn install

yarn generate-proof
```


The `generate-proof.ts` script:
- ✅ Loads the compiled circuit
- ✅ Executes the circuit with WiFiProof inputs (user_secret, venue_id, etc.)
- ✅ Generates witness using NoirJS
- ✅ Generates ZK proof with UltraHonk backend
- ✅ Saves proof to `../circuits/target/proof`
- ✅ Saves public inputs to `../circuits/target/public-inputs`



This generates files used for Foundry testing and on-chain verification.

---

## Deployment on Base Sepolia

### Prerequisites

1. **Set up environment variables** in `contract/.env`:

```bash
# Base Sepolia RPC
RPC_URL=https://sepolia.base.org

# Your private key (DO NOT COMMIT!)
PRIVATE_KEY=your_private_key_here

# Basescan API key for contract verification (optional)
ETHERSCAN_API_KEY=your_basescan_api_key
```

2. **Get Base Sepolia ETH** from faucet:
   - https://portal.cdp.coinbase.com/products/faucet
   If you do not have a Coinbase Developer Platfrom account, sign up using this link : https://app.fuul.xyz/landing/coinbase-cdp?referrer=0x4dc7f61e7B7Ea65729c6A135fa9178073CF50866

### Deploy the Verifier

```bash
cd contract

# Deploy HonkVerifier contract
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

**Deployed Contract Address (Base Sepolia):**
```
0x0828AD412378D82cC7e1566977Eb26e359F0C9fA
```

View on Basescan:
https://sepolia.basescan.org/address/0x0828AD412378D82cC7e1566977Eb26e359F0C9fA

---

##  Contract Details

### HonkVerifier.sol

Auto-generated Solidity verifier that implements the UltraHonk proving system for Noir circuits.

**Key Function:**
```solidity
function verify(bytes calldata proof, bytes32[] calldata publicInputs)
    external view returns (bool)
```

### CyprianVerifierApp.sol

Wrapper contract that tracks verified proofs:

```solidity
contract CyprianVerifierApp {
    HonkVerifier public verifier;
    uint256 public verifiedCount;

    event ProofVerified(address indexed by, uint256 newCount);

    function verifyEqual(bytes calldata proof, bytes32[] calldata publicInputs)
        public returns (bool)
}
```

**Features:**
- Validates proof has exactly 7 public inputs (WiFiProof format)
- Increments `verifiedCount` on successful verification
- Emits `ProofVerified` event for tracking

---

## ✅ Testing

### Local Testing with Foundry

```bash
cd contract

# Run all tests
forge test -vvv

# Run specific test
forge test --match-test testVerifyProof -vvv
```

### Test Structure

```solidity
contract VerifyProofTest is Test {
    HonkVerifier public verifier;
    bytes32[7] publicInputs;

    function testVerifyProof() public {
        // Read proof from circuits/target/proof
        bytes memory proof = vm.readFileBinary("../circuits/target/proof");

        // Verify the proof
        bool result = verifier.verify(proof, publicInputs);
        assertTrue(result);
    }
}
```

---

## 🔗 Integration with WiFiProof System

This Base integration is designed to work with the full WiFiProof system:

1. **Portal Server** (`../../portal/`) issues cryptographically signed nonces
2. **Proof Client** (`../../proof-app/`) generates ZK proofs in the browser
3. **Base Verifier** (this project) verifies proofs on-chain on Base Sepolia

### End-to-End Flow

```
User connects to venue WiFi
         ↓
Portal issues signed nonce
         ↓
Browser generates ZK proof (NoirJS + Barretenberg)
         ↓
Proof submitted to Base Sepolia
         ↓
HonkVerifier validates on-chain ✅
         ↓
CyprianVerifierApp emits ProofVerified event
```

---

## Troubleshooting

### Contract Size Issues

If you encounter "contract too large" errors:

```toml
# foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200
via_ir = true
```

Then rebuild:
```bash
forge clean && forge build --sizes
```

### RPC Connection Issues

Ensure your Base Sepolia RPC URL is correct:
```bash
# Test connection
cast block latest --rpc-url $RPC_URL
```

### Verification Failures

If contract verification fails on Basescan:
```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  HonkVerifier \
  --rpc-url $RPC_URL \
  --etherscan-api-key $ETHERSCAN_API_KEY
```


## Resources

- **Noir Documentation**: https://noir-lang.org/docs
- **Base Documentation**: https://docs.base.org
- **Foundry Book**: https://book.getfoundry.sh
- **WiFiProof Main README**: ../../README.md
- **Deployed Contract**: https://sepolia.basescan.org/address/0x0152036D5d42Ea20f88A32423Ee5C186E435bF51#code

---

