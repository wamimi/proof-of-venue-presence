import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { Buffer } from "buffer";
import fs from "fs";
import path from "path";

const API_URL = "https://relayer-api.horizenlabs.io/api/v1";
const CIRCUIT_NAME = "wifiproof";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Debug: Log environment variables
  console.log('Environment Debug:', {
    nodeEnv: process.env.NODE_ENV,
    hasApiKey: !!process.env.API_KEY,
    apiKeyPreview: process.env.API_KEY ? process.env.API_KEY.substring(0, 8) + '...' : 'undefined',
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('API') || key.includes('KEY') || key.startsWith('NEXT_')
    ),
    processTitle: process.title,
    cwd: process.cwd()
  });

  // Check if API key is configured
  if (!process.env.API_KEY) {
    console.error('zkVerify API_KEY not configured in environment variables');
    console.error('Make sure you have .env.local file in proof-app directory with: API_KEY=your_key_here');
    return res.status(500).json({
      error: "Server configuration error",
      details: "zkVerify API_KEY not configured",
      debug: {
        envKeysFound: Object.keys(process.env).filter(key => 
          key.includes('API') || key.includes('KEY')
        ),
        suggestion: "Create .env.local file in proof-app directory with API_KEY=your_zkverify_key"
      }
    });
  }

  try {
    console.log('Received WiFiProof submission:', {
      hasProof: !!req.body.proof,
      hasPublicInputs: !!req.body.publicInputs,
      hasVk: !!req.body.vk,
      portalNonce: req.body.portalNonce?.substring(0, 8) + '...',
      publicInputsPreview: req.body.publicInputs?.slice(0, 2) // Show first 2 public inputs
    });

    // Convert proof and VK arrays correctly
    const proofUint8 = new Uint8Array(Object.values(req.body.proof));
    const vkUint8 = new Uint8Array(Object.values(req.body.vk));
    
    // Convert hex string public inputs to bytes correctly
    const publicInputsUint8 = new Uint8Array(
      req.body.publicInputs.flatMap((hexStr: string) => {
        // Remove 0x prefix and convert hex to bytes
        const cleanHex = hexStr.replace(/^0x/, '');
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
          bytes.push(parseInt(cleanHex.substr(i, 2), 16));
        }
        return bytes;
      })
    );

    console.log('Converted data sizes:', {
      proofBytes: proofUint8.length,
      publicInputsBytes: publicInputsUint8.length,
      vkBytes: vkUint8.length
    });

    // Check if VK is registered, if not register it
    const vkPath = path.join(process.cwd(), "public", CIRCUIT_NAME, "vkey.json");
    if (!fs.existsSync(vkPath)) {
      console.log('Registering VK for WiFiProof circuit...');
      await registerVk(vkUint8);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const vkData = fs.readFileSync(vkPath, "utf-8");
    const vkJson = JSON.parse(vkData);

    // WiFiProof circuit has 7 public inputs:
    // venue_id, event_id, nonce_hash, portal_sig_hash, time_window_start, time_window_end, proof_timestamp
    const params = {
      proofType: "ultraplonk", // WiFiProof uses UltraPlonk backend (zkVerify requirement)
      vkRegistered: true,
      proofOptions: {
        numberOfPublicInputs: 7, // WiFiProof specific
      },
      proofData: {
        proof: Buffer.from(
          concatenatePublicInputsAndProof(publicInputsUint8, proofUint8)
        ).toString("base64"),
        vk: vkJson.vkHash || vkJson.meta?.vkHash,
      },
    };

    console.log('Submitting WiFiProof to zkVerify with UltraPlonk:', {
      proofType: params.proofType,
      numberOfPublicInputs: params.proofOptions.numberOfPublicInputs,
      vkHash: params.proofData.vk?.substring(0, 16) + '...',
      proofSize: params.proofData.proof.length,
      vkRegistered: params.vkRegistered
    });

    // Debug: Log exactly what is being sent to zkVerify
    console.log('zkVerify payload preview:', {
      proofType: params.proofType,
      vkRegistered: params.vkRegistered,
      proofOptionsValid: !!params.proofOptions,
      proofDataValid: !!params.proofData,
      hasVkHash: !!params.proofData.vk,
      proofDataPreview: params.proofData.proof.substring(0, 100) + '...'
    });

    const requestResponse = await axios.post(
      `${API_URL}/submit-proof/${process.env.API_KEY}`,
      params
    );
    console.log('zkVerify response:', requestResponse.data);

    if (requestResponse.data.optimisticVerify != "success") {
      console.error("WiFiProof verification failed:", requestResponse.data);
      console.error("Debugging info:", {
        sentProofSize: params.proofData.proof.length,
        sentPublicInputs: params.proofOptions.numberOfPublicInputs,
        sentVkHash: params.proofData.vk,
        responseStatus: requestResponse.status,
        responseData: requestResponse.data
      });
      
      return res.status(400).json({
        error: "WiFiProof verification failed",
        details: requestResponse.data,
        debugInfo: {
          proofSize: params.proofData.proof.length,
          numberOfPublicInputs: params.proofOptions.numberOfPublicInputs,
          vkHash: params.proofData.vk
        }
      });
    }

    // Poll for job completion
    while (true) {
      try {
        const jobStatusResponse = await axios.get(
          `${API_URL}/job-status/${process.env.API_KEY}/${requestResponse.data.jobId}`
        );
        console.log("WiFiProof Job Status:", jobStatusResponse.data.status);

        if (jobStatusResponse.data.status === "IncludedInBlock") {
          console.log("WiFiProof included in block successfully");
          return res.status(200).json({
            success: true,
            txHash: jobStatusResponse.data.txHash,
            blockHash: jobStatusResponse.data.blockHash,
            jobId: requestResponse.data.jobId,
            portalNonce: req.body.portalNonce,
            message: "WiFiProof verified on-chain successfully!"
          });
        } else {
          console.log("Waiting for WiFiProof job to finalize...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error: any) {
        if (error?.response?.status === 503) {
          console.log("Service Unavailable, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.error('Job status check failed:', error);
          return res.status(500).json({ error: "Job status check failed" });
        }
      }
    }
  } catch (error: any) {
    console.error('WiFiProof submission error:', error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}

function concatenatePublicInputsAndProof(
  publicInputs: Uint8Array,
  proof: Uint8Array
): Uint8Array {
  const combined = new Uint8Array(publicInputs.length + proof.length);
  combined.set(publicInputs, 0);
  combined.set(proof, publicInputs.length);
  return combined;
}

async function registerVk(vkUint8: Uint8Array) {
  try {
    const vkBuffer = Buffer.from(vkUint8);
    const regParams = {
      proofType: "ultraplonk", 
      vk: vkBuffer.toString("base64"),
      proofOptions: {
        numberOfPublicInputs: 7, 
      },
    };

    console.log('Registering WiFiProof VK with zkVerify...');
    const regResponse = await axios.post(
      `${API_URL}/register-vk/${process.env.API_KEY}`,
      regParams
    );

    // Ensure the WiFiProof directory exists
    const dir = path.join(process.cwd(), "public", CIRCUIT_NAME);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dir, "vkey.json"),
      JSON.stringify(regResponse.data)
    );

    console.log('WiFiProof VK registered successfully');
  } catch (error: any) {
    console.error("Error registering WiFiProof VK:", error);

    // Write error info for debugging
    const dir = path.join(process.cwd(), "public", CIRCUIT_NAME);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dir, "vkey.json"),
      JSON.stringify(error?.response?.data || { error: "WiFiProof VK registration failed" })
    );

    throw error;
  }
}