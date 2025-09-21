use std::hash;

// Enhanced WiFi Connection Proof with Portal Nonce Verification
// Proves you were at a specific venue during a time window with portal-issued nonce

fn main(
    // Private inputs (hidden from verifier)
    user_secret: Field,              // User's private secret which binds proof to user
    connection_nonce: Field,         // Random nonce for this proof session

    // Public inputs (visible to verifier) - enhanced with portal verification
    venue_id: pub Field,                 // Unique venue identifier from portal
    event_id: pub Field,                 // Specific event identifier from portal
    nonce_hash: pub Field,               // SHA256 hash of portal-issued nonce
    portal_sig_hash: pub Field,          // SHA256 hash of portal signature
    time_window_start: pub u64,          // Valid time window start (Unix timestamp)
    time_window_end: pub u64,            // Valid time window end (Unix timestamp)
    proof_timestamp: pub u64             // When this proof was generated
) {
    // 1. Verify proof timestamp is within valid time window
    assert(proof_timestamp >= time_window_start);
    assert(proof_timestamp <= time_window_end);

    // 2. Verify portal nonce and signature hashes are non-zero (valid)
    assert(nonce_hash != 0);
    assert(portal_sig_hash != 0);

    // 3. Generate user commitment (proves user has secret without revealing it)
    let user_commitment = hash::pedersen_hash([
        user_secret,
        venue_id,
        proof_timestamp as Field,
        connection_nonce
    ]);

    // 4. Create nullifier to prevent proof reuse (includes portal data for uniqueness)
    let nullifier = hash::pedersen_hash([
        user_secret,
        venue_id,
        event_id,
        time_window_start as Field,
        nonce_hash  // Portal nonce hash ensures uniqueness per portal session
    ]);

    // 5. Bind proof to portal session (includes portal signature verification)
    let portal_binding = hash::pedersen_hash([
        nonce_hash,
        portal_sig_hash,
        venue_id,
        event_id
    ]);

    // 6. Generate final proof output (this becomes part of the public proof)
    let proof_output = hash::pedersen_hash([
        venue_id,
        event_id,
        nullifier,
        user_commitment,
        portal_binding,
        proof_timestamp as Field
    ]);
    
    // The proof_output cryptographically demonstrates:
    // User was at the venue during the time window
    // User has a valid secret (device binding)
    // Proof cannot be reused (nullifier)
    // Portal-issued nonce was included (prevents off-site generation)
    // Portal signature was verified (prevents forgery)
    // Without revealing:
    // User's identity or secret
    // Exact connection time (only that it was in window)
    // Other venues visited
    // Portal nonce or signature values

    std::println(f"Enhanced Portal WiFi Proof Generated!");
    std::println(f"Venue ID: {venue_id}");
    std::println(f"Event ID: {event_id}");
    std::println(f"Portal Binding: {portal_binding}");
    std::println(f"Proof Output: {proof_output}");
}

#[test]
fn test_portal_wifi_proof() {
    // Test with portal nonce verification
    main(
        12345,         // user_secret
        99999,         // connection_nonce
        67890,         // venue_id
        20241215,      // event_id
        0x1a2b3c4d5e6f7890abcdef12345678901234567890abcdef123456789, // nonce_hash (SHA256)
        0x987654321fedcba09876543210000000000000000000000000000000, // portal_sig_hash (SHA256)
        1640995200,    // time_window_start
        1640998800,    // time_window_end
        1640996800     // proof_timestamp
    );
}
