#!/usr/bin/env bash
# Builds, deploys, and lists the lot for the GoingOnce auction contract
# on Stellar testnet.
#
# Prerequisites:
#   - Rust + the wasm32-unknown-unknown target
#   - stellar-cli
#   - A funded testnet identity: `stellar keys generate admin --network testnet --fund`
#
# Usage:
#   ./scripts/deploy.sh "Vintage Star Chart" "Hand-inked celestial map, circa 1890" 1000 100 3600
#
# Args: item name, description, starting price (whole XLM), min increment (whole XLM), auction length in seconds from now.

set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "Usage: $0 \"item name\" \"description\" starting_price min_increment duration_seconds"
  exit 1
fi

ITEM_NAME="$1"
DESCRIPTION="$2"
STARTING_PRICE="$3"
MIN_INCREMENT="$4"
DURATION="$5"

NETWORK="testnet"
IDENTITY="admin"
CONTRACT_DIR="contracts/goingonce"
WASM_PATH="target/wasm32-unknown-unknown/release/goingonce.wasm"

echo "==> Building contract"
cd "$(dirname "$0")/.."
cd "$CONTRACT_DIR"
stellar contract build
cd - > /dev/null

echo "==> Optimizing wasm"
stellar contract optimize --wasm "$CONTRACT_DIR/$WASM_PATH"
OPTIMIZED_WASM="${WASM_PATH%.wasm}.optimized.wasm"

echo "==> Deploying to $NETWORK"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$CONTRACT_DIR/$OPTIMIZED_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo "Contract deployed: $CONTRACT_ID"

ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")
END_TIME=$(($(date +%s) + DURATION))

echo "==> Listing the lot (closes at unix time $END_TIME)"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$ADMIN_ADDRESS" \
  --item_name "$ITEM_NAME" \
  --description "$DESCRIPTION" \
  --starting_price "$STARTING_PRICE" \
  --min_increment "$MIN_INCREMENT" \
  --end_time "$END_TIME"

echo ""
echo "Done. Add this to frontend/.env:"
echo "  VITE_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Admin address (keep for end_auction later): $ADMIN_ADDRESS"
