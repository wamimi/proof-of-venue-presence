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
git clone <your-repo-url>
cd wifiproof

# Install dependencies
pnpm install

# Start the server
pnpm dev

# Open http://localhost:3001 in your browser
```

### Test with Dummy Data

The demo comes pre-loaded with test data. You can also manually test with these values:

```
User Secret: 12345
Connection Nonce: 99999
Venue ID: 67890
Network SSID Hash: 111222333444555
Time Window Start: 1640995200 (Jan 1, 2022 00:00:00 UTC)
Time Window End: 1640998800 (Jan 1, 2022 01:00:00 UTC)
Proof Timestamp: 1640997000 (Jan 1, 2022 00:26:40 UTC)
```

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