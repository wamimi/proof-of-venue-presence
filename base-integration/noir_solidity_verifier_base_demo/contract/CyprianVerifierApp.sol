// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Author: Dr. Cyprian Sakwa (Original), Adapted for WiFiProof
// Date: 2025-07-04 (Original), Updated: 2025-10-08
// Description: WiFiProof verification wrapper for on-chain venue attendance verification
// License: Open-source under MIT License.

import "./Verifier.sol";

contract CyprianVerifierApp {
    HonkVerifier public verifier;
    uint256 public verifiedCount;

    event ProofVerified(address indexed by, uint256 newCount);

    constructor(HonkVerifier _verifier) {
        verifier = _verifier;
    }

    function getVerifiedCount() public view returns (uint256) {
        return verifiedCount;
    }

    function verifyEqual(bytes calldata proof, bytes32[] calldata publicInputs) public returns (bool) {
        // WiFiProof circuit has 7 public inputs:
        // 1. venue_id          - Venue identifier
        // 2. event_id          - Event identifier
        // 3. nonce_hash        - SHA256 hash of portal nonce
        // 4. portal_sig_hash   - SHA256 hash of portal signature
        // 5. time_window_start - Valid attendance window start (Unix timestamp)
        // 6. time_window_end   - Valid attendance window end (Unix timestamp)
        // 7. proof_timestamp   - When proof was generated (Unix timestamp)
        require(publicInputs.length == 7, "Expected 7 public inputs: WiFiProof format");

        bool proofResult = verifier.verify(proof, publicInputs);
        require(proofResult, "WiFiProof verification failed");

        verifiedCount++;
        emit ProofVerified(msg.sender, verifiedCount);
        return proofResult;
    }
}