#!/bin/bash

# Script to verify proof on Starknet devnet
# Usage: ./verify_proof.sh

VERIFIER_ADDRESS="0x058ac88555300d527ac9de972c254f880be16d8af08fbb818ba0c7102464cda6"

echo "Generating calldata..."
cd "$(dirname "$0")"
CALLDATA=$(garaga calldata --system ultra_starknet_honk --vk circuit/target/vk --proof circuit/target/proof --public-inputs circuit/target/public_inputs)

echo "Calldata generated. Length: $(echo $CALLDATA | wc -w) felts"
echo ""
echo "Calling verifier contract..."

cd contracts
sncast call \
  --contract-address "$VERIFIER_ADDRESS" \
  --function verify_ultra_starknet_honk_proof \
  --calldata $CALLDATA

echo ""
echo "Verification complete!"
