# WiFiProof Starknet Integration - Hackathon Submission

## Inspiration

The inspiration for WiFiProof came from a simple, universal observation at every crypto conference and hackathon: the first thing everyone does is ask for the **WiFi password**. This shared behavior is a powerful, yet overlooked, signal of physical presence. We realized this common act of connecting to a local network could be transformed into a secure, private, and unforgeable cryptographic proof of attendance, solving a problem that plagues event-based rewards in the Web3 space.

For this Starknet integration, we were specifically inspired by Starknet's vision of scalable, privacy-preserving computation. We saw an opportunity to bring zero-knowledge proofs of physical attendance directly on-chain to Starknet, where they could be verified efficiently and integrated into the broader Cairo ecosystem.

## What it does

WiFiProof Starknet is a complete end-to-end system that creates **privacy-preserving proof of physical venue attendance verified on Starknet**. It allows users to cryptographically prove they were at a specific event during a specific time window, without revealing their personal identity or connection details.

### System Architecture

The system works in three stages:

1. **Portal Interaction**: Users connect to a venue's WiFi and receive a cryptographically signed, single-use nonce from the portal server

2. **Proof Generation**: Users generate a zero-knowledge proof using a Noir circuit, proving they possess the portal nonce and a valid user secret without revealing either

3. **On-Chain Verification**: The proof is verified on Starknet by a Cairo verifier contract, providing an immutable, publicly auditable record

### Cryptographic Properties

The system maintains privacy by hiding:
- User secret $s \in \mathbb{F}_p$ (private device binding)
- Connection nonce $n \in \mathbb{F}_p$ (session randomness)
- Portal nonce and signature values

While publicly verifying:
- Venue identifier $v \in \mathbb{F}_p$
- Event identifier $e \in \mathbb{F}_p$
- Time window $[t_{start}, t_{end}]$ with proof timestamp $t_{proof}$ where $t_{start} \leq t_{proof} \leq t_{end}$
- Portal nonce hash $H_{nonce}$ and signature hash $H_{sig}$

This enables projects to confidently distribute rewards like airdrops or grant exclusive access only to genuine attendees, preventing fraud from remote participants or shared credentials.

## How we built it

We built WiFiProof Starknet using a cutting-edge ZK stack specifically optimized for Starknet:

### ZK Circuit (Noir)

The core circuit implements five cryptographic commitments using Pedersen hashing:

**User Commitment**: Binds proof to user without revealing identity
$$C_{user} = H_{Pedersen}(s, v, t_{proof}, n)$$

**Nullifier**: Prevents proof reuse while maintaining privacy
$$N = H_{Pedersen}(s, v, e, t_{start}, H_{nonce})$$

**Portal Binding**: Ties proof to specific venue interaction
$$B_{portal} = H_{Pedersen}(H_{nonce}, H_{sig}, v, e)$$

**Proof Output**: Final commitment proving all constraints
$$O_{proof} = H_{Pedersen}(v, e, N, C_{user}, B_{portal}, t_{proof})$$

The circuit constraints ensure:
- $t_{start} \leq t_{proof} \leq t_{end}$ (time window validation)
- $H_{nonce} \neq 0 \land H_{sig} \neq 0$ (portal data validity)
- All commitments computed correctly

### Proving System (Barretenberg Ultra Honk with Starknet Flavor)

- Uses **Barretenberg 0.87.4-starknet.1** backend with Starknet-specific optimizations
- Generates Ultra Honk proofs with **Poseidon hash** instead of standard Keccak256
- Poseidon is a ZK-friendly hash designed for efficient verification in Cairo
- Works over the BN254 elliptic curve: $y^2 = x^3 + 3$
- Proof generation takes approximately 5 seconds on command-line

The Ultra Honk proving system uses polynomial commitments on BN254:
$$\text{Commit}(f(X)) = [f(\tau)]_1 \in \mathbb{G}_1$$

where $\tau$ is the trusted setup parameter.

### Cairo Verifier Generation (Garaga)

Used **Garaga 0.18.1** to automatically convert the Barretenberg verifier to Cairo 2.x:

- Generates a native Cairo contract that verifies Ultra Honk proofs on Starknet
- The verifier accepts calldata of size $n = 2864$ field elements (felts)
- Calldata structure:
  - BN254 elliptic curve polynomial commitments $(x, y) \in \mathbb{F}_p^2$
  - Evaluation points and openings
  - Public inputs: $(v, e, t_{start}, t_{end}, t_{proof}, H_{nonce}, H_{sig})$
  - Fiat-Shamir transcript elements for non-interactive verification

The Cairo verifier performs pairing checks in $\mathbb{F}_p$ where $p$ is Starknet's prime field:
$$p = 2^{251} + 17 \times 2^{192} + 1$$

### Starknet Deployment

- Deployed verifier contract to Starknet devnet using **Starknet Foundry (sncast)**
- Contract class hash: `0x5e9e0c845bd72c71f8e509833f049e0d66a108d2d696b4c1142d9835f2f32f8`
- Contract address: `0x058ac88555300d527ac9de972c254f880be16d8af08fbb818ba0c7102464cda6`
- Successfully verified proofs on-chain with cryptographic certainty

### Web Application (React + TypeScript)

- Built with React and Vite for fast development
- Integrated **NoirJS 1.0.0-beta.5** for in-browser circuit execution
- Witness generation works perfectly in browser
- Portal nonce fetching via REST API
- Proof generation optimized for command-line (browser optimization in progress)

### Portal Server (Node.js)

- Lightweight server intended for venue's local network
- Issues ECDSA-signed, single-use nonces
- REST API endpoint for nonce requests
- Prevents remote proof generation

## Challenges we ran into

### Challenge 1: Starknet-Specific Proving System

The biggest technical challenge was configuring the entire toolchain to use the **Starknet flavor of Ultra Honk**. Standard Barretenberg uses Keccak256 hashing, which is expensive to verify in Cairo. We needed to:

- Install the specific `0.87.4-starknet.1` version of Barretenberg
- Use `bb prove_ultra_starknet_honk` instead of standard `prove_ultra_honk`
- Pass the `{ starknet: true }` option in NoirJS
- Ensure Garaga was configured for `ultra_starknet_honk` system

This required deep understanding of the Barretenberg proving system and Starknet's field arithmetic. The key insight was that Poseidon hash operates efficiently in $\mathbb{F}_p$ (Starknet's native field), whereas Keccak256 requires expensive bit operations in Cairo.

### Challenge 2: Garaga Integration and Calldata Generation

Converting a Barretenberg verifier to Cairo was complex:

- Understanding how Garaga maps BN254 curve operations to Cairo
- Generating the correct 2864-felt calldata format
- Debugging calldata serialization issues (initially forgot `--public-inputs` flag)
- Ensuring the Cairo verifier correctly handles polynomial commitments

The challenge was understanding the calldata structure. Each BN254 point $(x, y)$ must be serialized as two field elements in $\mathbb{F}_p$, requiring careful handling of field conversions between BN254's base field and Starknet's field.

### Challenge 3: Starknet Devnet Configuration

We encountered multiple configuration issues:

- sncast profile configuration with chain IDs vs network names
- Understanding that devnet defaults to `alpha-sepolia` chain ID
- Organizing `accounts.json` by chain ID rather than network name
- Resolving "Account not found" errors during contract declaration

The key fix was realizing that sncast uses the chain ID (`alpha-sepolia`) not the network name (`devnet`) for account lookup in `accounts.json`.

### Challenge 4: Browser Proof Generation

While witness generation works perfectly in-browser, full proof generation with Ultra Honk currently hangs due to WebAssembly threading constraints:

- SharedArrayBuffer limitations in browser environments
- Multi-threaded WASM requiring specific HTTP headers
- Performance differences between browser and native execution

We successfully implemented command-line proving as the primary method, with browser optimization as future work.

## Accomplishments that we're proud of

### Complete End-to-End Starknet ZK System

We built a fully functional system that goes from a WiFi portal interaction to verified proof on Starknet. This isn't a mock-up or simulation - it's a real, working implementation that generates actual proofs and verifies them on-chain.

### Successful Garaga Integration

We successfully integrated Garaga to automatically convert Barretenberg verifiers to Cairo. The generated verifier contract works flawlessly, accepting $n = 2864$ felts of calldata and returning verified public inputs. This demonstrates the power of Garaga as a bridge between different ZK ecosystems.

### Working On-Chain Verification

Our biggest accomplishment is achieving successful on-chain proof verification on Starknet. When you run `./verify_proof.sh`, you see:

```bash
Calldata generated. Length: 2864 felts
Calling verifier contract...
Success: Call completed
Response: [0x0, 0x7, 0x10932, 0xe4e6c8ae, ...]
```

This proves the entire system works:
$$\text{Noir Circuit} \rightarrow \text{Ultra Honk Proof} \rightarrow \text{Cairo Verifier} \rightarrow \text{Starknet Verification}$$

### Efficient Circuit Design

The Noir circuit uses efficient Pedersen hashing (native to Starknet) and implements:

- User commitment: $C_{user} = H(s, v, t_{proof}, n)$
- Nullifier: $N = H(s, v, e, t_{start}, H_{nonce})$ (prevents double-spending)
- Portal binding: $B_{portal} = H(H_{nonce}, H_{sig}, v, e)$ (ties proof to venue)
- Time window validation: $t_{start} \leq t_{proof} \leq t_{end}$
- All without revealing private inputs $(s, n)$

### Developer-Friendly Workflow

We created a complete developer experience with:

- Makefile automation for all steps
- Comprehensive documentation (README, demo scripts, app documentation)
- Troubleshooting guides for common issues
- Clear separation of concerns (circuit, contracts, app)

### Transparent About Limitations

We're proud of being honest about what works (command-line proving, on-chain verification) and what's in progress (browser proving optimization). This transparency shows maturity and realistic project planning.

## What we learned

### Lesson 1: Starknet Has a Unique ZK Ecosystem

We learned that Starknet's Cairo VM requires specific proof formats. You can't just use any ZK proof - you need Starknet-compatible proving systems. The Barretenberg Starknet flavor with Poseidon hashing is crucial for efficient verification because:

- Poseidon operates in $\mathbb{F}_p$ (Starknet's native field)
- Keccak256 requires expensive bit operations in Cairo
- Field arithmetic in Cairo is optimized for $p = 2^{251} + 17 \times 2^{192} + 1$

This taught us the importance of choosing cryptographic primitives aligned with your target chain's architecture.

### Lesson 2: Garaga is a Game-Changer

Garaga transforms what would be weeks of manual Cairo development into a single command:

```bash
garaga gen --system ultra_starknet_honk --vk circuit/target/vk
```

We learned that:
- Automatic verifier generation is incredibly powerful
- The tool handles complex elliptic curve operations correctly
- Understanding calldata format is essential for debugging
- Version compatibility (Garaga 0.18.1 with Barretenberg 0.87.4-starknet.1) matters

### Lesson 3: Configuration is 50% of Integration Work

More time was spent on configuration than coding:

- Tool versions must match exactly
- Chain IDs vs network names matter
- Profile-based configuration in `snfoundry.toml`
- Python virtual environments for Garaga
- Account management in `accounts.json`

This taught us that successful integration requires deep understanding of each tool's configuration model.

### Lesson 4: Browser Proving Has Performance Trade-offs

We learned that browser-based ZK proving faces constraints:

- SharedArrayBuffer requires specific HTTP headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`
- WebAssembly threading issues in different browsers
- Performance differences between browser and native (native is ~10x faster)
- Need for progressive enhancement (browser witness, CLI proof)

### Lesson 5: On-Chain Verification is the North Star

While we encountered many obstacles, keeping focus on on-chain verification helped us prioritize. Browser proving can be optimized later, but proving the system works end-to-end on Starknet was the critical milestone.

## What's next for WiFiProof Starknet

### Immediate Next Steps (Post-Hackathon)

#### 1. Browser Proof Generation Optimization

- Configure HTTP headers for SharedArrayBuffer support:
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- Test alternative WASM threading approaches
- Consider proof compression techniques
- Benchmark performance across browsers

#### 2. Starknet Sepolia Testnet Deployment

- Deploy verifier contract to public testnet
- Create public demo environment
- Test with real wallet connections (Argent, Braavos)
- Gather community feedback

#### 3. Wallet Integration

- Integrate Starknet wallet providers (starknet.js)
- Add transaction signing for proof submission
- Implement account abstraction features
- Enable proof verification from user wallets

### Medium-Term Roadmap

#### 4. Multiple Venue Support

- Support multiple verifier contracts per deployment
- Venue registry contract for discovery
- Event organizer dashboard
- Batch proof verification for $k$ proofs: verify $O(k)$ instead of $O(k \cdot n)$

#### 5. Proof Aggregation

- Aggregate $k$ attendance proofs into one using proof composition
- Reduce on-chain verification costs from $O(k)$ to $O(1)$
- Enable "attended $n$ events" proofs with single verification
- Implement recursive proof compression

#### 6. Starknet-Specific Features

- Account abstraction for gasless proofs
- Integration with Starknet identity protocols
- Cairo-native portal server
- StarknetID integration for privacy-preserving identity

### Long-Term Vision

#### 7. Production Deployment

- Mainnet deployment with security audits
- Real captive portal integration
- Venue operator onboarding
- Partnership with event platforms

#### 8. Enhanced Security Model

The roadmap includes a three-layer security model:

**Layer 1: Physical Presence Verification**
- Single-use codes distributed at physical check-in
- Prevents remote proof generation
- QR code integration at venue entrance

**Layer 2: Device Binding**
- WebAuthn/Passkeys integration
- Hardware secure enclaves (TPM, Secure Enclave)
- Non-extractable private keys
- Biometric authentication

**Layer 3: Human Uniqueness**
- Integration with decentralized identity (WorldID, BrightID)
- Sybil resistance: one proof per verified human
- Privacy-preserving uniqueness checks using ZK proofs

Combined security: $P(\text{forge}) < P(\text{physical bypass}) \times P(\text{device compromise}) \times P(\text{identity fraud})$

#### 9. Ecosystem Integration

- NFT minting for attendance proofs
- Token gating based on venue attendance
- Reputation systems using proof history $R(u) = \sum_{i=1}^{n} w_i \cdot p_i$ where $p_i$ are attendance proofs
- Cross-chain proof verification via Starknet bridges

#### 10. Starknet Privacy Layer

- Position WiFiProof as privacy infrastructure for Starknet
- Enable other projects to build on our verifier contracts
- Create SDK for attendance-based applications
- Contribute to Starknet's privacy primitives

### Why This Matters for Starknet

This project demonstrates Starknet's capability as a platform for real-world privacy applications. By bringing physical-world proofs on-chain, we're showing that Starknet can handle complex ZK verification efficiently and cost-effectively.

The integration proves that:
- Starknet can verify complex ZK proofs (Ultra Honk with BN254 pairings)
- Garaga enables seamless verifier generation
- Cairo contracts can handle large calldata ($n = 2864$ felts)
- The ecosystem is mature enough for production applications

WiFiProof could become foundational infrastructure for privacy-preserving identity and reputation on Starknet.

## Hackathon Track Alignment

### Privacy & Identity Track

WiFiProof Starknet is a perfect fit for the Privacy & Identity track because:

**1. Privacy-Preserving by Design**

Users prove attendance without revealing:
- User secret $s \in \mathbb{F}_p$ (never leaves device)
- Connection nonce $n \in \mathbb{F}_p$ (session randomness)
- Portal nonce and signature values
- Specific connection details or timing

**2. Cryptographic Identity**

User commitments bind proofs to individuals without central authority:
$$C_{user} = H_{Pedersen}(s, v, t_{proof}, n)$$

This creates a privacy-preserving identity system where users control their secrets.

**3. On-Chain Verification**

Starknet provides:
- Immutable proof records (cannot be deleted or modified)
- Publicly auditable verification (anyone can verify the contract logic)
- Efficient verification in $O(1)$ time regardless of proof complexity
- Censorship-resistant (no central authority can block verification)

**4. Real-World Identity Bridge**

Bridges physical presence (WiFi connection) to cryptographic identity:
- Physical: User connects to venue WiFi and receives portal nonce
- Cryptographic: User generates ZK proof binding physical presence to secret
- On-Chain: Starknet verifies and records the attendance proof

**5. Nullifiers for Privacy**

Prevents proof reuse while maintaining privacy:
$$N = H_{Pedersen}(s, v, e, t_{start}, H_{nonce})$$

The nullifier $N$ is unique per (user, venue, event, time window) tuple, preventing double-counting while keeping the user secret $s$ private.

### Why This Deserves to Win

This is not just a demo - it's a **working implementation of privacy-preserving identity verification on Starknet** that:

- Successfully generates and verifies real ZK proofs on-chain
- Integrates cutting-edge tools (Noir, Barretenberg, Garaga, Cairo)
- Demonstrates Starknet's capability for real-world privacy applications
- Provides complete documentation and developer experience
- Has a clear roadmap from MVP to production
- Solves a real problem (Sybil-resistant attendance verification)
- Shows technical depth in cryptography, ZK systems, and Starknet architecture

The project bridges three critical domains: **physical presence**, **zero-knowledge cryptography**, and **Starknet smart contracts** - making it a compelling demonstration of what's possible in the Privacy & Identity space on Starknet.
