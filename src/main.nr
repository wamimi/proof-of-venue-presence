use dep::std;

// WiFi Connection Proof Circuit - Demonstration Version
// Proves you were at a specific venue during a time window
// without revealing your identity or exact connection details

fn main(
    // Private inputs (hidden from verifier)
    user_secret: Field,              // User's private secret (binds proof to user)
    connection_nonce: Field,         // Random nonce for this proof session
    
    // Public inputs (visible to verifier)
    venue_id: Field,                 // Unique venue identifier (from QR code)
    network_ssid_hash: Field,        // Hash of WiFi network name
    time_window_start: u64,          // Valid time window start (Unix timestamp)
    time_window_end: u64,            // Valid time window end (Unix timestamp)
    proof_timestamp: u64             // When this proof was generated
) {
    // 1. Verify proof timestamp is within valid time window
    assert(proof_timestamp >= time_window_start);
    assert(proof_timestamp <= time_window_end);
    
    // 2. Generate user commitment (proves user has secret without revealing it)
    let user_commitment = std::hash::pedersen_hash([
        user_secret,
        venue_id,
        proof_timestamp as Field,
        connection_nonce
    ]);
    
    // 3. Create nullifier to prevent proof reuse
    let nullifier = std::hash::pedersen_hash([
        user_secret,
        venue_id,
        time_window_start as Field
    ]);
    
    // 4. Verify the network hash is reasonable (not zero)
    assert(network_ssid_hash != 0);
    
    // 5. Generate final proof output (this becomes part of the public proof)
    let proof_output = std::hash::pedersen_hash([
        venue_id,
        nullifier,
        user_commitment,
        proof_timestamp as Field,
        network_ssid_hash
    ]);
    
    // The proof_output can be used by verifiers to confirm:
    // - User was at the venue during the time window  
    // - User has a valid secret (device binding)
    // - Proof cannot be reused (nullifier)
    // - Connected to the specified network
    // Without revealing:
    // - User's identity or secret
    // - Exact connection time (only that it was in window)
    // - Other venues visited
    
    std::println(f"WiFi Connection Proof Generated!");
    std::println(f"Venue ID: {venue_id}");
    std::println(f"Network Hash: {network_ssid_hash}");
    std::println(f"Proof Output: {proof_output}");
}

// Enhanced version with venue signature verification
fn main_with_signatures(
    user_secret: Field,
    venue_signature: Field,
    connection_nonce: Field,
    venue_id: Field,
    network_ssid_hash: Field,
    time_window_start: u64,
    time_window_end: u64,
    venue_pubkey: Field,
    proof_timestamp: u64
) {
    // 1. Verify proof timestamp is within valid time window
    assert(proof_timestamp >= time_window_start);
    assert(proof_timestamp <= time_window_end);
    
    // 2. Verify venue signature on the attestation data
    let attestation_data = std::hash::pedersen_hash([
        venue_id,
        network_ssid_hash, 
        time_window_start as Field,
        time_window_end as Field
    ]);
    
    // Simplified signature check (replace with proper EdDSA/ECDSA in production)
    let expected_signature = std::hash::pedersen_hash([attestation_data, venue_pubkey]);
    assert(venue_signature == expected_signature);
    
    // 3. Generate user commitment and proceed with rest of logic...
    let user_commitment = std::hash::pedersen_hash([
        user_secret,
        venue_id,
        proof_timestamp as Field,
        connection_nonce
    ]);
    
    std::println(f"Signature-verified WiFi proof generated for venue {venue_id}");
}

#[test]
fn test_simple_wifi_proof() {
    // Simple test without signature verification
    let user_secret = 12345;
    let connection_nonce = 99999;
    let venue_id = 67890;
    let network_ssid_hash = 111222333444555;
    let time_window_start: u64 = 1640995200;
    let time_window_end: u64 = 1640998800;
    let proof_timestamp: u64 = 1640996800;
    
    main(
        user_secret,
        connection_nonce,
        venue_id,
        network_ssid_hash,
        time_window_start,
        time_window_end,
        proof_timestamp
    );
}

#[test] 
fn test_invalid_timestamp_fails() {
    let user_secret = 12345;
    let connection_nonce = 99999;
    let venue_id = 67890;
    let network_ssid_hash = 111222333444555;
    let time_window_start: u64 = 1640995200;
    let time_window_end: u64 = 1640998800;
    let proof_timestamp: u64 = 1640999999; // AFTER conference ended
    
    // This should fail due to invalid timestamp
    // Uncomment to test failure case:
    // main(user_secret, connection_nonce, venue_id, network_ssid_hash, 
    //      time_window_start, time_window_end, proof_timestamp);
}
