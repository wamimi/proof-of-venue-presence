# WiFi Connection Proof V1

**Privacy-preserving venue presence verification using Zero-Knowledge proofs**

Generate cryptographic proofs that you were at a specific venue without revealing your device identity or full location history.

## What This Does

✅ **Proves venue presence** during a specific time window  
✅ **Protects privacy** - device identity and exact timing stay hidden  
✅ **Prevents replay attacks** - each proof has a unique nullifier  
✅ **Real cryptographic proofs** - powered by Noir circuits + Barretenberg Ultra Honk  

## V1 Demo Features

- 🔥 **Real Zero-Knowledge Proofs** - Uses actual Barretenberg cryptography  
- 🌐 **Web Interface** - Generate and verify proofs in your browser  
- ⚡ **Ultra-Efficient Circuit** - Only 36 ACIR opcodes  
- 🛡️ **Privacy-First** - No personal data ever leaves your device  

> **Note**: V1 uses dummy test data for demonstration. V2 will integrate with real WiFi data sources and venue attestation systems.

## 🎯 System Assumptions & Current Implementation Status

### ✅ What's Currently Working (V1 Demo)
- **Zero-Knowledge Circuit**: Fully functional 36 ACIR opcodes Noir circuit with real cryptographic proof generation
- **Barretenberg Integration**: Complete Ultra Honk proof system (6073 constraints) with bb CLI commands
- **Local Development**: Full Noir compilation, witness generation, and cryptographic proving on localhost
- **Frontend Interface**: Complete web UI with form validation, proof generation, and verification
- **East African Time Support**: Timezone-aware timestamp handling (GMT+3)
- **Production Deployment**: Vercel serverless functions with simulated proofs for browser compatibility

### 🔧 Technology Stack Used
- **ZK Framework**: Noir v1.0.0-beta.6 with Barretenberg proving backend
- **Circuit**: Custom venue presence proof with nullifier system
- **Backend**: Express.js (localhost) + Vercel serverless functions (production)
- **Frontend**: Vanilla HTML/CSS/JavaScript with modern responsive design
- **Package Manager**: pnpm for dependency management
- **Deployment**: Vercel with GitHub integration

### ⚠️ Current Limitations & Assumptions
1. **Venue Authentication**: Uses simplified hash-based signatures (not real EdDSA/ECDSA)
2. **Network Validation**: Basic SSID hash check (not actual WiFi network verification)
3. **Device Binding**: Simple user secret (not hardware-based attestation)
4. **Production Proofs**: Simulated in serverless environment (real proofs require local Noir installation)
5. **Time Windows**: Hardcoded conference scenarios (not dynamic venue scheduling)
6. **QR Code System**: Not yet implemented (planned for next phase)

### 📋 Next Implementation Steps

#### Phase 1: Enhanced Security (Immediate)
- [ ] Implement proper EdDSA signature verification in circuit
- [ ] Add hardware-based device attestation
- [ ] Create secure venue onboarding system with real cryptographic keys
- [ ] Add proper network proximity verification

#### Phase 2: QR Code Integration
- [ ] Build venue QR code generator tool for conference/venue operators
- [ ] Add QR scanner functionality to frontend for easy venue attestation
- [ ] Implement venue signature verification from QR codes
- [ ] Create venue management dashboard

#### Phase 3: Production Infrastructure
- [ ] Deploy Noir compilation to cloud environment for real production proofs
- [ ] Add proof verification API for third-party integrators
- [ ] Implement proof storage and retrieval system
- [ ] Add batch verification capabilities

#### Phase 4: Real-World Deployment
- [ ] Conduct pilot with actual venues (coffee shops, conferences, offices)
- [ ] Add mobile app support with NoirJS integration
- [ ] Implement venue analytics and reporting
- [ ] Add support for multiple venue networks and roaming

#### Phase 5: Scale & Ecosystem
- [ ] Deploy to GitHub Pages for public access
- [ ] Create developer documentation and APIs
- [ ] Add venue reputation and trust scoring
- [ ] Implement cross-venue proof aggregation

## Quick Start

### Prerequisites

1. **Install Noir** (required for local development):
   ```bash
   curl -L https://install.aztec.network | bash
   noirup
   ```
   Full installation guide: https://noir-lang.org/docs/getting_started/quick_start

2. **Install Node.js** and **pnpm**:
   ```bash
   # Install Node.js (v16+)
   # Then install pnpm
   npm install -g pnpm
   ```

### Run the Demo

```bash
# Clone the repository
git clone https://github.com/wamimi/proof-of-venue-presence
cd proof-of-venue-presence

# Install dependencies
pnpm install

# Start the server
pnpm dev

# Open http://localhost:3001 in your browser
```

### Test with Dummy Data

The demo comes pre-loaded with realistic test data using **current timestamps**. When you load the page, it auto-fills with:

```
User Secret: 12345
Connection Nonce: 99999
Venue ID: 67890
Network SSID Hash: 111222333444555
Time Window Start: [2 hours ago] (auto-filled with current time)
Time Window End: [1 hour from now] (auto-filled with current time)  
Proof Timestamp: [30 minutes ago] (auto-filled with current time)
```

This creates a realistic scenario where you're proving you were at a conference that started 2 hours ago, ends in 1 hour, and you generated the proof 30 minutes ago.

### What Happens

1. **Generate Proof**: Click "Generate ZK Proof" in the web interface
2. **Real Cryptography**: The system uses Noir + Barretenberg to create an actual ZK proof
3. **Verify Proof**: Use the verification tab to confirm the proof is valid
4. **Privacy Preserved**: Your "device secret" never leaves your machine

## Circuit Details

Your WiFi Connection Proof circuit:
- **36 ACIR opcodes** (extremely efficient)
- **6073 constraints** with Ultra Honk  
- **Barretenberg backend** for production-grade cryptography
- **Sub-second proving time** on modern hardware

## File Structure

```
wifiproof/
├── src/main.nr          # Noir circuit logic
├── Prover.toml          # Input data (dummy for V1)
├── index.html           # Web interface  
├── server.js            # Express.js backend
├── package.json         # Dependencies
└── target/              # Generated proofs & circuit artifacts
```

## How It Works

1. **Circuit Logic** (`src/main.nr`): Proves you know a secret and were present during a valid time window
2. **Noir Compilation**: `nargo compile` creates the circuit
3. **Proof Generation**: `bb prove` generates the cryptographic proof  
4. **Verification**: `bb verify` confirms the proof is valid

## What's Private vs Public

**Private Inputs (Hidden):**
- Your device secret
- Connection nonce
- Exact proof timing

**Public Outputs (Revealed):**
- Venue ID you're proving presence at
- Network hash (WiFi identifier)
- Valid time window for the event
- Proof nullifier (prevents reuse)

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/wifiproof)

Or deploy manually:
```bash
npm i -g vercel
vercel --prod
```

## V1 → V2 Roadmap

**V1 (Current)**: Working demo with dummy data  
**V2 (Next)**: Real-world integration
- QR code venue attestations  
- Mobile WiFi data integration
- Venue onboarding system
- NoirJS browser-native proving

## Technology Stack

- **Circuit Language**: Noir v1.0.0-beta.6
- **Proving System**: Barretenberg Ultra Honk  
- **Backend**: Express.js + Node.js
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Deployment**: Vercel-ready

## Contributing

This is a working V1 demo. Contributions welcome for:
- Circuit optimizations
- UI/UX improvements  
- Real data source integration
- Mobile compatibility

## Security Notice

This is demonstration software for testing ZK proof concepts. Do not use with real sensitive data until V2 security audit is complete.

---

**Built with Noir** • **Powered by Barretenberg** • **Privacy First** 