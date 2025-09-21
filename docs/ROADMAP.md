# WiFi Proof System - TLSNotary Integration Roadmap

## Current State (MVP)
- ✅ Simulated captive portal with signed nonce issuance
- ✅ Client-side NoirJS proof generation
- ✅ WebCrypto signature verification
- ✅ zkVerify submission integration
- ✅ SQLite nonce tracking and single-use enforcement

## Phase 1: TLSNotary Integration 

### 1.1 TLS Session Attestation
**Goal:** Replace simulated portal nonces with cryptographic proofs of actual captive portal interactions.

**Implementation:**
- Integrate [TLSNotary](https://tlsnotary.org/) to generate proofs of HTTPS connections to captive portals
- Replace `nonce_hash` and `portal_sig_hash` in Noir circuit with TLS session commitment
- Add TLSNotary verifier to portal backend for attestation validation

**Resources:**
- [TLSNotary Documentation](https://tlsnotary.org/docs/intro/)
- [TLSNotary GitHub](https://github.com/tlsnotary/tlsn)
- [Browser Extension Integration](https://tlsnotary.org/docs/guides/browser_extension/)

### 1.2 Captive Portal Protocol Enhancement
**Goal:** Standardize captive portal interactions for TLS attestation.

**Implementation:**
- Define standard captive portal API contract for TLS provability
- Add structured JSON responses with deterministic field ordering
- Implement portal certificate pinning for consistent TLS fingerprints

### 1.3 Client Integration
**Goal:** Enable browsers to generate TLSNotary proofs of captive portal sessions.

**Implementation:**
- Integrate TLSNotary browser extension or WASM library
- Capture HTTPS requests to captive portal during connection flow
- Generate TLS session proofs automatically when users connect to venue WiFi

## Phase 2: Production Infrastructure

### 2.1 Venue Hardware Integration
**Goal:** Deploy real captive portal infrastructure for pilot venues.

**Raspberry Pi Integration:**
- Use [nodogsplash](https://nodogsplash.readthedocs.io/) captive portal
- Custom portal backend with TLSNotary proof generation
- Integration with venue management systems

**Enterprise WiFi Integration:**
- UniFi Controller external portal integration
- Aruba ClearPass integration
- Cisco ISE custom portal modules

**Reference Implementations:**
- [Raspberry Pi Captive Portal Guide](https://pimylifeup.com/raspberry-pi-captive-portal/)
- [UniFi External Portal Configuration](https://help.ui.com/hc/en-us/articles/115000166827)

### 2.2 Mobile Application
**Goal:** Native mobile apps for seamless venue check-ins.

**Technical Approach:**
- React Native or Flutter app with TLSNotary integration
- Automatic WiFi network detection and portal interaction
- Background proof generation and submission
- QR code scanning for venue verification

### 2.3 Venue Operator Dashboard
**Goal:** Management interface for venue operators to track attendance and verify proofs.

**Features:**
- Real-time proof verification dashboard
- Attendance analytics and reporting
- Venue/event configuration management
- Integration with existing venue management systems

## Phase 3: Advanced Privacy & Security

### 3.1 Enhanced Privacy Protections
- **Group Signatures:** Allow anonymous proof generation within registered groups
- **Differential Privacy:** Add noise to venue statistics while preserving utility
- **Zero-Knowledge Sets:** Prove venue membership without revealing specific venue

### 3.2 Cross-Venue Roaming
- **Venue Network Protocols:** Enable proof generation across venue networks
- **Federated Identity:** Allow users to maintain identity across venues
- **Inter-venue Verification:** Verify proofs generated at partner venues

### 3.3 Regulatory Compliance