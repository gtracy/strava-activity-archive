#!/bin/bash

# Usage: ./subscribe.sh <client_id> <client_secret> <callback_url> <verify_token>

# Assign command line arguments to variables
CLIENT_ID=$1
CLIENT_SECRET=$2
CALLBACK_URL=$3
VERIFY_TOKEN=$4

# Check if all arguments are provided
if [ $# -ne 4 ]; then
    echo "Usage: $0 <client_id> <client_secret> <callback_url> <verify_token>"
    exit 1
fi

# Run the curl command with the provided arguments
curl -X POST \
    "https://www.strava.com/api/v3/push_subscriptions" \
    -F "client_id=${CLIENT_ID}" \
    -F "client_secret=${CLIENT_SECRET}" \
    -F "callback_url=${CALLBACK_URL}" \
    -F "verify_token=${VERIFY_TOKEN}"
