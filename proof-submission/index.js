import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'https://relayer-api.horizenlabs.io/api/v1';

// Import HEX artifacts
const proof = fs.readFileSync('../target/zkv_proof.hex', 'utf-8');
const publicInputs = fs.readFileSync('../target/zkv_pubs.hex', 'utf-8');
const vkey = fs.readFileSync('../target/zkv_vk.hex', 'utf-8');

async function main() {
  // --- Register VK ---
  if (!fs.existsSync("noir-vkey.json")) {
    try {
      const regParams = {
        "proofType": "ultrahonk",
        "vk": vkey.split("\n")[0]
      };

      console.log("Registering VK with:", regParams);

      const regResponse = await axios.post(
        `${API_URL}/register-vk/${process.env.API_KEY}`,
        regParams
      );

      fs.writeFileSync("noir-vkey.json", JSON.stringify(regResponse.data));
      console.log("VK registered:", regResponse.data);
    } catch (error) {
      console.error("VK registration failed:", error.response?.data || error);
      fs.writeFileSync(
        "noir-vkey.json",
        JSON.stringify(error.response?.data || { error: "unknown" })
      );
    }
  }

  const vk = JSON.parse(fs.readFileSync("noir-vkey.json"));

  // --- Submit proof ---
  const params = {
    "proofType": "ultrahonk",
    "vkRegistered": true,
    "chainId": 11155111,
    "proofData": {
      "proof": proof.proof,
      "publicSignals": proof.pub_inputs,
      "vk": vk.vkHash || vk.meta.vkHash
    }
  };

  console.log("Submitting proof with:", params);

  try {
    const requestResponse = await axios.post(
      `${API_URL}/submit-proof/${process.env.API_KEY}`,
      params
    );

    console.log("Submit response:", requestResponse.data);

    if (requestResponse.data.optimisticVerify != "success") {
      console.error("Proof verification failed, check proof artifacts");
      return;
    }

    // --- Poll job status ---
    while (true) {
      const jobStatusResponse = await axios.get(
        `${API_URL}/job-status/${process.env.API_KEY}/${requestResponse.data.jobId}`
      );

      console.log("Job status:", jobStatusResponse.data.status);

      if (jobStatusResponse.data.status === "Aggregated") {
        console.log("Job aggregated successfully");
        console.log(jobStatusResponse.data);
        fs.writeFileSync(
          "aggregation.json",
          JSON.stringify({
            ...jobStatusResponse.data.aggregationDetails,
            aggregationId: jobStatusResponse.data.aggregationId
          })
        );
        break;
      } else {
        console.log("Waiting for job to aggregate...");
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    }
  } catch (error) {
    console.error("Submit-proof failed:", error.response?.data || error);
  }
}

main();
