import { useState, useEffect, useRef } from 'react'
import './App.css'
import { ProofState, ProofStateData } from './types'
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import { flattenFieldsAsArray } from "./helpers/proof";
import { getHonkCallData, init } from 'garaga';
import verifierAbi from "./assets/verifier.json";
import vkUrl from './assets/vk.bin?url';
import { RpcProvider, Contract } from 'starknet';
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";

// WiFiProof types
interface PortalNonceData {
  venue_id: string;
  event_id: string;
  nonce: string;
  ts: number;
  signature: string;
  venue_pubkey_jwk: any;
}

interface CircuitInputs {
  user_secret: string;
  connection_nonce: string;
  venue_id: string;
  event_id: string;
  nonce_hash: string;
  portal_sig_hash: string;
  time_window_start: number;
  time_window_end: number;
  proof_timestamp: number;
}

// Crypto utilities for WiFiProof
const sha256Hash = async (input: string | Uint8Array): Promise<string> => {
  const encoder = new TextEncoder();
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const hashToField = (hash: string): string => {
  const cleanHash = hash.replace(/^0x/, '');
  const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const hashBigInt = BigInt('0x' + cleanHash);
  let fieldValue = hashBigInt % fieldModulus;
  if (fieldValue === BigInt(0)) {
    fieldValue = BigInt(1);
    console.warn('Hash reduced to zero, using fallback value 1');
  }
  return fieldValue.toString();
};

const stringToField = (str: string): string => {
  const numericPart = str.replace(/[^0-9]/g, '');
  if (!numericPart) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }
  return numericPart;
};

const generateUserSecret = (): string => {
  const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  let secret = localStorage.getItem('wifiproof_user_secret');
  if (secret) {
    try {
      const existingSecret = BigInt('0x' + secret);
      if (existingSecret >= fieldModulus) {
        secret = null;
      }
    } catch {
      secret = null;
    }
  }
  if (!secret) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    let secretBigInt = BigInt(0);
    for (let i = 0; i < 32; i++) {
      secretBigInt = (secretBigInt << BigInt(8)) | BigInt(randomBytes[i]);
    }
    secretBigInt = secretBigInt % fieldModulus;
    secret = secretBigInt.toString(16).padStart(64, '0');
    localStorage.setItem('wifiproof_user_secret', secret);
  }
  return secret;
};

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial
  });
  const [vk, setVk] = useState<Uint8Array | null>(null);

  // WiFiProof state
  const [portalEndpoint, setPortalEndpoint] = useState('http://localhost:3002');
  const [portalNonce, setPortalNonce] = useState<PortalNonceData | null>(null);
  const [timeWindowStart, setTimeWindowStart] = useState('');
  const [timeWindowEnd, setTimeWindowEnd] = useState('');
  const [userSecret] = useState<string>(() => generateUserSecret());

  // Use a ref to reliably track the current state across asynchronous operations
  const currentStateRef = useRef<ProofState>(ProofState.Initial);

  // Initialize WASM on component mount
  useEffect(() => {
    const initWasm = async () => {
      try {
        // This might have already been initialized in main.tsx,
        // but we're adding it here as a fallback
        if (typeof window !== 'undefined') {
          await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
          console.log('WASM initialization in App component complete');
        }
      } catch (error) {
        console.error('Failed to initialize WASM in App component:', error);
      }
    };

    const loadVk = async () => {
      const response = await fetch(vkUrl);
      const arrayBuffer = await response.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);
      setVk(binaryData);
      console.log('Loaded verifying key:', binaryData);
    };
    
    initWasm();
    loadVk();
  }, []);

  const resetState = () => {
    currentStateRef.current = ProofState.Initial;
    setProofState({
      state: ProofState.Initial,
      error: undefined
    });
    setPortalNonce(null);
    setTimeWindowStart('');
    setTimeWindowEnd('');
  };

  const handleError = (error: unknown) => {
    console.error('Error:', error);
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error !== null && error !== undefined) {
      // Try to convert any non-Error object to a string
      try {
        errorMessage = String(error);
      } catch {
        errorMessage = 'Unknown error (non-stringifiable object)';
      }
    } else {
      errorMessage = 'Unknown error occurred';
    }
    
    // Use the ref to get the most recent state
    setProofState({
      state: currentStateRef.current,
      error: errorMessage
    });
  };

  const updateState = (newState: ProofState) => {
    currentStateRef.current = newState;
    setProofState({ state: newState, error: undefined });
  };

  const fetchPortalNonce = async () => {
    try {
      const response = await fetch(`${portalEndpoint}/api/issue-nonce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Portal returned ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setPortalNonce(data);
      console.log('Portal nonce fetched:', data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const startProcess = async () => {
    try {
      // Validate inputs
      if (!portalNonce) {
        throw new Error('Please fetch portal nonce first');
      }
      if (!timeWindowStart || !timeWindowEnd) {
        throw new Error('Please set time window');
      }

      // Start the process
      updateState(ProofState.GeneratingWitness);

      // Prepare WiFiProof circuit inputs
      const proofTimestamp = Math.floor(Date.now() / 1000);
      const connectionNonce = Math.floor(Math.random() * 1000000);

      // Hash portal data and convert to field-safe values
      const nonceHash = await sha256Hash(portalNonce.nonce);
      const portalSigHash = await sha256Hash(portalNonce.signature);

      const nonceHashField = hashToField(nonceHash);
      const portalSigHashField = hashToField(portalSigHash);

      // Convert time window to Unix timestamps
      const timeWindowStartTs = Math.floor(new Date(timeWindowStart).getTime() / 1000);
      const timeWindowEndTs = Math.floor(new Date(timeWindowEnd).getTime() / 1000);

      // Convert portal string IDs to numeric fields
      const venueIdField = stringToField(portalNonce.venue_id);
      const eventIdField = stringToField(portalNonce.event_id);

      const input: CircuitInputs = {
        user_secret: `0x${userSecret}`,
        connection_nonce: connectionNonce.toString(),
        venue_id: venueIdField,
        event_id: eventIdField,
        nonce_hash: nonceHashField,
        portal_sig_hash: portalSigHashField,
        time_window_start: timeWindowStartTs,
        time_window_end: timeWindowEndTs,
        proof_timestamp: proofTimestamp
      };

      console.log('WiFiProof Circuit Inputs:', input);

      // Load circuit dynamically to avoid Vite hanging
      const circuitResponse = await fetch('/src/assets/circuit.json');
      const circuit = await circuitResponse.json();

      // Generate witness
      const noir = new Noir(circuit);
      const execResult = await noir.execute(input);
      console.log('Witness generated:', execResult);

      // Generate proof
      updateState(ProofState.GeneratingProof);
      console.log('Starting UltraHonk proof generation...');
      console.log('Circuit bytecode length:', circuit.bytecode.length);
      console.log('Witness length:', Object.keys(execResult.witness).length);

      console.log('Initializing UltraHonkBackend with threads: 2...');
      const honk = new UltraHonkBackend(circuit.bytecode, { threads: 2 });
      console.log('UltraHonk backend initialized with 2 threads');

      console.log('Calling generateProof with starknet: true option...');
      const proof = await honk.generateProof(execResult.witness, { starknet: true });
      console.log('Proof generated successfully!', proof);

      honk.destroy();
      console.log('Proof data:', proof);
      
      // Prepare calldata
      updateState(ProofState.PreparingCalldata);

      await init();
      const callData = getHonkCallData(
        proof.proof,
        flattenFieldsAsArray(proof.publicInputs),
        vk as Uint8Array,
        1 // HonkFlavor.STARKNET
      );
      console.log(callData);
      
      // Connect wallet
      updateState(ProofState.ConnectingWallet);

      // Send transaction
      updateState(ProofState.SendingTransaction);

      const provider = new RpcProvider({ nodeUrl: 'http://127.0.0.1:5050/rpc' });
      // Deployed verifier contract address from devnet
      const contractAddress = '0x058ac88555300d527ac9de972c254f880be16d8af08fbb818ba0c7102464cda6';
      const verifierContract = new Contract(verifierAbi, contractAddress, provider);
      
      // Check verification
      const res = await verifierContract.verify_ultra_starknet_honk_proof(callData.slice(1));
      console.log(res);

      updateState(ProofState.ProofVerified);
    } catch (error) {
      handleError(error);
    }
  };

  const renderStateIndicator = (state: ProofState, current: ProofState) => {
    let status = 'pending';
    
    // If this stage is current with an error, show error state
    if (current === state && proofState.error) {
      status = 'error';
    } 
    // If this is the current stage, show active state
    else if (current === state) {
      status = 'active';
    } 
    // If we're past this stage, mark it completed
    else if (getStateIndex(current) > getStateIndex(state)) {
      status = 'completed';
    }
    
    return (
      <div className={`state-indicator ${status}`}>
        <div className="state-dot"></div>
        <div className="state-label">{state}</div>
      </div>
    );
  };

  const getStateIndex = (state: ProofState): number => {
    const states = [
      ProofState.Initial,
      ProofState.GeneratingWitness,
      ProofState.GeneratingProof,
      ProofState.PreparingCalldata,
      ProofState.ConnectingWallet,
      ProofState.SendingTransaction,
      ProofState.ProofVerified
    ];
    
    return states.indexOf(state);
  };

  return (
    <div className="container">
      <h1>WiFiProof: Starknet Venue Attendance Verification</h1>

      <div className="state-machine">
        <div className="input-section">
          <div className="input-group">
            <label htmlFor="portal-endpoint">Portal Endpoint:</label>
            <input
              id="portal-endpoint"
              type="text"
              value={portalEndpoint}
              onChange={(e) => setPortalEndpoint(e.target.value)}
              disabled={proofState.state !== ProofState.Initial}
              placeholder="http://localhost:3002"
            />
            <button
              onClick={fetchPortalNonce}
              disabled={proofState.state !== ProofState.Initial}
              className="secondary-button"
            >
              Fetch Nonce
            </button>
          </div>

          {portalNonce && (
            <div className="nonce-display">
              <p><strong>Venue:</strong> {portalNonce.venue_id}</p>
              <p><strong>Event:</strong> {portalNonce.event_id}</p>
              <p><strong>Nonce:</strong> {portalNonce.nonce.substring(0, 16)}...</p>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="time-start">Time Window Start:</label>
            <input
              id="time-start"
              type="datetime-local"
              value={timeWindowStart}
              onChange={(e) => setTimeWindowStart(e.target.value)}
              disabled={proofState.state !== ProofState.Initial}
            />
          </div>

          <div className="input-group">
            <label htmlFor="time-end">Time Window End:</label>
            <input
              id="time-end"
              type="datetime-local"
              value={timeWindowEnd}
              onChange={(e) => setTimeWindowEnd(e.target.value)}
              disabled={proofState.state !== ProofState.Initial}
            />
          </div>

          <div className="input-group">
            <label>User Secret (auto-generated):</label>
            <p style={{ fontFamily: 'monospace', fontSize: '0.8em', wordBreak: 'break-all' }}>
              {userSecret.substring(0, 32)}...
            </p>
          </div>
        </div>
        
        {renderStateIndicator(ProofState.GeneratingWitness, proofState.state)}
        {renderStateIndicator(ProofState.GeneratingProof, proofState.state)}
        {renderStateIndicator(ProofState.PreparingCalldata, proofState.state)}
        {renderStateIndicator(ProofState.ConnectingWallet, proofState.state)}
        {renderStateIndicator(ProofState.SendingTransaction, proofState.state)}
      </div>
      
      {proofState.error && (
        <div className="error-message">
          Error at stage '{proofState.state}': {proofState.error}
        </div>
      )}
      
      <div className="controls">
        {proofState.state === ProofState.Initial && !proofState.error && (
          <button className="primary-button" onClick={startProcess}>Start</button>
        )}
        
        {(proofState.error || proofState.state === ProofState.ProofVerified) && (
          <button className="reset-button" onClick={resetState}>Reset</button>
        )}
      </div>
    </div>
  )
}

export default App
