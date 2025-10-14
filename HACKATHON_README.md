# WiFiProof: Privacy-Preserving Venue Attendance on Starknet

**Zero-Knowledge Proof System for Cryptographic Venue Attendance Verification**

🏆 **Starknet Hackathon Submission - Privacy & Identity Track**

---

## 🎯 The Problem

At every blockchain event, everyone asks: "What's the WiFi password?"

What if we could turn this universal behavior into **cryptographic proof of attendance** while preserving privacy?

Current proof-of-attendance systems:
- ❌ Sign-in sheets are forgeable
- ❌ NFT tickets can be transferred
- ❌ Photos can be faked
- ❌ Check-ins require centralized trust
- ❌ Most systems expose personal data

## 💡 The Solution

WiFiProof creates **on-chain verifiable** proof of venue attendance using:
- ✅ Zero-Knowledge proofs (Noir circuits)
- ✅ Captive WiFi portal integration
- ✅ Starknet smart contract verification
- ✅ Privacy-preserving cryptography

## 🏗️ Architecture

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│Venue Portal  │  nonce  │   User      │  proof  │   Starknet   │
│ (Captive AP) ├────────>│   Device    ├────────>│   Verifier   │
│   Server     │         │ (Noir + ZK) │         │   Contract   │
└──────────────┘         └─────────────┘         └──────────────┘
```

## 🔐 What Gets Proven (Public)
- Venue ID where user attended
- Event ID and time window
- Valid portal signature
- Commitment to user secret

## 🔒 What Stays Private (Hidden)
- User's secret value
- Exact connection time
- Personal identity
- Other venues visited

## 📦 Project Structure

```
wifiproof/
├── portal-server/              # Captive portal simulation
├── proof-client/               # Desktop proof generation (Base)
├── starknet-integration/       # 🌟 STARKNET SUBMISSION
│   ├── circuit/                # Noir ZK circuit
│   ├── contracts/              # Cairo verifier
│   ├── app/                    # React frontend
│   ├── DEMO_SCRIPT.md          # Complete demo walkthrough
│   └── README.md               # Detailed documentation
└── base-integration/           # Base blockchain reference
```

## 🌟 Starknet Integration Highlights

### Technical Achievements

1. **Complete Noir Circuit** (WiFiProof ZK logic)
   - User secret verification
   - Portal nonce validation
   - Time window checks
   - Hash commitments

2. **Ultra Honk Proving System**
   - Optimized for Starknet (Poseidon hash)
   - ~5 second proof generation
   - ~14KB proof size

3. **Garaga Integration**
   - Automated Cairo verifier generation
   - BN254 elliptic curve operations
   - 2864 field element calldata

4. **On-Chain Verification**
   - ✅ Successfully deployed to Starknet devnet
   - ✅ Proof verified on-chain
   - ✅ Public inputs extracted correctly

### Why This Fits Privacy & Identity Track

**Privacy:**
- Zero-knowledge proofs hide user secrets
- No personal data exposed on-chain
- Venue attendance proven without revealing WiFi details

**Identity:**
- Each user has a unique secret (identity commitment)
- Proves identity without revealing it
- Enables anonymous credential systems

**Real-World Application:**
- Captive portal integration
- Location-based proofs
- Privacy-preserving event tickets

## 🚀 Quick Start (Starknet Demo)

See [`starknet-integration/DEMO_SCRIPT.md`](./starknet-integration/DEMO_SCRIPT.md) for complete walkthrough.

### Prerequisites
```bash
# Install tooling
make -C starknet-integration install-noir
make -C starknet-integration install-barretenberg
make -C starknet-integration install-starknet
make -C starknet-integration install-devnet
make -C starknet-integration install-garaga
```

### Run Complete Demo
```bash
# Terminal 1: Portal Server
cd portal-server && node server.js

# Terminal 2: Starknet Devnet
cd starknet-integration && make devnet

# Terminal 3: Build & Deploy
cd starknet-integration
source garaga-venv/bin/activate

# Build circuit & generate proof
make build-circuit exec-circuit prove-circuit gen-vk

# Generate Cairo verifier
make gen-verifier build-verifier

# Deploy to devnet
make declare-verifier deploy-verifier

# Verify proof on-chain ⭐
./verify_proof.sh
```

**Expected Success:**
```
Success: Call completed
Response: [0x0, 0x7, 0x10932, ...]
```

✅ **Proof verified on Starknet!**

## 📊 Demo for Judges

### 5-Minute Demo Flow

1. **Show the Problem** (30s)
   - Universal WiFi behavior at events
   - Current PoAP limitations

2. **Show the Circuit** (1min)
   - Noir circuit implementation
   - Privacy-preserving logic

3. **Generate Proof** (1min)
   - Command-line proof generation (~5s)
   - Show proof file

4. **Deploy Verifier** (1min)
   - Cairo contract deployment
   - Show on devnet

5. **Verify On-Chain** ⭐ (1min)
   - Run `./verify_proof.sh`
   - Show success message
   - **This is the win!**

6. **Show Roadmap** (30s)
   - Browser proving optimization
   - Testnet/mainnet deployment
   - Real captive portal integration

### Key Talking Points

**Privacy & Identity:**
- ✅ Zero-knowledge proofs preserve privacy
- ✅ User secrets never leave device
- ✅ On-chain verification without revealing identity
- ✅ Enables privacy-preserving loyalty programs

**Technical Innovation:**
- ✅ First WiFi-based PoAP on Starknet
- ✅ Garaga integration for Cairo verifier
- ✅ Ultra Honk proving system
- ✅ Complete end-to-end ZK system

**Real-World Impact:**
- Conference attendance tracking
- Event-based airdrops
- Location proofs for DeFi
- Privacy-preserving check-ins

## 🗺️ Roadmap

### ✅ Current (MVP)
- Complete Noir circuit
- Command-line proving (~5s)
- Cairo verifier generation
- Devnet deployment
- On-chain verification
- Portal integration

### 🚧 In Progress
- Browser-based proving optimization
- Wallet integration (Argent, Braavos)

### 📋 Planned (2-4 weeks)
- Sepolia testnet deployment
- Multiple venue support
- Proof aggregation
- Venue operator dashboard

### 🌍 Long-term Vision
- Mainnet deployment
- Real captive portal integration (UniFi, Meraki)
- NFT attendance badges
- Privacy-preserving loyalty/rewards programs
- Integration with existing event platforms

## 📚 Technical Stack

| Component | Technology |
|-----------|-----------|
| ZK Circuit | Noir 1.0.0-beta.5 |
| Proving System | Barretenberg Ultra Honk (Starknet) |
| Verifier Generator | Garaga 0.18.1 |
| Smart Contract | Cairo 2.x |
| Blockchain | Starknet (devnet 0.4.3) |
| Frontend | React + TypeScript |
| Portal | Node.js + Express |

## 🎯 Use Cases

### 1. Privacy-Preserving Event Ticketing
- Prove attendance without revealing identity
- Prevent ticket scalping (tied to secret)
- Enable anonymous feedback systems

### 2. Airdrop Eligibility
- Distribute tokens to actual attendees
- Prevent sybil attacks (one proof per secret)
- Maintain privacy of recipients

### 3. Loyalty Programs
- Track venue check-ins privately
- Reward frequent visitors
- No centralized tracking

### 4. Access Control
- Prove past attendance for exclusive access
- Gate content by attendance history
- Preserve user privacy

### 5. Academic/Professional Credentials
- Prove conference attendance
- Workshop participation certificates
- Privacy-preserving CV verification

## 🔒 Security Features

- **Replay Protection**: Each proof includes unique nullifier
- **Time-Window Enforcement**: Proofs expire after event
- **Portal Signatures**: ECDSA-signed nonces prevent spoofing
- **Zero-Knowledge**: Secrets never revealed
- **On-Chain Verification**: Cryptographic certainty

## 🤝 Community Feedback & Improvements

**V1 Learnings** (from Base integration):
- localStorage secrets can be extracted
- Single device assumption unrealistic
- Need hardware-based attestation

**Planned V2 Improvements**:
- Hardware security module integration
- Biometric verification
- Multi-device support
- Stronger sybil resistance

**Current Focus**: Demonstrate ZK proof system on Starknet (V1 is perfect for this!)

## 📖 Documentation

- **Complete Setup**: [`starknet-integration/README.md`](./starknet-integration/README.md)
- **Demo Script**: [`starknet-integration/DEMO_SCRIPT.md`](./starknet-integration/DEMO_SCRIPT.md)
- **Circuit Details**: [`starknet-integration/circuit/src/main.nr`](./starknet-integration/circuit/src/main.nr)
- **Base Integration**: [`base-integration/`](./base-integration/)

## 🏆 Why This Deserves to Win

### Privacy & Identity Track Fit
- ✅ **Privacy**: ZK proofs hide sensitive data
- ✅ **Identity**: Secret-based identity commitments
- ✅ **Innovation**: First WiFi-based PoAP on Starknet
- ✅ **Real-World**: Solves actual event attendance problem

### Technical Excellence
- ✅ Complete ZK proof system (circuit → proving → verification)
- ✅ Garaga integration for Cairo verifier generation
- ✅ Successfully deployed and verified on Starknet
- ✅ Clean, documented, reproducible code

### Impact Potential
- ✅ Applicable to any venue with WiFi
- ✅ Enables privacy-preserving event systems
- ✅ Foundation for future identity applications
- ✅ Can integrate with existing Starknet ecosystems

## 🙏 Acknowledgments

- **Noir Team**: Amazing ZK DSL
- **Aztec**: Barretenberg proving system
- **Garaga Team**: Cairo verifier generation
- **Starknet Foundation**: Hackathon support & infrastructure
- **Community**: Feedback on V1 implementation

## 📞 Contact & Links

- **GitHub**: [wifiproof](https://github.com/your-username/wifiproof)
- **Demo Video**: [Coming soon]
- **Live Demo**: Run locally with instructions above

---

**Built with ❤️ for Starknet Hackathon - Privacy & Identity Track**

*"Transforming universal WiFi behavior into cryptographic proof of attendance, all while preserving user privacy on Starknet."*
