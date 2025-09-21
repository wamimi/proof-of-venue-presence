# WiFi Proof System - TLSNotary Integration Roadmap

## Current State (MVP)
- ✅ Simulated captive portal with signed nonce issuance
- ✅ Client-side NoirJS proof generation
- ✅ WebCrypto signature verification
- ✅ zkVerify submission integration
- ✅ SQLite nonce tracking and single-use enforcement

## Phase 1: TLSNotary Integration (Next 3-6 months)

### 1.1 TLS Session Attestation
**Goal:** Replace simulated portal nonces with cryptographic proofs of actual captive portal interactions.

**Implementation:**
- Integrate [TLSNotary](https://tlsnotary.org/) to generate proofs of HTTPS connections to captive portals
- Replace `nonce_hash` and `portal_sig_hash` in Noir circuit with TLS session commitment
- Add TLSNotary verifier to portal backend for attestation validation

**Technical Changes:**
```rust
// Enhanced circuit with TLS attestation
fn main(
    user_secret: Field,
    connection_nonce: Field,
    venue_id: pub Field,
    event_id: pub Field,
    tls_session_hash: pub Field,        // NEW: TLSNotary session commitment
    tls_notary_proof_hash: pub Field,   // NEW: TLSNotary proof hash
    captive_portal_response_hash: pub Field, // NEW: Portal response commitment
    time_window_start: pub u64,
    time_window_end: pub u64,
    proof_timestamp: pub u64
)
```

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

**Portal API Standard:**
```json
{
  "version": "1.0",
  "venue_id": "VENUE_12345",
  "event_id": "EVENT_20250921",
  "challenge_nonce": "<32-byte-hex>",
  "timestamp": 1695283200,
  "session_token": "<jwt-token>",
  "tls_fingerprint": "<sha256-of-cert-chain>"
}
```

### 1.3 Client Integration
**Goal:** Enable browsers to generate TLSNotary proofs of captive portal sessions.

**Implementation:**
- Integrate TLSNotary browser extension or WASM library
- Capture HTTPS requests to captive portal during connection flow
- Generate TLS session proofs automatically when users connect to venue WiFi

## Phase 2: Production Infrastructure (6-12 months)

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

## Phase 3: Advanced Privacy & Security (12+ months)

### 3.1 Enhanced Privacy Protections
- **Group Signatures:** Allow anonymous proof generation within registered groups
- **Differential Privacy:** Add noise to venue statistics while preserving utility
- **Zero-Knowledge Sets:** Prove venue membership without revealing specific venue

### 3.2 Cross-Venue Roaming
- **Venue Network Protocols:** Enable proof generation across venue networks
- **Federated Identity:** Allow users to maintain identity across venues
- **Inter-venue Verification:** Verify proofs generated at partner venues

### 3.3 Regulatory Compliance
- **GDPR Compliance:** Ensure EU data protection compliance
- **CCPA Integration:** California privacy law compliance
- **SOC 2 Certification:** Enterprise security certification

## Technical Milestones

### Milestone 1: TLSNotary POC (Month 1-2)
- [ ] TLSNotary library integration
- [ ] Simple TLS session proof generation
- [ ] Circuit updates for TLS verification
- [ ] Local demonstration with real HTTPS captive portal

### Milestone 2: Pilot Deployment (Month 3-4)
- [ ] Raspberry Pi captive portal deployment
- [ ] Mobile app beta version
- [ ] Venue operator training materials
- [ ] Pilot with 3-5 coffee shops/venues

### Milestone 3: Production Beta (Month 6-8)
- [ ] Enterprise WiFi integrations
- [ ] Scalable backend infrastructure
- [ ] Professional venue operator dashboard
- [ ] Performance optimization and load testing

### Milestone 4: Public Launch (Month 10-12)
- [ ] App store releases (iOS/Android)
- [ ] Venue partnership program
- [ ] Public documentation and developer APIs
- [ ] Security audit and compliance certifications

## Resource Requirements

### Development Team
- **Cryptography Engineer:** TLSNotary integration and circuit development
- **Backend Engineer:** Scalable infrastructure and API development
- **Mobile Developer:** React Native/Flutter app development
- **DevOps Engineer:** Cloud deployment and monitoring
- **Security Auditor:** Continuous security review and compliance

### Infrastructure
- **Cloud Platform:** AWS/GCP for scalable backend hosting
- **Monitoring:** DataDog/New Relic for performance monitoring
- **Security:** Penetration testing and security audit services
- **Compliance:** Legal review for privacy regulations

### Estimated Timeline: 12-18 months
### Estimated Budget: $500K - $1M (depending on team size and infrastructure scale)

## Risk Mitigation

### Technical Risks
- **TLSNotary Browser Support:** Fallback to extension-based approach
- **Venue Hardware Constraints:** Provide multiple integration options
- **Performance at Scale:** Gradual rollout with monitoring

### Business Risks
- **Venue Adoption:** Start with friendly venues and demonstrate value
- **User Privacy Concerns:** Transparent privacy documentation and controls
- **Regulatory Changes:** Monitor privacy law evolution and adapt

### Security Risks
- **Key Management:** Use HSM/KMS for production key storage
- **Proof Verification:** Multiple verification layers and audit trails
- **Attack Surface:** Regular security audits and bug bounty programs

---

*This roadmap is a living document and will be updated based on technical discoveries, user feedback, and market conditions.*