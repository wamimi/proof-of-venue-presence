# WiFi Connection Proof

**Privacy-preserving venue presence verification using Zero-Knowledge proofs**

Generate cryptographic proofs that you were at a specific venue without revealing your device identity or location history.

## What This Does

This system proves venue presence during a specific time window while protecting privacy. Your device identity and exact timing stay hidden, but you can cryptographically prove you were at a venue during a valid time window. Each proof has a unique nullifier to prevent replay attacks.

The system generates real cryptographic proofs using Noir circuits and the Barretenberg Ultra Honk proving system.

## Current Status

**Version 1 Demo Features:**
- Real Zero-Knowledge Proofs using Barretenberg cryptography
- Web interface for generating and verifying proofs  
- Ultra-efficient circuit with only 36 ACIR opcodes
- Privacy-first design where no personal data leaves your device

**Note**: This version uses dummy test data for demonstration. Version 2 will integrate with real WiFi data sources and venue attestation systems.

## System Architecture

**What's Currently Working:**
- Zero-Knowledge Circuit: Fully functional 36 ACIR opcodes Noir circuit with real cryptographic proof generation
- Barretenberg Integration: Complete Ultra Honk proof system (6073 constraints) using bb CLI commands
- Local Development: Full Noir compilation, witness generation, and cryptographic proving on localhost
- Frontend Interface: Complete web UI with form validation, proof generation, and verification
- East African Time Support: Timezone-aware timestamp handling (GMT+3)
- Hybrid Deployment: Frontend can be deployed anywhere, backend requires native binary support

**Technology Stack:**
- ZK Framework: Noir v1.0.0-beta.6 with Barretenberg proving backend
- Circuit: Custom venue presence proof with nullifier system
- Backend: Express.js with native Noir/Barretenberg CLI integration
- Frontend: Vanilla HTML/CSS/JavaScript with responsive design
- Package Manager: pnpm for dependency management

**Current Limitations:**
1. Venue Authentication: Uses simplified hash-based signatures (not real EdDSA/ECDSA)
2. Network Validation: Basic SSID hash check (not actual WiFi network verification)
3. Device Binding: Simple user secret (not hardware-based attestation)
4. Backend Requirements: Requires local environment with Noir and Barretenberg installed
5. Time Windows: Hardcoded conference scenarios (not dynamic venue scheduling)
6. QR Code System: Not yet implemented (planned for next phase)

## Development Roadmap

**Phase 1: Enhanced Security**
- Implement proper EdDSA signature verification in circuit
- Add hardware-based device attestation
- Create secure venue onboarding system with real cryptographic keys
- Add proper network proximity verification

**Phase 2: QR Code Integration**
- Build venue QR code generator tool for conference/venue operators
- Add QR scanner functionality to frontend for easy venue attestation
- Implement venue signature verification from QR codes
- Create venue management dashboard

**Phase 3: Production Infrastructure**
- Deploy backend to cloud environment supporting native binaries
- Add proof verification API for third-party integrators
- Implement proof storage and retrieval system
- Add batch verification capabilities

**Phase 4: Real-World Deployment**
- Conduct pilot with actual venues (coffee shops, conferences, offices)
- Add mobile app support with NoirJS integration
- Implement venue analytics and reporting
- Add support for multiple venue networks and roaming

## Quick Start

### Prerequisites

1. **Install Noir** (required for local development):
   ```bash
   curl -L https://install.aztec.network | bash
   noirup
   ```

2. **Install Node.js and pnpm**:
   ```bash
   # Install Node.js (v16+)
   # Then install pnpm
   npm install -g pnpm
   ```

### Run the Demo

```bash
# Clone the repository
git clone https://github.com/yourusername/wifiproof
cd wifiproof

# Install dependencies
pnpm install

# Start the server
pnpm start

# Open http://localhost:3001 in your browser
```

### Test with Demo Data

The demo comes pre-loaded with realistic test data using current timestamps. When you load the page, it auto-fills with:

```
User Secret: 12345
Connection Nonce: 99999
Venue ID: 67890
Network SSID Hash: 111222333444555
Time Window Start: [2 hours ago] (auto-filled)
Time Window End: [1 hour from now] (auto-filled)  
Proof Timestamp: [30 minutes ago] (auto-filled)
```

This creates a realistic scenario where you're proving you were at a conference that started 2 hours ago, ends in 1 hour, and you generated the proof 30 minutes ago.

### How It Works

1. **Generate Proof**: Click "Generate ZK Proof" in the web interface
2. **Real Cryptography**: The system uses Noir + Barretenberg to create an actual ZK proof
3. **Verify Proof**: Use the verification tab to confirm the proof is valid
4. **Privacy Preserved**: Your device secret never leaves your machine

## Circuit Details

The WiFi Connection Proof circuit features:
- 36 ACIR opcodes (extremely efficient)
- 6073 constraints with Ultra Honk  
- Barretenberg backend for production-grade cryptography
- Sub-second proving time on modern hardware

## File Structure

```
wifiproof/
├── src/main.nr          # Noir circuit logic
├── Prover.toml          # Input data (demo configuration)
├── index.html           # Web interface  
├── server.js            # Express.js backend
├── package.json         # Dependencies
└── target/              # Generated proofs & circuit artifacts
```

## Privacy Model

**Private Inputs (Hidden):**
- Your device secret
- Connection nonce
- Exact proof timing

**Public Outputs (Revealed):**
- Venue ID you're proving presence at
- Network hash (WiFi identifier)
- Valid time window for the event
- Proof nullifier (prevents reuse)

## Deployment

The system uses a hybrid deployment model:
- **Frontend**: Can be deployed as static files anywhere (Vercel, Netlify, GitHub Pages)
- **Backend**: Requires environment supporting native binaries (Railway, Render with Docker, local development)

For development, everything runs on localhost:3001. For production, the frontend calls your backend API explicitly.

## Technical Implementation

The system generates real cryptographic proofs through this workflow:

1. **Circuit Logic** (`src/main.nr`): Proves you know a secret and were present during a valid time window
2. **Noir Compilation**: `nargo compile` creates the circuit
3. **Proof Generation**: `bb prove` generates the cryptographic proof  
4. **Verification**: `bb verify` confirms the proof is valid

All cryptographic operations use industry-standard Barretenberg proving system with Ultra Honk scheme.

## Version Progression

**V1 (Current)**: Working demo with test data and real cryptographic proofs
**V2 (Next)**: Real-world integration with QR codes, mobile WiFi data, and venue onboarding system

## Technology Stack

- Circuit Language: Noir v1.0.0-beta.6
- Proving System: Barretenberg Ultra Honk  
- Backend: Express.js + Node.js
- Frontend: Vanilla JavaScript
- Deployment: Hybrid (static frontend + specialized backend)

## Contributing

This is a working demonstration of ZK proof concepts. Contributions welcome for:
- Circuit optimizations
- UI/UX improvements  
- Real data source integration
- Mobile compatibility

## Security Notice

This is demonstration software for testing ZK proof concepts. The current version uses simplified cryptographic primitives for venue authentication. Do not use with real sensitive data until production security implementation is complete.

---

Built with Noir • Powered by Barretenberg 