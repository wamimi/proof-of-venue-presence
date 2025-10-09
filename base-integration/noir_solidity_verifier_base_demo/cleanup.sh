#!/bin/bash

echo "  Cleaning up generated files for fresh workshop start..."

# Delete circuit artifacts
echo "Deleting circuits/target/..."
rm -rf circuits/target/

# Delete Solidity verifier
echo "Deleting contract/Verifier.sol..."
rm -f contract/Verifier.sol

# Delete Forge artifacts
echo "Deleting Forge build artifacts..."
rm -rf contract/broadcast/
rm -rf contract/cache/
rm -rf contract/out/

echo "✅ Cleanup complete! "
echo ""
echo "Files preserved:"
echo "  ✅ circuits/src/main.nr"
echo "  ✅ circuits/Prover.toml"
echo "  ✅ circuits/build.sh"
echo "  ✅ js/generate-proof.ts"
echo "  ✅ contract/*.sol (except Verifier.sol)"
echo "  ✅ .env"