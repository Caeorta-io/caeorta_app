#!/bin/bash
# Caeorta — Device simulation test scripts
# Tests all four Week 2 Edge Functions against dev Supabase
# Usage: bash docs/testing/device_simulation.sh
# Requires: curl, jq

SUPABASE_URL="https://pseksdzkrimtzamcuzzh.supabase.co"
ANON_KEY="your_anon_key_here"
FUNCTIONS_URL="$SUPABASE_URL/functions/v1"

DEVICE_ID="00000000-0000-0000-0000-000000000001"
DEVICE_SECRET="CAEORTA-TEST-SECRET-0001"

echo "================================================"
echo " Caeorta Device Simulation Tests"
echo "================================================"

# ── TEST 1: mint_device_token ──────────────────────
echo ""
echo "TEST 1: mint_device_token"
echo "--------------------------"
MINT_RESPONSE=$(curl -s -X POST "$FUNCTIONS_URL/mint_device_token" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\": \"$DEVICE_ID\", \"device_secret\": \"$DEVICE_SECRET\"}")

echo "Response: $MINT_RESPONSE"
DEVICE_JWT=$(echo $MINT_RESPONSE | jq -r '.jwt')

if [ "$DEVICE_JWT" = "null" ] || [ -z "$DEVICE_JWT" ]; then
  echo "FAIL — no JWT returned"
  exit 1
else
  echo "PASS — JWT received"
fi

# ── TEST 2: mint_device_token with wrong secret ────
echo ""
echo "TEST 2: mint_device_token — wrong secret (expect 401)"
echo "-------------------------------------------------------"
BAD_RESPONSE=$(curl -s -X POST "$FUNCTIONS_URL/mint_device_token" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\": \"$DEVICE_ID\", \"device_secret\": \"WRONG-SECRET\"}")
echo "Response: $BAD_RESPONSE"

# ── TEST 3: ota_check — no update available ────────
echo ""
echo "TEST 3: ota_check — device on latest firmware (expect update_available: false)"
echo "---------------------------------------------------------------------------------"
OTA_RESPONSE=$(curl -s -X POST "$FUNCTIONS_URL/ota_check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEVICE_JWT" \
  -d "{\"current_firmware_version\": \"0.1.0\"}")
echo "Response: $OTA_RESPONSE"

# ── TEST 4: ota_check — update available ──────────
echo ""
echo "TEST 4: ota_check — device on old firmware (expect update_available: true)"
echo "----------------------------------------------------------------------------"
# Use device 2 which has target 0.1.1
DEVICE_ID_2="00000000-0000-0000-0000-000000000002"
DEVICE_SECRET_2="CAEORTA-TEST-SECRET-0002"

MINT_2=$(curl -s -X POST "$FUNCTIONS_URL/mint_device_token" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\": \"$DEVICE_ID_2\", \"device_secret\": \"$DEVICE_SECRET_2\"}")
JWT_2=$(echo $MINT_2 | jq -r '.jwt')

OTA_2=$(curl -s -X POST "$FUNCTIONS_URL/ota_check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_2" \
  -d "{\"current_firmware_version\": \"0.1.0\"}")
echo "Response: $OTA_2"

echo ""
echo "================================================"
echo " Tests complete — pair_device and"
echo " submit_wifi_credentials require a real user"
echo " JWT from Supabase Auth. Test those from the"
echo " app after Raslan wires up the pairing flow."
echo "================================================"
