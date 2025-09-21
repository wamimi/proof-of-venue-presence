# WiFiProof: Zero-Knowledge Venue Attendance System

**Privacy-preserving proof of attendance using WiFi connection data and Zero-Knowledge cryptography**

## Table of Contents
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Use Cases](#use-cases)
- [Quick Start](#quick-start)
- [Complete Setup Guide](#complete-setup-guide)
- [Configuration](#configuration)
- [Demo Walkthrough](#demo-walkthrough)
- [Security Model](#security-model)
- [Technical Implementation](#technical-implementation)
- [Database Schema](#database-schema)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## The Problem

At every blockchain and crypto event I attended, I noticed a universal pattern: **everyone asks for the WiFi password**. Whether it's a conference, hackathon, or meetup, attendees immediately connect to the venue's WiFi and stay connected throughout the entire event.

This got me thinking: **What if we could turn this universal behavior into cryptographic proof of attendance?**

Current proof-of-attendance systems have significant limitations:
- **Sign-in sheets**: Easily forgeable
- **NFT tickets**: Can be transferred to non-attendees
- **Photos**: Can be faked or shared
- **Check-ins**: Require trust in centralized systems
- **Privacy violations**: Most systems expose personal data

For crypto projects wanting to distribute airdrops or exclusive access to actual attendees, there was no reliable way to prove someone was physically present at an event without compromising their privacy.

## The Solution

WiFiProof leverages the universal WiFi connection behavior to create **cryptographic proof of venue attendance** while preserving user privacy through Zero-Knowledge proofs.

**Key Innovation**: Transform WiFi connectivity - something everyone already does - into unforgeable cryptographic evidence of physical presence.

### Core Features
- **Real Zero-Knowledge Proofs**: Using Noir circuits and Barretenberg cryptography
- **Privacy-First**: User secrets never leave their device
- **Replay Protection**: Each proof can only be used once
- **Physical Presence Enforcement**: Portal nonce system ensures on-site generation
- **Cryptographic Security**: ECDSA signatures and SHA-256 hashing throughout

## How It Works

### The WiFiProof Flow

**Note**: This implementation uses a simulated captive portal for demonstration purposes. In a real-world deployment, this would be integrated with actual venue WiFi infrastructure. I chose the captive portal pattern as it's a familiar UX that most users have encountered when connecting to public WiFi networks.

1. **Venue Setup**: Event organizers deploy a captive portal with cryptographic signing keys
2. **Attendee Connection**: Users connect to venue WiFi and access the portal
3. **Nonce Issuance**: Portal issues cryptographically signed nonces (only available on local network)
4. **Proof Generation**: Users generate Zero-Knowledge proofs in their browser using the portal nonce
5. **Verification**: Proofs are verified on-chain via zkVerify, proving attendance without revealing identity

![Portal Nonce Successfully Fetched](images/nonce-fetch-success.png)

### What Gets Proven (Public)
- Venue ID where attendance occurred
- Event ID and time window
- Valid portal interaction (proves physical presence)
- Unique nullifier (prevents proof reuse)

### What Stays Private (Hidden)
- User's device identity or secrets
- Exact connection time (only that it was within valid window)
- Personal data or movement patterns
- Other venues visited

## System Architecture

WiFiProof consists of three main components working together:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Portal Server │    │  Proof Client   │    │  zkVerify API   │
│   (Node.js)     │    │  (Next.js)      │    │  (Blockchain)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Request Nonce      │                       │
         │◄──────────────────────│                       │
         │                       │                       │
         │ 2. Signed Nonce       │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │ 3. Verify Signature   │                       │
         │                       │ (WebCrypto)           │
         │                       │                       │
         │ 4. Generate ZK Proof  │                       │
         │                       │ (NoirJS + Barretenberg│
         │                       │                       │
         │ 5. Validate Proof     │                       │
         │◄──────────────────────│                       │
         │                       │                       │
         │ 6. Submit to Blockchain│                      │
         │                       │──────────────────────►│
         │                       │                       │
         │ 7. Transaction Hash   │ 8. On-chain Verification│
         │                       │◄──────────────────────│
```

### Component Details

**Portal Server (`portal/`)**
- ECDSA P-256 cryptographic signing
- SQLite database for nonce management
- IP-based access control (local network only)
- REST API for nonce issuance and proof validation

**Proof Client (`proof-app/`)**
- Browser-based Zero-Knowledge proof generation
- NoirJS integration for client-side proving
- WebCrypto API for signature verification
- Real-time status updates and error handling

**ZK Circuit (`proof-app/public/wifiproof/src/main.nr`)**
- Noir language implementation
- Ultra-efficient 36 ACIR opcodes
- Barretenberg Ultra Honk proving system
- Pedersen hash commitments and nullifiers

## Use Cases

### Blockchain & Crypto Events
- **Airdrops**: Prove attendance at conferences for token distribution
- **Exclusive Access**: Gate access to private Discord/Telegram channels
- **NFT Rewards**: Mint attendance NFTs for actual participants
- **Hackathon Verification**: Prove participation for sponsor rewards

### Enterprise & Compliance
- **Employee Attendance**: Verify office presence without surveillance
- **Training Certification**: Prove attendance at mandatory sessions
- **Audit Compliance**: Generate tamper-proof attendance records
- **Remote Work Verification**: Confirm co-working space usage

### Academic & Research
- **Lecture Attendance**: Privacy-preserving class attendance tracking
- **Conference Participation**: Academic event attendance for CVs
- **Research Study Participation**: Verify subject attendance
- **Certification Programs**: Prove completion of in-person requirements

### Events & Entertainment
- **Concert Attendance**: Prove you were at specific shows
- **Festival Verification**: Access to alumni events or early tickets
- **Sports Events**: Season ticket holder verification
- **Exclusive Venues**: Member-only location access proof

## Quick Start

Get WiFiProof running in under 5 minutes:

### Prerequisites
```bash
# Install Node.js (v16+)
# Install pnpm
npm install -g pnpm

# Install Noir (for circuit compilation)
# Follow the official Noir installation guide:
# https://noir-lang.org/docs/getting_started/quick_start
```

### One-Command Setup
```bash
# Clone and setup everything
git clone https://github.com/wamimi/proof-of-venue-presence
cd proof-of-venue-presence
pnpm run install:all

# Compile the circuit
nargo compile

# Start both servers (requires 2 terminals)
# Terminal 1: Portal server
cd portal && pnpm start

# Terminal 2: Proof client
cd proof-app && pnpm run dev
```

### Test the System
1. Open `http://localhost:3000`
2. Click "Fetch Portal Nonce"
3. Click "Generate WiFiProof"
4. Watch your proof get verified on zkVerify! (requires zkVerify API key - see Configuration section)

![Setup Complete - Both Servers Running](images/setup-complete.png)

## Complete Setup Guide

### 1. Clone the Repository
```bash
git clone https://github.com/wamimi/proof-of-venue-presence
cd proof-of-venue-presence
```

### 2. Install Dependencies
```bash
# Install all project dependencies
pnpm run install:all

# This installs:
# - Root project dependencies
# - Portal server dependencies (portal/)
# - Proof client dependencies (proof-app/)
```

### 3. Install Noir Toolchain
Follow the official Noir installation guide: https://noir-lang.org/docs/getting_started/quick_start

```bash
# Verify installation
nargo --version
```

### 4. Compile the ZK Circuit
```bash
# Compile the WiFiProof circuit
nargo compile

# This creates circuit artifacts in proof-app/public/wifiproof/target/
```

### 5. Configure Environment Variables
See [Configuration](#configuration) section below for detailed setup.

### 6. Start the System
```bash
# Terminal 1: Start portal server
cd portal
pnpm start
# Portal runs on http://localhost:3002

# Terminal 2: Start proof client
cd proof-app
pnpm run dev
# Client runs on http://localhost:3000
```

## Configuration

### zkVerify API Key Setup

To enable on-chain proof verification, you need a zkVerify API key:

1. **Get API Key**: Get your API key from Horizen Labs. Follow this tutorial: https://docs.zkverify.io/overview/tutorials/nextjs-noir
2. **Create Environment File**:
   ```bash
   # Create proof-app/.env
   cd proof-app
   echo "API_KEY=your_zkverify_api_key_here" > .env
   ```

### Portal Configuration (Optional)

The portal server supports additional configuration:

```bash
# Create portal/.env (optional)
cd portal
cat > .env << EOF
PORTAL_PORT=3002
VENUE_ID=VENUE_67890
EVENT_ID=EVENT_20250921
ZKVERIFY_API_KEY=your_key_here
ZKVERIFY_ENDPOINT=https://api.zkverify.io/v1/verify
EOF
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_KEY` | Yes* | None | zkVerify API key for blockchain verification |
| `PORTAL_PORT` | No | 3002 | Portal server port |
| `VENUE_ID` | No | VENUE_67890 | Unique venue identifier |
| `EVENT_ID` | No | EVENT_20250921 | Event identifier |
| `ZKVERIFY_API_KEY` | No | None | Portal's zkVerify key (for direct forwarding) |

*Required for on-chain verification. System works locally without it. The environment file should be `.env` not `.env.local` according to the zkVerify documentation.

## Demo Walkthrough

### Step 1: Portal Nonce Issuance
1. Navigate to `http://localhost:3000`
2. Ensure portal endpoint shows `http://localhost:3002`
3. Click "Fetch Portal Nonce"
4. Verify you see: "Portal nonce received successfully"

**What Happens**: Portal server generates a cryptographically signed nonce and stores it in SQLite database. This nonce can only be issued to local network IPs, simulating the captive portal environment.

### Step 2: Zero-Knowledge Proof Generation
1. Set time window (defaults are pre-filled)
2. Click "Generate WiFiProof"
3. Watch the 6-step process:
   - Step 1: Loading circuit artifacts
   - Step 2: Preparing circuit inputs
   - Step 3: Initializing Noir circuit
   - Step 4: Executing circuit (witness generation)
   - Step 5: Generating ZK proof (most time-consuming)
   - Step 6a: Portal validation
   - Step 6b: zkVerify submission

**What Happens**: The browser generates a real Zero-Knowledge proof using NoirJS and Barretenberg. The proof includes the portal nonce, proving physical presence, while keeping user secrets private.

### Step 3: Verification and Blockchain Submission
1. Portal validates the nonce and marks it as used
2. Proof gets submitted to zkVerify blockchain
3. Transaction hash is returned for verification
4. You can view the proof on zkVerify explorer

![Proof Generation Complete with Transaction Hash](images/proof-generation-complete.png)

![zkVerify Explorer Showing Verified Proof](images/zkverify-explorer.png)
Here is my transaction Hashes 

https://zkverify-testnet.subscan.io/extrinsic/0x1ee467959704ddb56503aac5f51c6801ae9a3d6106a53da77f760e86922a0fc4

https://zkverify-testnet.subscan.io/extrinsic/0x19dd84617a7b7424abad706d8fb59ca7b06ae77159162e2937de58f1794e8ff2

https://zkverify-testnet.subscan.io/extrinsic/0xf51497f3977ac209916d8c95c7a54bdf8b5f1a088433f59cdda6e8a67e73d42f


### Step 4: Database Verification
Check that the nonce was properly consumed:

```bash
cd portal
sqlite3 portal.db
.headers on
.mode table
SELECT substr(nonce,1,16) || '...' as nonce_preview, used, used_at, issued_at FROM nonces WHERE used = 1 ORDER BY used_at DESC;
```

**Expected Result**: Shows used nonces with timestamps proving the security flow worked correctly.

![Database Verification - Used Nonces](images/database-verification.png)

### Step 5: Replay Protection Test
1. Try "Generate WiFiProof" again without fetching a new nonce
2. System should fail at "Portal validation" step
3. Error: "Cannot satisfy constrant"

**This proves**: The system prevents replay attacks and enforces single-use nonces.

![Replay Protection - Invalid Nonce Error](images/replay-protection1.png)

![Replay Protection - Invalid Nonce Error](images/replay-protection2.png)

## Security Model

### Threat Model

**What WiFiProof Protects Against:**
- **Remote Proof Generation**: Portal nonces prevent off-site proof creation
- **Replay Attacks**: Single-use nonces ensure each proof is unique
- **Identity Exposure**: Zero-Knowledge proofs hide user secrets
- **Proof Forgery**: Cryptographic signatures prevent fake portal interactions
- **Timing Attacks**: Time windows prevent early/late proof generation

**What WiFiProof Does NOT Protect Against:**
- **Physical Device Sharing**: If someone gives their device to another person
- **Portal Compromise**: If venue's private keys are stolen
- **Network-Level Attacks**: Deep packet inspection or traffic analysis
- **Social Engineering**: Tricking users into sharing their proofs

### Privacy Guarantees

**Private Inputs (Never Revealed)**:
- User device secret (generated locally, stays in browser)
- Connection nonce (random per proof session)
- Exact proof timestamp (only proven to be within window)

**Public Outputs (Verifiable by Anyone)**:
- Venue ID where attendance occurred
- Event ID and valid time window
- Portal nonce hash (proves portal interaction)
- Proof nullifier (prevents double-spending)

### Cryptographic Primitives

- **Circuit**: Noir v1.0.0-beta.6 with Barretenberg UltraPlonk
- **Signatures**: ECDSA P-256 for portal authentication
- **Hashing**: SHA-256 for input hashing, Pedersen for ZK commitments
- **Proof System**: UltraPlonk
- **Field**: BN254 elliptic curve (Ethereum-compatible)

## Technical Implementation

### Circuit Architecture

The WiFiProof circuit uses Noir language with an ultra-efficient design of only 36 ACIR opcodes. The complete circuit implementation can be found in `proof-app/public/wifiproof/src/main.nr` in the repository.

**Key Technical Features**:
- **Circuit Efficiency**: Only 36 ACIR opcodes, making it one of the most efficient attendance proof systems
- **Privacy Preservation**: All sensitive computation happens locally; secrets never leave the user's device
- **Security Model**: Combines timing constraints, portal validation, and cryptographic commitments

### Portal Nonce System

The portal server implements secure nonce management with the following key security features:
- IP-based access control (local network only)
- Cryptographic signatures prevent forgery
- Database persistence with atomic operations
- Single-use enforcement

Complete implementation details can be found in `portal/index.js` and `portal/db.js` in the repository.

### Browser-Side Proof Generation

The client implements Zero-Knowledge proving entirely in the browser using NoirJS and Barretenberg. The complete proof generation logic can be found in `proof-app/src/pages/components/proof.tsx` in the repository.

## Database Schema

WiFiProof uses SQLite for nonce management with the following schema:

```sql
CREATE TABLE nonces (
    nonce TEXT PRIMARY KEY,           -- 64-character hex nonce
    client_ip TEXT NOT NULL,          -- IP address that requested nonce
    issued_at INTEGER NOT NULL,       -- Unix timestamp when issued
    used INTEGER DEFAULT 0,           -- 0 = unused, 1 = used
    used_at INTEGER DEFAULT NULL      -- Unix timestamp when used
);
```

### Database Operations

**Insert Nonce** (when portal issues):
```sql
INSERT INTO nonces (nonce, client_ip, issued_at) VALUES (?, ?, ?);
```

**Validate Nonce** (before proof acceptance):
```sql
SELECT used FROM nonces WHERE nonce = ?;
```

**Mark as Used** (atomic operation):
```sql
UPDATE nonces SET used = 1, used_at = ? WHERE nonce = ? AND used = 0;
```

**Query Statistics**:
```sql
SELECT COUNT(*) as total, SUM(used) as used_count FROM nonces;
```

### Database Verification

To verify nonce consumption:

```bash
cd portal
sqlite3 portal.db
.headers on
.mode table
SELECT * FROM nonces WHERE used = 1 ORDER BY used_at DESC;
```

This shows successful proof submissions with timing data proving the security model works correctly.

## Roadmap

### Phase 1: Enhanced Security
- **Hardware Security Modules**: Replace file-based key storage with HSM integration
- **Rate Limiting**: Add DoS protection for portal endpoints
- **TLS/HTTPS**: Encrypt all communications in production
- **Audit Logging**: Comprehensive security event logging
- **Multi-Venue Support**: Portal federation and key management

### Phase 2: TLSNotary Integration 
- **Real TLS Proofs**: Replace simulated portal with actual TLS session proofs
- **WiFi Traffic Validation**: Prove actual network traffic occurred
- **Deep Packet Inspection Resistance**: Encrypted proof generation
- **Mobile Integration**: Native iOS/Android apps with WiFi scanning
- **Hardware Wallet Support**: Secure key storage on mobile devices

### Phase 3: Production Infrastructure 
- **Cloud Deployment**: Kubernetes-based scalable architecture
- **Enterprise API**: Venue onboarding and management platform
- **Analytics Dashboard**: Real-time attendance metrics and insights
- **Integration SDKs**: Easy integration for event management platforms
- **Compliance Certifications**: SOC2, GDPR, CCPA compliance

### Phase 4: Advanced Features 
- **Batch Proofs**: Multiple venue attestations in single proof
- **Selective Disclosure**: Choose what information to reveal
- **Cross-Chain Support**: Deploy to multiple blockchain networks
- **Anonymous Credentials**: Long-term pseudonymous identity system
- **Machine Learning**: Anomaly detection for fraud prevention

### Phase 5: Ecosystem Expansion
- **DeFi Integration**: Attendance-gated liquidity pools and yields
- **NFT Marketplaces**: Verified attendance-based NFT collections
- **DAO Governance**: Attendance-weighted voting systems
- **Academic Research**: Privacy-preserving location analytics
- **Government Adoption**: Transparent yet private civic engagement

## FAQ

### General Questions

**Q: How does WiFiProof differ from existing attendance systems?**
A: Unlike traditional systems that either compromise privacy (surveillance) or lack security (sign-in sheets), WiFiProof uses Zero-Knowledge cryptography to prove attendance without revealing personal information. The proof is cryptographically unforgeable while keeping user identity completely private.

**Q: Can someone generate a proof without being physically present?**
A: No. The portal nonce system ensures proofs can only be generated by devices connected to the venue's local network. The portal server only issues nonces to local IP addresses, and each nonce can only be used once.

**Q: What prevents someone from sharing their nonce with others?**
A: While nonces could theoretically be shared, they expire quickly and are bound to the user's device secret. The proof includes a commitment to the user's private secret, so sharing would require giving away device access. Additionally, time windows prevent delayed proof generation.

**Q: Is this a real blockchain application or just a simulation?**
A: WiFiProof generates real Zero-Knowledge proofs using production-grade cryptography (Noir + Barretenberg) and submits them to actual blockchain networks via zkVerify. The proofs are cryptographically verified on-chain and provide genuine mathematical proof of attendance.

### Technical Questions

**Q: How long does proof generation take?**
A: Proof generation typically takes 30 seconds to 2 minutes depending on device performance. The circuit is optimized with only 36 ACIR opcodes, making it one of the most efficient attendance proof systems available.

**Q: What data is stored on the blockchain?**
A: Only the Zero-Knowledge proof and public inputs are stored on-chain: venue ID, event ID, time window, and proof nullifier. No personal information, device identifiers, or user secrets are ever recorded on the blockchain.

**Q: Can venue operators see who attended their events?**
A: No. Venue operators can see that valid proofs were generated for their events, but cannot correlate proofs to specific individuals. The Zero-Knowledge property ensures complete attendee privacy while providing venues with aggregate attendance statistics.

**Q: What happens if I lose my device or browser data?**
A: Each proof is self-contained and doesn't depend on persistent device state. Your user secret is generated fresh for each session. If you need to prove attendance later, you would need to have saved the generated proof data.

**Q: How does this work with corporate/enterprise WiFi networks?**
A: The system can be adapted for enterprise networks by deploying the portal server within the corporate network infrastructure. The same security principles apply: only devices connected to the internal network can request nonces.

### Security Questions

**Q: What if the venue's private keys are compromised?**
A: If venue keys are compromised, an attacker could issue fake nonces for that specific venue. However, they still couldn't retroactively forge historical proofs or impersonate users. The system includes key rotation capabilities and HSM integration is planned for production deployments.

**Q: Can someone analyze my proof to learn personal information?**
A: No. Zero-Knowledge proofs mathematically guarantee that no information beyond the intended claims (venue, time window) can be extracted. The proof reveals nothing about your device, other venues visited, or personal identity.

**Q: What prevents replay attacks or proof reuse?**
A: Each proof includes a unique nullifier generated from your device secret and venue information. The portal database tracks used nonces, and the blockchain can verify nullifier uniqueness. Once a proof is submitted, it cannot be reused.

**Q: Is the system vulnerable to network-level attacks?**
A: The current version assumes trusted local network connectivity. Future versions with TLSNotary integration will provide cryptographic proof of actual network traffic, making the system resistant to network-level manipulation.

### Usage Questions

**Q: Can this be used for remote/virtual events?**
A: The current system is designed for physical venue attendance. For virtual events, alternative proof mechanisms (like video call participation proofs) would be more appropriate. However, the same ZK architecture could be adapted for virtual attendance verification.

**Q: How do users know their proofs are valid?**
A: The system provides real-time verification through zkVerify blockchain integration. Users receive transaction hashes that can be independently verified on blockchain explorers. The cryptographic proofs are mathematically verifiable by anyone.

**Q: Can this integrate with existing event management platforms?**
A: Yes. WiFiProof provides REST APIs and can be integrated into existing systems. Event organizers can embed the proof generation into their existing registration flows or mobile apps.

**Q: What devices/browsers are supported?**
A: Any modern browser with WebCrypto API support can generate proofs. This includes Chrome, Firefox, Safari, and Edge on both desktop and mobile. No special software installation is required for attendees.

### Business Questions

**Q: How much does it cost to deploy WiFiProof?**
A: The core system is open source and free to use. Deployment costs include server hosting (minimal for portal server) and zkVerify transaction fees for blockchain verification (typically a few cents per proof).

**Q: Can this scale to large events with thousands of attendees?**
A: Yes. The portal server is designed for high concurrency, and proof generation happens client-side so it scales horizontally. The SQLite database can handle thousands of nonces, and the system can be deployed with multiple portal instances for very large events.

**Q: What's the business model for venues adopting this?**
A: Venues benefit from verifiable attendance data for sponsors, reduced fraud in loyalty programs, and enhanced privacy compliance. The system can also enable new revenue models like attendance-gated token distributions or exclusive member benefits.

## Troubleshooting

### Common Setup Issues

**Issue: `nargo: command not found`**
Solution: Follow the official Noir installation guide: https://noir-lang.org/docs/getting_started/quick_start

**Issue: `Failed to load circuit from /wifiproof/target/wifiproof.json`**
```bash
# Solution: Compile the circuit first
cd proof-app/public/wifiproof
nargo compile
# Verify target/wifiproof.json exists
```

**Issue: Portal server won't start - port already in use**
```bash
# Solution: Kill existing process or use different port
lsof -ti:3002 | xargs kill -9
# Or set custom port
PORTAL_PORT=3003 pnpm start
```

For other common issues, please refer to the troubleshooting section in the GitHub repository or open an issue with detailed error messages.

### Debug Commands

**Check portal database status:**
```bash
cd portal
sqlite3 portal.db ".tables"
sqlite3 portal.db "SELECT COUNT(*) FROM nonces;"
```

**View portal server logs:**
```bash
cd portal
pnpm start | tee portal.log
# Check portal.log for detailed error messages
```

**Test portal API directly:**
```bash
# Test nonce issuance
curl -X POST http://localhost:3002/api/issue-nonce \
  -H "Content-Type: application/json" \
  -d '{}'

# Test health endpoint
curl http://localhost:3002/api/health
```


If issues persist, check the GitHub Issues page or open a new issue with:
- Full error messages from console
- Browser and OS version
- Steps to reproduce the problem

## Contributing

WiFiProof is open source and welcomes contributions from the community.

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourname/proof-of-venue-presence
   cd proof-of-venue-presence
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Follow the setup guide** above to get the system running
5. **Make your changes** and test thoroughly
6. **Submit a pull request** with clear description

### Areas for Contribution

**Circuit Optimization**
- Reduce constraint count further
- Implement batch proof verification
- Add support for multiple venue proofs

**Security Enhancements**
- Hardware Security Module integration
- Advanced replay protection mechanisms
- Formal security analysis and proofs

**User Experience**
- Mobile app development
- Better error handling and user feedback
- Progressive Web App (PWA) features

**Infrastructure**
- Docker containerization
- Kubernetes deployment manifests
- CI/CD pipeline improvements

**Integration**
- Event management platform SDKs
- Wallet integration (MetaMask, etc.)
- Social media proof sharing features

### Code Guidelines

- **Testing**: Add tests for new functionality
- **Documentation**: Update README and code comments
- **Security**: Follow secure coding practices
- **Performance**: Optimize for client-side performance
- **Privacy**: Maintain zero-knowledge properties


### License

WiFiProof is released under the MIT License.

---

**Built with Noir • Powered by Barretenberg • Privacy First**

*For questions, support, or collaboration opportunities, please open an issue on GitHub *