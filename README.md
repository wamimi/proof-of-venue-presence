# WiFiProof: Zero-Knowledge Venue Attendance System

**Privacy-preserving proof of attendance using WiFi connection data and Zero-Knowledge cryptography**

> **⚠️ Important**: This is **WiFiProof V1** - a proof-of-concept that demonstrates device-based venue attendance verification. Based on extensive community feedback, we've identified key limitations and are developing **WiFiProof V2** with enhanced security and true proof-of-human-presence. [See V2 Roadmap](#wifiproof-v2-roadmap) for details.

## Table of Contents
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works (V1)](#how-it-works-v1)
- [V1 Limitations & Community Feedback](#v1-limitations--community-feedback)
- [System Architecture (V1)](#system-architecture-v1)
- [WiFiProof V2 Roadmap](#wifiproof-v2-roadmap)
- [Use Cases](#use-cases)
- [Quick Start (V1)](#quick-start-v1)
- [Complete Setup Guide](#complete-setup-guide)
- [Configuration](#configuration)
- [Demo Walkthrough](#demo-walkthrough)
- [Security Model](#security-model)
- [Technical Implementation](#technical-implementation)
- [Database Schema](#database-schema)
- [Enhanced FAQ](#enhanced-faq)
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

## How It Works (V1)

### The WiFiProof V1 Flow

**Note**: This implementation uses a simulated captive portal for demonstration purposes. In a real-world deployment, this would be integrated with actual venue WiFi infrastructure.

**What V1 Actually Proves**: "*A device with knowledge of a specific secret accessed the venue's captive portal during a time window*"

**What V1 Does NOT Prove**: "*A unique human was physically present at the venue*"

1. **Venue Setup**: Event organizers deploy a captive portal with cryptographic signing keys
2. **Device Connection**: Device connects to venue WiFi and accesses the portal
3. **Nonce Issuance**: Portal issues cryptographically signed nonces (only available on local network)
4. **Secret Generation**: Browser generates/retrieves device secret from localStorage
5. **Proof Generation**: Device generates Zero-Knowledge proofs using portal nonce + device secret
6. **Verification**: Proofs are verified on-chain via zkVerify

![Portal Nonce Successfully Fetched](images/nonce-fetch-success.png)

### What Gets Proven (Public)
- **Venue ID** where device accessed portal
- **Event ID** and time window
- **Valid portal interaction** (proves network-level presence)
- **Device secret commitment** (proves knowledge of secret)
- **Unique nullifier per device secret** (prevents proof reuse with same secret)

### What Stays Private (Hidden)
- **Device secret value** (stored in localStorage)
- **Exact connection time** (only that it was within window)
- **Personal data or movement patterns**
- **Other venues visited**

### ⚠️ V1 Security Assumptions
- **Single Device**: Assumes one device per person
- **Secret Protection**: Assumes localStorage is not shared/extracted
- **Good Faith Usage**: Assumes users don't clear storage to regenerate secrets

## V1 Limitations & Community Feedback

After extensive community feedback and security analysis, we've identified critical limitations in WiFiProof V1:

### 🚨 **Critical Vulnerabilities**

#### **1. Secret Extractability**
```javascript
// Problem: localStorage is easily extractable
localStorage.getItem('wifiproof_user_secret'); // Anyone can copy this
```
**Impact**: Users can share their device secrets, allowing remote proof generation

#### **2. Multi-Proof Generation** 
```javascript
// Problem: Clear storage = new secret = new proof
localStorage.clear(); // Generates fresh secret, bypassing nullifiers
```
**Impact**: Single user can generate unlimited proofs from same device

#### **3. Multi-Device Exploitation**
```
Person A + Device 1 → Proof 1
Person A + Device 2 → Proof 2  // Same human, different proof
Person A + Device 3 → Proof 3  // Economic incentive makes this profitable
```
**Impact**: One person can generate multiple proofs for airdrops/rewards

#### **4. High-Value Attack Economics**
When WiFiProof gates valuable rewards (airdrops, exclusive access):
- **Attack Cost**: $0 (just bring multiple devices)
- **Attack Reward**: Potentially $100s or $1000s
- **Result**: Economics heavily favor exploitation

### 💬 **Community Questions Addressed**

**Q: "How are POAPs transferable? I thought they were soulbound?"**
**A**: Most POAPs are ERC-721 NFTs, inherently transferable unless custom logic makes them soulbound. WiFiProof V1 has similar transferability issues due to extractable secrets.

**Q: "What if I disconnect, clear my browser cache and connect again?"**
**A**: In V1, yes - you can generate multiple proofs. Each gets a new secret and nullifier, bypassing our replay protection.

**Q: "Why can't I just give someone the proof and the secret?"**
**A**: You can! localStorage secrets are extractable, making WiFiProof V1 transferable despite being designed otherwise.

**Q: "What if I have multiple devices?"**
**A**: V1 cannot distinguish between multiple devices from one person vs multiple people. This is a fundamental limitation.

### 🎯 **What V1 Is Actually Good For**

Despite limitations, WiFiProof V1 has valid use cases:

#### **Enterprise/Corporate Scenarios**
- **Managed devices** with known device policies
- **Low-stakes verification** where device-level proof suffices
- **Internal audit trails** where employees aren't incentivized to exploit

#### **Technical Demonstration**
- **ZK circuit innovation**: Proves ZK venue attendance is technically feasible
- **Portal nonce system**: Demonstrates cryptographic venue binding
- **Privacy preservation**: Shows how to hide user data while proving attendance

#### **Research & Development**
- **Foundation for V2**: Core cryptographic primitives are sound
- **Community feedback catalyst**: Revealed real-world security requirements
- **Educational tool**: Demonstrates ZK proof concepts

### 🔍 **Honest Assessment**

**WiFiProof V1 proves**: "*A device with a valid secret accessed this venue portal*"

**For true proof of human presence, we need WiFiProof V2** ↓

## System Architecture (V1)

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

## WiFiProof V2 Roadmap

Based on extensive community feedback and security research, WiFiProof V2 will implement a **three-layer security model** that addresses all V1 limitations:

### 🏗️ **V2 Architecture: True Proof of Human Presence**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WiFiProof V2 Architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Layer 1: Physical Presence (Single-Use Codes)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Venue pre-generates 1000 unique codes → Printed cards at        │   │
│  │ check-in → Anonymous distribution → One-time redemption only    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                   │
│  Layer 2: Device Binding (Secure Enclaves)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ WebAuthn/Passkeys → Hardware-backed keys → Non-extractable     │   │
│  │ secrets → Device attestation → Cryptographic proof of hardware │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                   │
│  Layer 3: Human Uniqueness (BrightID)                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Social graph verification → Proof of personhood → Sybil         │   │
│  │ resistance → One proof per unique human verified               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                   │
│  Result: Unforgeable Proof of Human Venue Presence                    │
└─────────────────────────────────────────────────────────────────────────┘
```

###  **Layer 1: Physical Presence (Single-Use Codes)**

**Problem Solved**: Remote proof generation, unlimited access attempts

**How It Works**:
```
Pre-Event:
1. Venue generates 1000 unique codes offline: ["WP24-A1B2", "WP24-C3D4", ...]
2. Codes printed on tamper-evident cards (QR codes + text)
3. Distributed at physical check-in (no tracking of who gets what)
4. Each code can only be redeemed once across entire system

At Venue:
5. User connects to WiFi → Captive portal requests access code
6. User enters: "WP24-A1B2" 
7. Portal validates code is unused → Marks as consumed
8. Issues cryptographic nonce tied to redeemed code
```

**Security Properties**:
- **Finite Supply**: Only 1000 proofs possible per event (vs unlimited in V1)
- **Physical Distribution**: Must be present to receive code
- **Anonymous Usage**: No tracking of code→person mapping (privacy preserved)
- **Tamper Evidence**: Physical codes harder to duplicate than digital secrets

**Privacy**: Anonymity set of 1000 - each proof is indistinguishable among all possible codes

###  **Layer 2: Device Binding (Secure Enclaves)**

**Problem Solved**: Secret extractability, secret sharing, multi-device exploitation

**Technologies**:
- **WebAuthn/Passkeys**: Browser standard for hardware authentication
- **Apple Secure Enclave**: A9+ chips (iPhone 6s+, MacBook Pro 2016+)
- **Android Secure Element**: Pixel 3+, Samsung Galaxy S8+
- **Hardware Security Modules**: Dedicated cryptographic processors

**How It Works**:
```javascript
// V2: Hardware-backed key generation
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: venueNonce,
    rp: { name: "WiFiProof V2" },
    user: { id: userID, name: "anonymous" },
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Forces secure enclave
      userVerification: "required"
    },
    attestation: "direct" // Proves genuine hardware
  }
});

// V2: Hardware-backed proof signing
const proofSignature = await navigator.credentials.get({
  publicKey: {
    challenge: combinedCodeAndNonce,
    allowCredentials: [{ type: "public-key", id: credential.rawId }]
  }
});

// Keys NEVER leave secure enclave  impossible to extract or share
```

**Security Properties**:
- **Non-Extractable Keys**: Private keys physically cannot leave hardware
- **Hardware Attestation**: Cryptographic proof operations happened in genuine secure enclave
- **Biometric Binding**: Face ID/Touch ID ensures human presence for key usage
- **Device Persistence**: Keys survive app deletion, browser clearing, etc.

### 👥 **Layer 3: Human Uniqueness (BrightID)**

**Problem Solved**: Multi-device exploitation, one-person-many-proofs attacks

**BrightID Overview**:
- **Decentralized Identity Network**: Social graph-based uniqueness verification
- **Privacy-First**: No PII required - uses social connections for verification
- **Sybil Resistant**: AI algorithms detect fake/duplicate identities
- **Open Source**: Transparent, community-governed verification process

**Verification Levels**:
1. **Meets**: Basic verification from attending BrightID "connection parties"
2. **Aura**: Higher confidence through multiple trusted connections  
3. **Bitu**: Strongest verification through extensive social graph analysis

**How It Works**:
```javascript
// V2: BrightID Integration
const brightIDStatus = await brightid.getVerifications(userAddress);

if (brightIDStatus.meets && brightIDStatus.aura) {
  // Verified unique human - allow proof generation
  allowProofGeneration();
} else {
  // Not verified - redirect to BrightID flow
  window.open('https://brightid.org/verification');
}
```

**Social Graph Analysis**:
```
User A connects to: [User B, User C, User D] (real people, in-person QR scans)
User E connects to: [User F, User G, User H] (different social cluster)
User X connects to: [Bot1, Bot2, Bot3] (detected as fake - no real connections)
```

**Security Properties**:
- **One Identity Per Human**: Social graph analysis prevents multiple accounts
- **Connection Parties**: Must attend physical events to build verification
- **Time-Based Verification**: Real relationships develop over time; fake ones don't
- **Community Governance**: Decentralized moderation prevents gaming

### **V2 Complete User Flow**

```
Pre-Verification (One-time setup):
1. User attends BrightID connection party
2. Scans QR codes of real people → Builds social graph
3. Achieves "Meets" + "Aura" verification status
4. Sets up WebAuthn passkey on their device

Event Attendance:
5. User receives physical code at venue: "WP24-X7Y9"
6. Connects to venue WiFi → Captive portal
7. System checks BrightID verification status ✓
8. User enters single-use code → Portal validates & marks used ✓
9. Portal issues cryptographic nonce
10. WebAuthn prompts for biometric (Face ID/Touch ID) ✓
11. Secure enclave signs (code_hash + nonce + timestamp)
12. ZK circuit proves: "Verified unique human + Valid unused code + Hardware signature"
13. Proof submitted to blockchain with nullifier preventing reuse

Result: Cryptographic proof that a verified unique human was physically 
present at the venue, impossible to forge, share, or duplicate.
```

###  **V2 Security Analysis**

| Attack Vector | V1 Vulnerability | V2 Protection |
|---------------|------------------|---------------|
| **Secret Sharing** | localStorage extractable | Hardware-backed keys (impossible to extract) |
| **Multi-Device** | One person → Many devices | BrightID ensures one proof per human |
| **Secret Reset** | Clear storage → New secret | Hardware keys persist, BrightID prevents new accounts |
| **Remote Generation** | Only WiFi check | Physical code distribution required |
| **Replay Attacks** | Nonce reuse possible | Single-use codes + Hardware signatures |
| **Sybil Attacks** | No human verification | BrightID social graph analysis |
| **Economic Attacks** | $0 cost, $1000s reward | Multiple barriers increase attack cost significantly |

###  **V2 Implementation Phases**

#### **Phase 1: Enhanced Device Security
```
┌─────────────────────────────────────┐
│ WebAuthn Integration                │
├─────────────────────────────────────┤
│ ✓ Passkey support for modern devices │
│ ✓ Secure enclave key generation      │
│ ✓ Hardware attestation verification  │
│ ✓ Fallback to V1 for older devices   │
└─────────────────────────────────────┘
```

**Deliverables**:
- WebAuthn integration in proof client
- Hardware-backed key generation and storage
- Biometric authentication for proof generation
- Device compatibility detection and graceful fallbacks

#### **Phase 2: BrightID Integration 
```
┌─────────────────────────────────────┐
│ Human Uniqueness Verification       │
├─────────────────────────────────────┤
│ ✓ BrightID API integration           │
│ ✓ Social graph verification checks   │
│ ✓ Verification level requirements    │
│ ✓ User onboarding flow design        │
└─────────────────────────────────────┘
```

**Deliverables**:
- BrightID SDK integration
- Verification status checking
- User-friendly onboarding for BrightID setup
- Partnership with BrightID for verification events

#### **Phase 3: Single-Use Code System 
```
┌─────────────────────────────────────┐
│ Physical Presence Verification      │
├─────────────────────────────────────┤
│ ✓ Secure code generation system      │
│ ✓ Physical distribution workflow     │
│ ✓ QR code + text backup formats     │
│ ✓ Venue integration partnerships     │
└─────────────────────────────────────┘
```

**Deliverables**:
- Offline code generation tools
- Tamper-evident printing guidelines
- Event organizer documentation
- Integration with major event platforms

#### **Phase 4: Production Deployment 
```
┌─────────────────────────────────────┐
│ Enterprise-Ready V2 System          │
├─────────────────────────────────────┤
│ ✓ Multi-venue support               │
│ ✓ Scalable infrastructure           │
│ ✓ Analytics and monitoring          │
│ ✓ Compliance and audit tools        │
└─────────────────────────────────────┘
```

**Deliverables**:
- Cloud infrastructure for enterprise deployment
- Multi-venue management dashboard
- Real-time analytics and fraud detection
- SOC2 compliance and security audits

###  **V2 Value Proposition**

**WiFiProof V2 Will Prove**: "*A verified unique human was physically present at this venue during this time window*"

**Unforgeable Because**:
- **Physical codes** prevent remote generation
- **Secure enclaves** prevent key extraction/sharing  
- **BrightID verification** prevents multi-human exploitation
- **ZK proofs** maintain privacy while proving attendance

**Use Cases Unlocked by V2**:
- **High-Value Airdrops**: Safe to distribute valuable tokens based on attendance
- **Exclusive Access**: Gate Discord/Telegram channels to verified attendees
- **NFT Minting**: Provably scarce attendance-based NFTs
- **DAO Governance**: Attendance-weighted voting for event-based DAOs
- **Academic Credit**: Verifiable attendance for courses and conferences
- **Corporate Compliance**: Audit-ready attendance records with privacy

### 🔬 **Research & Advanced Features**

#### **ZK-TLS Integration (Future)**
Move beyond simulated portals to cryptographic proof of actual TLS sessions:

```
Traditional: "Trust me, they connected to venue WiFi"
ZK-TLS: "Here's cryptographic proof they had a TLS session with venue server"
```

#### **Cross-Chain Verification**
Submit proofs to multiple blockchains for maximum composability:
- Ethereum for DeFi integrations
- Polygon for low-cost verification
- Arbitrum for L2 scalability
- zkSync for native ZK-proof verification

#### **Batch Proofs**
Generate a single proof covering multiple venue visits:
```javascript
// Prove attendance at 5 conferences with one ZK proof
const batchProof = generateBatchProof([
  venue1_attendance, venue2_attendance, venue3_attendance, 
  venue4_attendance, venue5_attendance
]);
```

###  **Community & Partnerships**

**BrightID Partnership**: Deep integration for seamless verification flows
**Event Platforms**: Eventbrite, Meetup, conference organizers
**Hardware Vendors**: Apple, Google, Yubico for optimal secure enclave support
**Academic Institutions**: Research partnerships for privacy-preserving analytics

The V2 roadmap addresses every limitation identified in community feedback while maintaining WiFiProof's core privacy guarantees. This represents a fundamental leap from device-based to human-based venue attendance verification.

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

## Quick Start (V1)

Get WiFiProof V1 running in under 5 minutes:

> **Note**: This is the V1 implementation with known limitations. See [V1 Limitations](#v1-limitations--community-feedback) for details and [V2 Roadmap](#wifiproof-v2-roadmap) for upcoming improvements.

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

---

> **📋 For detailed V2 roadmap including secure enclaves, BrightID integration, single-use codes, and implementation phases, see [WiFiProof V2 Roadmap](#wifiproof-v2-roadmap) above.**

## Enhanced FAQ

### V1 vs V2 Questions

**Q: How are POAPs transferable? I thought they were soulbound?**
**A**: Most POAPs are ERC-721 NFTs, inherently transferable unless custom logic makes them soulbound. WiFiProof V1 has similar transferability issues due to extractable localStorage secrets. **V2 Solution**: Hardware-backed keys that cannot be extracted or shared.

**Q: What if I disconnect, clear my browser cache and connect again? Won't I get another proof?**
**A (V1)**: Yes, clearing localStorage generates a new secret and bypasses nullifiers, allowing multiple proofs.
**A (V2)**: Hardware keys persist through cache clearing, and BrightID ensures one proof per verified human regardless of device manipulations.

**Q: Why can't I just give someone the proof and the secret?**
**A (V1)**: You can! localStorage secrets are extractable, making proofs transferable despite being designed otherwise.
**A (V2)**: Secure enclave keys physically cannot be extracted. Even with device access, biometric authentication (Face ID/Touch ID) is required.

**Q: What if I have multiple devices?**
**A (V1)**: V1 cannot distinguish between multiple devices from one person vs multiple people. This is a fundamental limitation.
**A (V2)**: BrightID social graph verification ensures one proof per unique human, regardless of how many devices they own.

**Q: Can someone share their nonce with others?**
**A (V1)**: While nonces could be shared, they're bound to device secrets. However, since secrets are extractable, this doesn't provide real protection.
**A (V2)**: Even if nonces are shared, the proof requires: (1) Valid single-use code (physical distribution), (2) Hardware signature (non-extractable), (3) BrightID verification (social graph). All three cannot be easily shared.

### Security & Technical Questions

**Q: How does WiFiProof differ from existing attendance systems?**
**A**: Traditional systems either compromise privacy (surveillance) or lack security (sign-in sheets). WiFiProof uses Zero-Knowledge cryptography to prove attendance without revealing identity. V1 proves device presence; V2 proves unique human presence.

**Q: Can someone generate a proof without being physically present?**
**A (V1)**: The portal nonce system requires local network access, but secrets can be shared for remote generation.
**A (V2)**: Three barriers prevent remote generation: (1) Physical single-use codes, (2) Hardware-backed device signatures, (3) BrightID social verification.

**Q: Is this a real blockchain application or just a simulation?**
**A**: WiFiProof generates real Zero-Knowledge proofs using production-grade cryptography (Noir + Barretenberg) and submits to actual blockchain networks via zkVerify. The mathematical proofs are genuine and verifiable.

**Q: What exactly does the proof prove?**
**A (V1)**: "A device with knowledge of a specific secret accessed the venue's captive portal during a time window"
**A (V2)**: "A verified unique human was physically present at this venue during this time window"

**Q: How long does proof generation take?**
**A**: 30 seconds to 2 minutes depending on device performance. The circuit uses only 36 ACIR opcodes, making it highly efficient. V2 adds biometric prompts but maintains similar generation times.

**Q: What data is stored on the blockchain?**
**A**: Only Zero-Knowledge proof and public inputs: venue ID, event ID, time window, proof nullifier. No personal information, device identifiers, or secrets are ever recorded on-chain.

**Q: Can venue operators see who attended their events?**
**A**: No. Venues see that valid proofs were generated but cannot correlate proofs to individuals. V2's anonymous code distribution further enhances privacy with k-anonymity among all distributed codes.

### V2 Implementation Questions

**Q: When will V2 be available?**
**A**: Phased rollout: WebAuthn integration (Q2 2024), BrightID integration (Q3 2024), Single-use codes (Q4 2024), Production deployment (Q1 2025).

**Q: What devices support V2's secure enclaves?**
**A**: 
- **iOS**: iPhone 6s+ (A9+ chips), iPads with Touch ID/Face ID
- **Android**: Pixel 3+, Samsung Galaxy S8+, devices with secure elements
- **Desktop**: MacBook Pro 2016+ (T1/T2/M1 chips), Windows Hello devices
- **Fallback**: V1 mode for older devices during transition

**Q: How does BrightID verification work?**
**A**: Users attend "connection parties" where they scan QR codes of real people in person. Social graph analysis detects unique humans vs fake accounts. Requires building real relationships over time - cannot be gamed quickly.

**Q: What if someone distributes multiple single-use codes to friends?**
**A**: This requires corrupting the physical distribution process and still only provides the number of extra codes given. The anonymity set remains intact (no tracking of who got which code), and it requires venue staff collaboration.

**Q: How does V2 handle users without BrightID verification?**
**A**: Onboarding flow guides users to BrightID verification. We're partnering with BrightID to host "connection parties" at major events. Alternative: trusted venue staff can provide manual verification for small events.

### Usage & Business Questions

**Q: Can this be used for high-value airdrops?**
**A (V1)**: Not recommended due to exploitation economics.
**A (V2)**: Yes! Multiple security layers make exploitation cost-prohibitive while maintaining true proof of unique human presence.

**Q: How much does deployment cost?**
**A**: 
- **V1**: Server hosting (~$20/month) + zkVerify fees (~$0.01/proof)
- **V2**: Add single-use code printing costs (~$0.10/attendee for tamper-evident cards)

**Q: Can this scale to large events?**
**A**: Yes. Portal servers handle high concurrency, proof generation is client-side, and the system can deploy multiple instances. V2's offline code generation supports any event size.

**Q: What's the business model for venues?**
**A**: Venues get verifiable attendance data for sponsors, reduced fraud in loyalty programs, and privacy compliance. V2 enables new models: attendance-gated tokens, exclusive access rights, sponsor verification dashboards.

**Q: How does this work with corporate/enterprise WiFi?**
**A**: Deploy portal server within corporate network. Same security principles apply. V2's device binding particularly valuable for managed corporate device environments.

**Q: What devices/browsers are supported?**
**A**: Any modern browser with WebCrypto API: Chrome, Firefox, Safari, Edge on desktop and mobile. V2 requires WebAuthn support (available in all modern browsers since 2019).

### Privacy & Compliance Questions

**Q: Is this GDPR compliant?**
**A**: Yes. No personal data is collected or stored. Users generate proofs locally, and only mathematical commitments are recorded. V2's BrightID integration maintains GDPR compliance through pseudonymous verification.

**Q: Can governments track users through WiFiProof?**
**A**: No. The system is designed for complete unlinkability. Even with full blockchain access, proofs cannot be correlated to individuals. V2's anonymous code distribution adds additional privacy layers.

**Q: What happens if BrightID is compromised?**
**A**: V2 includes fallback verification methods and can operate with alternative proof-of-personhood systems. The modular architecture allows swapping verification layers without affecting core ZK proof system.

**Q: How does this compare to other identity systems?**
**A**: Unlike centralized systems, WiFiProof maintains user privacy while providing cryptographic proof. V2's combination of hardware security + social verification + physical presence creates a unique security model not available in existing systems.

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

## Conclusion

WiFiProof represents an evolution in attendance verification systems:

**V1: Proof of Concept**
- Demonstrates ZK venue attendance is technically feasible
- Shows how to preserve privacy while proving portal access
- Reveals real-world security requirements through community feedback
- Suitable for enterprise environments and low-stakes verification

**V2: Production System**  
- Addresses all identified security vulnerabilities
- Implements true proof of unique human presence
- Combines cutting-edge technologies: Secure Enclaves + BrightID + ZK Proofs
- Enables high-value use cases like airdrops and exclusive access

**Impact**
The journey from V1 to V2 showcases how community feedback drives innovation. What started as device-based attendance tracking evolved into a comprehensive human presence verification system that maintains privacy while preventing exploitation.

**Community-Driven Development**
Special thanks to [Václav Pavlín](https://x.com/vpavlin) and the broader crypto community for critical security analysis that shaped V2's design. This project demonstrates the power of open-source collaboration in building robust privacy-preserving systems.

**Future Vision**  
WiFiProof V2 will enable a new category of applications requiring cryptographic proof of human physical presence while maintaining complete privacy. From attendance-gated DAOs to privacy-preserving analytics, the possibilities are endless.

---

**V1: Built with Noir • Powered by Barretenberg • Privacy First**

**V2: + Secure Enclaves + BrightID + True Human Verification**

 For questions, support, collaboration opportunities, or to join the V2 development effort, please open an issue on GitHub

Ready to help build the future of privacy-preserving attendance verification? We'd love your contributions to make V2 a reality!