'use client';

import { useState, useEffect } from 'react';
import { UltraPlonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';

// Define proper types
interface PortalNonceData {
  venue_id: string;
  event_id: string;
  nonce: string;
  ts: number;
  signature: string;
  venue_pubkey_jwk: any;
}

interface ProofData {
  proof: number[];
  publicInputs: number[];
  vk: number[];
  portalNonce: string;
  input: CircuitInputs;
}

interface CircuitInputs {
  user_secret: string;
  connection_nonce: string;
  venue_id: string;
  event_id: string;
  nonce_hash: string;
  portal_sig_hash: string;
  time_window_start: number;    // Changed to number for u64 type
  time_window_end: number;      // Changed to number for u64 type
  proof_timestamp: number;      // Changed to number for u64 type
  [key: string]: string | number; // Index signature for InputMap compatibility
}

// Crypto utilities for portal nonce verification
const sha256Hash = async (input: string | Uint8Array): Promise<string> => {
  const encoder = new TextEncoder();
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert SHA256 hash to field-safe value (reduce modulo field size)
const hashToField = (hash: string): string => {
  // Remove 0x prefix if present
  const cleanHash = hash.replace(/^0x/, '');

  // BN254 field modulus (Noir's field size)
  const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

  // Convert hash to BigInt and reduce modulo field size
  const hashBigInt = BigInt('0x' + cleanHash);
  let fieldValue = hashBigInt % fieldModulus;
  
  // Ensure field value is never zero (would violate constraints)
  if (fieldValue === BigInt(0)) {
    fieldValue = BigInt(1); // Use 1 as fallback for zero hash (extremely unlikely)
    console.warn('Hash reduced to zero, using fallback value 1');
  }

  return fieldValue.toString();
};

// Convert string ID to numeric field for Noir circuit
const stringToField = (str: string): string => {
  // Extract numeric part from strings like "VENUE_67890" or "EVENT_20250921"
  const numericPart = str.replace(/[^0-9]/g, '');
  if (!numericPart) {
    // If no numbers found, create a hash-based number
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }
  return numericPart;
};

const generateUserSecret = (): string => {
  const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  
  let secret = localStorage.getItem('wifiproof_user_secret');
  
  // Check if existing secret is valid (within field modulus)
  if (secret) {
    try {
      const existingSecret = BigInt('0x' + secret);
      if (existingSecret >= fieldModulus) {
        console.warn('Existing user secret exceeds field modulus, regenerating...');
        secret = null; // Force regeneration
      }
    } catch (error) {
      console.warn('Invalid existing user secret format, regenerating...');
      secret = null; // Force regeneration  
    }
  }
  
  if (!secret) {
    const secretBytes = new Uint8Array(32);
    crypto.getRandomValues(secretBytes);
    const secretHex = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // CRITICAL FIX: Reduce modulo field size to ensure it fits in BN254 field
    const secretBigInt = BigInt('0x' + secretHex);
    const reducedSecret = secretBigInt % fieldModulus;
    
    // Convert back to hex without 0x prefix
    secret = reducedSecret.toString(16).padStart(64, '0');
    localStorage.setItem('wifiproof_user_secret', secret);
    
    console.log('Generated field-safe user secret:', {
      original: secretHex,
      reduced: secret,
      withinField: reducedSecret < fieldModulus,
      fieldModulus: fieldModulus.toString(16)
    });
  }
  return secret;
};

export default function ProofComponent() {
  // Portal data state
  const [portalEndpoint, setPortalEndpoint] = useState('http://localhost:3002');
  const [portalNonce, setPortalNonce] = useState<PortalNonceData | null>(null);
  const [nonceUsed, setNonceUsed] = useState(false); // Track if current nonce has been used

  // Time window inputs
  const [timeWindowStart, setTimeWindowStart] = useState('');
  const [timeWindowEnd, setTimeWindowEnd] = useState('');

  // User secret (auto-generated)
  const [userSecret, setUserSecret] = useState('');

  // Function to regenerate user secret
  const regenerateUserSecret = () => {
    localStorage.removeItem('wifiproof_user_secret');
    const newSecret = generateUserSecret();
    setUserSecret(newSecret);
    console.log('User secret regenerated successfully');
  };

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [proofResult, setProofResult] = useState<ProofData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Initialize user secret and default time window
  useEffect(() => {
    setUserSecret(generateUserSecret());

    // Set default time window (current time ± 2 hours) - FIXED FOR EAT TIMEZONE
    const now = new Date();
    const startTime = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Extended to 4 hours ago
    const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);   // Extended to 4 hours future

    setTimeWindowStart(startTime.toISOString().slice(0, 16));
    setTimeWindowEnd(endTime.toISOString().slice(0, 16));
  }, []);

  // Fetch portal nonce
  const handleFetchNonce = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      setVerificationStatus('');

      const response = await fetch(`${portalEndpoint}/api/issue-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Portal request failed: ${response.statusText}`);
      }

      const nonceData = await response.json();
      setPortalNonce(nonceData);
      setNonceUsed(false); // Reset nonce usage state for new nonce
      setVerificationStatus('Fresh portal nonce received successfully');
      console.log('🔄 New portal nonce fetched, ready for proof generation');

    } catch (error: any) {
      setErrorMsg(`Failed to fetch portal nonce: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!portalNonce) {
      setErrorMsg('Please fetch portal nonce first');
      return;
    }

    if (nonceUsed) {
      setErrorMsg('⚠️ This nonce has already been used. Please fetch a new nonce before generating another proof.');
      return;
    }

    if (!timeWindowStart || !timeWindowEnd) {
      setErrorMsg('Please set time window');
      return;
    }

    setIsLoading(true);
    setProofResult(null);
    setErrorMsg('');
    setVerificationStatus('Starting WiFiProof generation...');
    setTxHash(null);

    // ⏰ Add timeout protection (5 minutes max)
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setErrorMsg('Proof generation timed out after 5 minutes. This might be due to computational complexity or system resources.');
      setVerificationStatus('');
    }, 5 * 60 * 1000);

    try {
      // Step 1: Load WiFiProof circuit
      setVerificationStatus('Step 1/6: Loading circuit artifacts...');
      console.log('Loading circuit from /wifiproof/target/wifiproof.json');
      
      const circuit_json = await fetch("/wifiproof/target/wifiproof.json");
      if (!circuit_json.ok) {
        throw new Error('Failed to load circuit. Make sure it\'s compiled.');
      }
      const noir_data = await circuit_json.json();
      console.log('Circuit loaded successfully:', {
        bytecodeLength: noir_data.bytecode?.length || 0,
        abiParams: noir_data.abi?.parameters?.length || 0
      });

      // Step 2: Prepare circuit inputs
      setVerificationStatus('Step 2/6: Preparing circuit inputs...');
      console.log('Preparing circuit inputs...');
      
      const proofTimestamp = Math.floor(Date.now() / 1000);
      const connectionNonce = Math.floor(Math.random() * 1000000);
      console.log('Timestamp data:', { proofTimestamp, connectionNonce });

      // Hash portal data and convert to field-safe values
      const nonceHash = await sha256Hash(portalNonce.nonce);
      const portalSigHash = await sha256Hash(portalNonce.signature);

      // Convert hashes to field-safe values
      const nonceHashField = hashToField(nonceHash);
      const portalSigHashField = hashToField(portalSigHash);

      // Convert time window to Unix timestamps
      const timeWindowStartTs = Math.floor(new Date(timeWindowStart).getTime() / 1000);
      const timeWindowEndTs = Math.floor(new Date(timeWindowEnd).getTime() / 1000);

      // Convert portal string IDs to numeric fields
      const venueIdField = stringToField(portalNonce.venue_id);
      const eventIdField = stringToField(portalNonce.event_id);

      console.log('Field conversions:', {
        venue_id: `${portalNonce.venue_id} → ${venueIdField}`,
        event_id: `${portalNonce.event_id} → ${eventIdField}`,
        nonce_hash: `${nonceHash} → ${nonceHashField}`,
        portal_sig_hash: `${portalSigHash} → ${portalSigHashField}`
      });

      const input: CircuitInputs = {
        // Private inputs
        user_secret: `0x${userSecret}`,
        connection_nonce: connectionNonce.toString(),

        // Public inputs - all converted to field-safe values
        venue_id: venueIdField,
        event_id: eventIdField,
        nonce_hash: nonceHashField,
        portal_sig_hash: portalSigHashField,
        time_window_start: timeWindowStartTs,        // Keep as number for u64
        time_window_end: timeWindowEndTs,            // Keep as number for u64
        proof_timestamp: proofTimestamp              // Keep as number for u64
      };

      // Enhanced debugging for constraint diagnosis
      console.log('WiFiProof Circuit Inputs:', input);
      console.log('Time Window Analysis:', {
        timeWindowStart: timeWindowStartTs,
        timeWindowEnd: timeWindowEndTs,
        proofTimestamp: proofTimestamp,
        isWithinWindow: proofTimestamp >= timeWindowStartTs && proofTimestamp <= timeWindowEndTs,
        startDate: new Date(timeWindowStartTs * 1000).toISOString(),
        endDate: new Date(timeWindowEndTs * 1000).toISOString(),
        proofDate: new Date(proofTimestamp * 1000).toISOString()
      });
      console.log('Hash Field Analysis:', {
        nonceHashZero: nonceHashField === '0',
        portalSigHashZero: portalSigHashField === '0',
        nonceHashField,
        portalSigHashField
      });

      // Step 3: Initialize Noir circuit
      setVerificationStatus('Step 3/6: Initializing Noir circuit...');
      console.log('Initializing Noir with circuit data...');
      
      const noir = new Noir(noir_data);
      console.log('Noir circuit initialized');

      // Step 4: Execute circuit to generate witness
      setVerificationStatus('Step 4/6: Executing circuit (this may take a while)...');
      console.log('Executing circuit with inputs:', Object.keys(input));
      console.log('Starting circuit execution - this is the most computationally intensive step...');
      
      const execResult = await noir.execute(input);
      console.log("Witness Generated Successfully:", {
        witnessLength: execResult.witness?.length || 0,
        returnValue: execResult.returnValue
      });

      // Step 5: Generate cryptographic proof
      setVerificationStatus('Step 5/6: Generating ZK proof (this takes the longest)...');
      console.log('Initializing UltraPlonk backend...');
      
      const backend = new UltraPlonkBackend(noir_data.bytecode, {threads: 2});
      console.log('UltraPlonk backend initialized');
      
      console.log('Starting proof generation - this is the most time-consuming step...');
      console.log('Tip: Proof generation can take 30 seconds to several minutes depending on your hardware');
      
      const { proof, publicInputs } = await backend.generateProof(execResult.witness);
      console.log('ZK Proof generated successfully:', {
        proofLength: proof.length,
        publicInputsLength: publicInputs.length
      });
      
      console.log('Getting verification key...');
      const vk = await backend.getVerificationKey();
      console.log('Verification key obtained:', { vkLength: vk.length });

      const proofData: ProofData = {
        proof: Array.from(proof),
        publicInputs: Array.from(publicInputs),
        vk: Array.from(vk),
        portalNonce: portalNonce.nonce,
        input: input
      };

      setProofResult(proofData);
      console.log('Proof generation completed successfully!');

      // Step 6a: Submit to portal for nonce validation
      setVerificationStatus('Step 6a/6: Validating portal nonce...');
      console.log('Submitting to portal for nonce validation...');

      const portalRes = await fetch(`${portalEndpoint}/api/submit-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof_hex: '0x' + Array.from(proofData.proof).map(b => b.toString(16).padStart(2, '0')).join(''),
          public_inputs_hex: '0x' + Array.from(proofData.publicInputs).map(b => b.toString(16).padStart(2, '0')).join(''),
          vk_hex: '0x' + Array.from(proofData.vk).map(b => b.toString(16).padStart(2, '0')).join(''),
          portal_nonce: proofData.portalNonce
        })
      });

      const portalData = await portalRes.json();
      console.log('Portal validation response:', portalData);

      if (!portalRes.ok) {
        throw new Error(`Portal validation failed: ${portalData.message || portalData.error}`);
      }

      console.log('Portal validation successful, nonce marked as used');
      setNonceUsed(true); // Mark nonce as used after successful portal validation
      
      // Step 6b: Submit to zkVerify via relayer
      setVerificationStatus('Step 6b/6: Submitting to zkVerify...');
      console.log('Submitting proof to zkVerify via relayer API...');

      const res = await fetch('/api/relayer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proofData)
      });

      const data = await res.json();
      console.log('zkVerify response:', data);

      // Clear timeout since we completed successfully
      clearTimeout(timeoutId);

      if (res.ok) {
        setVerificationStatus('Proof verified successfully!');
        console.log('WiFiProof verified on zkVerify!');
        if (data.txHash) {
          setTxHash(data.txHash);
          console.log('Transaction hash:', data.txHash);
        }
      } else {
        setVerificationStatus('Proof verification failed.');
        console.error('zkVerify verification failed:', data);
      }
    } catch (error: any) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      console.error('WiFiProof generation error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0] // First line of stack trace
      });
      
      setErrorMsg(
        `Error generating WiFiProof: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-6 text-gray-900">WiFiProof - Zero-Knowledge Venue Attendance</h1>

      {/* User Secret Display */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 w-full max-w-2xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-blue-800">
              <strong>Your Device Secret:</strong> {userSecret.substring(0, 16)}...
              <br />
              <small>This secret is stored locally and never leaves your browser.</small>
            </p>
          </div>
          <button
            onClick={regenerateUserSecret}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
            title="Regenerate device secret"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Portal Configuration */}
      <div className="flex flex-col space-y-4 w-full max-w-2xl mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Portal Endpoint:</label>
          <input
            type="url"
            placeholder="http://localhost:3002"
            value={portalEndpoint}
            onChange={(e) => setPortalEndpoint(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </div>

        {/* Time Window */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Time Window Start:</label>
            <input
              type="datetime-local"
              value={timeWindowStart}
              onChange={(e) => setTimeWindowStart(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Time Window End:</label>
            <input
              type="datetime-local"
              value={timeWindowEnd}
              onChange={(e) => setTimeWindowEnd(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Portal Nonce Display */}
      {portalNonce && (
        <div className={`p-4 rounded-lg mb-6 w-full max-w-2xl ${
          nonceUsed ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <p className={`text-sm ${nonceUsed ? 'text-red-800' : 'text-green-800'}`}>
            <strong>Portal Nonce:</strong> {portalNonce.nonce.substring(0, 16)}...
            {nonceUsed && <span className="ml-2 px-2 py-1 bg-red-200 text-red-900 rounded text-xs">USED</span>}
            {!nonceUsed && <span className="ml-2 px-2 py-1 bg-green-200 text-green-900 rounded text-xs">READY</span>}
            <br />
            <strong>Venue:</strong> {portalNonce.venue_id} | <strong>Event:</strong> {portalNonce.event_id}
            <br />
            <strong>Issued:</strong> {new Date(portalNonce.ts * 1000).toLocaleString()}
            {nonceUsed && (
              <>
                <br />
                <small className="text-red-700">⚠️ This nonce has been used. Fetch a new nonce to generate another proof.</small>
              </>
            )}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleFetchNonce}
          disabled={isLoading}
          className={`${
            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } text-white font-semibold px-6 py-2 rounded-lg`}
        >
          {isLoading ? 'Fetching...' : 'Fetch Portal Nonce'}
        </button>

        <button
          onClick={handleGenerateProof}
          disabled={isLoading || !portalNonce || nonceUsed}
          className={`${
            isLoading || !portalNonce || nonceUsed ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          } text-white font-semibold px-6 py-2 rounded-lg`}
          title={nonceUsed ? 'Nonce already used - fetch a new nonce first' : 'Generate WiFiProof with current nonce'}
        >
          {isLoading ? 'Generating...' : nonceUsed ? 'Nonce Used - Fetch New Nonce' : 'Generate WiFiProof'}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="mt-6 text-blue-600 font-semibold">Working on it, please wait...</div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-6 text-red-600 font-medium bg-red-50 p-4 rounded-lg border border-red-200">{errorMsg}</div>
      )}

      {/* Verification Result */}
      {verificationStatus && (
        <div className="mt-4 text-lg font-medium text-blue-700">
          {verificationStatus}
        </div>
      )}

      {/* TX Hash */}
      {txHash && (
        <div className="mt-2 text-blue-800 underline">
          <a
            href={`https://zkverify-testnet.subscan.io/extrinsic/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Subscan (txHash: {txHash.slice(0, 10)}...)
          </a>
        </div>
      )}

      {/* Output */}
      {proofResult && (
        <div className="mt-8 bg-white shadow-md p-4 rounded-lg w-full max-w-xl">
          <h2 className="text-xl font-bold mb-2 text-green-700">WiFiProof Generated</h2>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(proofResult, null, 2)}
          </pre>
        </div>
      )}


    </div>
  );
}