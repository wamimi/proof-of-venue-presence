import { UltraHonkBackend } from "@aztec/bb.js";
import fs from "fs";
import circuit from "../circuits/target/noir_solidity_verifier_demo.json";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";

(async () => {
  try {
    const noir = new Noir(circuit as any);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

    // WiFiProof circuit inputs 
    const inputs = {
      // Private inputs
      user_secret: "0x1a2b3c4d5e6f708090abcdef1234567890abcdef1234567890abcdef12345678",
      connection_nonce: "123456",

      // Public inputs
      venue_id: "67890",
      event_id: "20250921",
      nonce_hash: "1234567890123456789012345678901234567890123456789012345678901234",
      portal_sig_hash: "9876543210987654321098765432109876543210987654321098765432109876",
      time_window_start: 1726936800,
      time_window_end: 1726944000,
      proof_timestamp: 1726936800,
    };

    console.log("Executing WiFiProof circuit...");
    const { witness } = await noir.execute(inputs);
    console.log("✅ Witness generated");

    console.log("Generating ZK proof with UltraHonk...");
    const { proof, publicInputs } = await honk.generateProof(witness, {
      keccak: true,
    });
    console.log("✅ Proof generated");

    // save proof to file
    fs.writeFileSync("../circuits/target/proof", proof);
    console.log("✅ Proof saved to ../circuits/target/proof");

    // save public inputs for Solidity tests
    fs.writeFileSync(
      "../circuits/target/public-inputs",
      JSON.stringify(publicInputs),
    );
    console.log("✅ Public inputs saved to ../circuits/target/public-inputs");

    console.log("\n🎉 WiFiProof generated successfully!");
    console.log(` Proof size: ${proof.length} bytes`);
    console.log(` Public inputs count: ${publicInputs.length}`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
