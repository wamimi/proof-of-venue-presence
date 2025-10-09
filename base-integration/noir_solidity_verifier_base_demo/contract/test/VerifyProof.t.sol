// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../Verifier.sol"; // HonkVerifier

contract VerifyProofTest is Test {
    HonkVerifier public verifier;
    bytes32[] public publicInputs = new bytes32[](7); // WiFiProof has 7 public inputs

    function setUp() public {
        // WiFiProof verifier deployed on Base Sepolia
        // Address: https://sepolia.basescan.org/address/0x0152036D5d42Ea20f88A32423Ee5C186E435bF51
        verifier = HonkVerifier(0x0152036D5d42Ea20f88A32423Ee5C186E435bF51);

        // WiFiProof public inputs (matching actual circuit output from public-inputs file)
        publicInputs[0] = bytes32(uint256(67890));                                                      // venue_id
        publicInputs[1] = bytes32(uint256(20250921));                                                   // event_id
        publicInputs[2] = 0x0000000000030046030f26f462d7ac21a27eb9d53fff233c7acd12d87e96aff2; // nonce_hash (decimal string converted to Field)
        publicInputs[3] = 0x00000000001802301c24dc7603f86d1d445f746905d09b7af3b84aea59bdbb34; // portal_sig_hash (decimal string converted to Field)
        publicInputs[4] = bytes32(uint256(1726936800));                                                 // time_window_start
        publicInputs[5] = bytes32(uint256(1726944000));                                                 // time_window_end
        publicInputs[6] = bytes32(uint256(1726936800));                                                 // proof_timestamp
    }

    function testVerifyProof() public {
        bytes memory proof = vm.readFileBinary("../circuits/target/proof");
        bool result = verifier.verify(proof, publicInputs);
        assert(result);
    }
}
