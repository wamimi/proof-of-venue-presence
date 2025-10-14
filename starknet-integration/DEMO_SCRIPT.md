# WiFiProof Starknet Demo Script

## 🎯 What This Demonstrates

A complete zero-knowledge proof system for venue attendance verification on Starknet:
- User connects to venue's captive WiFi portal
- Generates a ZK proof of attendance WITHOUT revealing which specific network
- Proof is verified on-chain on Starknet devnet
- Preserves privacy while proving location/attendance

## 🏆 Perfect for: Privacy & Identity Track

**Privacy Features:**
- ✅ Proves venue attendance without revealing WiFi MAC address
- ✅ User secret remains private
- ✅ Zero-knowledge proof using Noir circuits
- ✅ On-chain verification on Starknet

## 📋 Prerequisites (Already Installed)

- Node.js / Bun
- Noir 1.0.0-beta.5
- Barretenberg 0.87.4-starknet.1
- Python 3.10+ with virtualenv
- Garaga 0.18.1
- Starknet Foundry (sncast)
- Starknet Devnet 0.4.3

## 🚀 Demo Flow (5-7 minutes)

### Part 1: Show the Circuit (1 min)

```bash
# Show the WiFiProof circuit
cat circuit/src/main.nr
```

**Key Points to Explain:**
- Circuit takes user_secret, venue_id, event_id, nonce from portal
- Proves you have the secret that matches the nonce WITHOUT revealing it
- Time window validation for proof freshness
- Hash comparisons for integrity

### Part 2: Portal Server Running (30 sec)

```bash
# In terminal 1 - Portal should already be running
cd ../portal-server
node server.js
# Shows: Portal server running on http://localhost:3000
```

**Explain:** This simulates a captive WiFi portal that venue operators run.

### Part 3: Build Circuit & Generate Proof (2 min)

```bash
cd starknet-integration

# Build the Noir circuit
make build-circuit

# Execute circuit with test inputs
make exec-circuit

# Generate ZK proof using Barretenberg (ULTRA_HONK with Starknet support)
make prove-circuit

# Show the proof file
ls -lh circuit/target/proof
# ~14KB proof file
```

**Key Points:**
- Ultra Honk proving system optimized for Starknet
- Proof generation takes ~5 seconds
- Proof is succinct (~14KB for complex circuit)

### Part 4: Generate Cairo Verifier (1 min)

```bash
# Generate verification key
make gen-vk

# Use Garaga to generate Cairo smart contract verifier
make gen-verifier

# Show the generated Cairo verifier
ls -lh contracts/verifier/src/
```

**Explain:** Garaga converts the Noir verifier to Cairo so Starknet can verify proofs.

### Part 5: Deploy to Starknet Devnet (2 min)

```bash
# Terminal 2 - Start Starknet devnet
make devnet
# Shows predeployed accounts and runs on port 5050

# Terminal 3 - Deploy verifier contract
# Activate Python environment
source garaga-venv/bin/activate

# Declare the verifier contract
make declare-verifier
# Note the Class Hash

# Deploy the verifier contract
make deploy-verifier
# Note the Contract Address: 0x058ac88555300d527ac9de972c254f880be16d8af08fbb818ba0c7102464cda6
```

**Key Points:**
- Using local Starknet devnet for testing
- Verifier contract is ~1MB+ (complex Cairo code for BN254 elliptic curve ops)
- This contract can verify WiFiProof ZK proofs on-chain

### Part 6: Verify Proof On-Chain (1 min) ⭐ THE MONEY SHOT

```bash
# Generate calldata from proof
make gen-calldata
# Shows 2864 field elements

# Verify the proof on Starknet!
./verify_proof.sh
```

**Expected Output:**
```
Generating calldata...
Calldata generated. Length: 2864 felts

Calling verifier contract...
Success: Call completed

Response: [0x0, 0x7, 0x10932, 0x0, 0x134db3f, ...]
```

**🎉 EXPLAIN THIS IS THE WIN:**
- ✅ Proof was verified ON-CHAIN on Starknet
- ✅ Response contains the public inputs (venue_id, event_id, timestamps)
- ✅ User's privacy is preserved (secret never revealed)
- ✅ Venue attendance is cryptographically proven
- ✅ All computation happens on Starknet network

### Part 7: Show Browser Integration (1 min)

```bash
# Copy artifacts to web app
make artifacts

# Start the web app
make run-app
```

**Navigate to http://localhost:5173**

**Demonstrate:**
1. ✅ Portal integration - Click "Fetch Portal Nonce"
   - Shows it fetches from real portal server
2. ✅ Witness generation works in browser
   - User inputs are processed by Noir circuit
3. 🚧 Proof generation (explain this is work-in-progress)
   - Command-line proving works (as shown above)
   - Browser proving optimization is in the roadmap

**Explain:** This shows the full UX flow we're building toward.

## 🎬 Key Talking Points for Judges

### Privacy & Identity Track Fit:
1. **Privacy-Preserving Proofs**: User proves attendance without revealing sensitive WiFi data
2. **Identity Management**: Each user has a secret that proves their identity without exposing it
3. **Real-World Application**: Captive portals, event ticketing, location-based rewards
4. **Zero-Knowledge**: Complete ZK proof system from circuit to on-chain verification

### Technical Achievements:
1. ✅ Built a complete Noir circuit for WiFiProof
2. ✅ Integrated with Barretenberg proving system (Ultra Honk)
3. ✅ Used Garaga to generate Cairo verifier for Starknet
4. ✅ Successfully deployed and verified proofs on Starknet devnet
5. ✅ Portal server integration for real captive portal simulation
6. ✅ Browser-based witness generation

### Innovation:
- First WiFi captive portal proof system on Starknet
- Bridges physical location (WiFi) with blockchain identity
- Privacy-preserving attendance/location proofs

## 🛣️ Roadmap (Show You're Thinking Ahead)

### Short-term (Next 2 weeks):
- [ ] Optimize in-browser proof generation with UltraHonkBackend
- [ ] Add wallet integration (Argent, Braavos) for transaction signing
- [ ] Deploy to Starknet Sepolia testnet

### Medium-term (Next 1-2 months):
- [ ] Support multiple venue types (conferences, concerts, coworking spaces)
- [ ] Implement proof aggregation for multiple check-ins
- [ ] Create venue operator dashboard

### Long-term Vision:
- [ ] Mainnet deployment
- [ ] Integration with actual captive portal systems (UniFi, Meraki, etc.)
- [ ] NFT badges for attendance milestones
- [ ] Privacy-preserving loyalty/rewards programs

## 📊 Demo Tips

1. **Start with the problem**: "How do you prove you attended an event without revealing personal data?"
2. **Show the working parts**: Focus on what works (on-chain verification)
3. **Be honest about WIP**: "Browser proving is optimization work, core system works"
4. **Emphasize privacy**: This is a PRIVACY & IDENTITY project
5. **Show the receipt**: The successful Starknet transaction is proof it works!

## 🔗 Links to Show

- Noir Circuit: `circuit/src/main.nr`
- Cairo Verifier: `contracts/verifier/src/honk_verifier.cairo`
- Devnet Explorer: http://localhost:5050/ (if available)
- Portal Server: http://localhost:3000/generate-nonce

## ⚡ Quick Commands Reference

```bash
# Terminal 1: Portal Server
cd portal-server && node server.js

# Terminal 2: Starknet Devnet
cd starknet-integration && make devnet

# Terminal 3: Proof Generation & Verification
cd starknet-integration
source garaga-venv/bin/activate
make build-circuit exec-circuit prove-circuit
make gen-vk gen-verifier
make declare-verifier deploy-verifier
./verify_proof.sh

# Terminal 4: Web App
cd starknet-integration && make run-app
```

## 🎯 Final Message to Judges

"WiFiProof demonstrates a complete privacy-preserving proof system on Starknet. While we're still optimizing browser-based proving, the core achievement is clear: we can generate zero-knowledge proofs of venue attendance and verify them on-chain, all while preserving user privacy. This opens up new possibilities for privacy-preserving identity and location-based applications on Starknet."
