# noir_solidity_verifier_demo

This project demonstrates how to build a Noir circuit, generate a Solidity verifier, and deploy it with Foundry for on-chain proof verification.  
The example circuit proves knowledge of a secret `x` that satisfies a public affine (linear) equation:

$A \cdot x + B = C$

without revealing `x`.

---

## 🎯 Objectives

- Understand the role of `Verifier.sol` in verifying Noir proofs on-chain.  
- Explore the Foundry project structure (`Verifier.sol`, `CyprianVerifierApp.sol`, etc.).  
- Inspect the verifier contract name (e.g., `HonkVerifier`).  
- Deploy the verifier contract locally (Anvil) or remotely.  
- Verify a ZK proof both inside Foundry tests and on-chain calls.  

---

## 📝 Circuit

The Noir circuit is located in `circuits/src/main.nr`:

```rust
fn main(x: Field, A: pub Field, B: pub Field, C: pub Field) {
    assert(A * x + B == C);
}
```
- Public inputs: `A, B, C`
- Private input: `x`

Tests are included to check valid/invalid equations.

## 📁 Project Structure

```bash
zkp_linear_check/
│
├── circuits/        # Noir circuit and build outputs
│   ├── src/main.nr
│   └── target/
│
├── js/              # bb.js proof generation
│   └── generate-proof.ts
│
├── contract/        # Foundry project
│   ├── Verifier.sol
│   ├── CyprianVerifierApp.sol
│   ├── script/Deploy.s.sol
│   └── test/VerifyProof.t.sol

```

## ⚙️ Building and Proof Generation
1. Compile Noir circuit:
   
   ```bash
   cd circuits
   nargo compile
   ```
2. Write verification key:
   
   ```bash
   bb write_vk --oracle_hash keccak \
  -b ./target/noir_solidity_verifier_demo.json \
  -o ./target
   ```
3. Generate Solidity verifier:
 ```bash
 bb write_solidity_verifier \
  -k ./target/vk \
  -o ../contract/Verifier.sol
 ```
4. Generate proof and public inputs:
   ```bash
   nargo execute
   bb prove \
  -b ./target/noir_solidity_verifier_demo.json \
  -w ./target/noir_solidity_verifier_demo.gz \
  -o ./target \
  --oracle_hash keccak
   ```
This produces:
 - `target/proof`
 - `target/public-inputs.json`

## 🔍 Inspecting the Verifier
In the Foundry project:

```bash
cd contract
grep -E "contract " Verifier.sol | head -n 5
```

Take note of the verifier contract name (e.g., HonkVerifier).
This is the contract you will deploy.

## 🚀 Deployment with Foundry
Deployment Script (`script/Deploy.s.sol`)

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../Verifier.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();
        HonkVerifier verifier = new HonkVerifier();
        console.log("Verifier deployed at:", address(verifier));
        vm.stopBroadcast();
    }
}
```
### Run Local Node

```bash
anvil
```
### Deploy Contract

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

## ✅ Verification On-Chain
Once deployed, call the verifier with the generated proof + public inputs.

Example Foundry Test (`test/VerifyProof.t.sol`)

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../Verifier.sol"; // HonkVerifier

contract VerifyProofTest is Test {
    HonkVerifier public verifier;
    bytes32 ;

    function setUp() public {
        verifier = new HonkVerifier();
        publicInputs[0] = bytes32(uint256(3));
        publicInputs[1] = bytes32(uint256(4));
        publicInputs[2] = bytes32(uint256(5));
        publicInputs[3] = bytes32(uint256(19));
    }

    function testVerifyProof() public {
        bytes memory proof = vm.readFileBinary("../circuits/target/proof");
        bool result = verifier.verify(proof, publicInputs);
        assert(result);
    }
}
```

Run with:
```bash
forge test -vvv
```
## 📌 Troubleshooting
- Contract too large (>24 KB):
```toml
# foundry.toml
optimizer = true
optimizer_runs = 200
# via_ir = true
```
Then rebuild with:

```bash
forge clean && forge build --sizes
```
- Sender/private key issues:
  Use Anvil’s default accounts:
  ```bash
  source .env
  forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
  ```
  ## 🎓 Outcomes
  By the end of this workflow you should be able to:
  - Compile Noir circuits and generate Solidity verifiers.
  - Deploy verifier contracts on Anvil/EVM with Foundry.
  - Verify proofs using both unit tests (`forge test)` and direct on-chain calls.
  - Understand how to connect Noir → proof generation → Solidity verification end-to-end.

   
