#!/bin/bash

# Usage: ./script.sh <client_id> <client_secret>

# Assign command line arguments to variables
CLIENT_ID=$1
CLIENT_SECRET=$2

# Check if all arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <client_id> <client_secret>"
    exit 1
fi

# Run the curl command with the provided arguments
curl -G "https://www.strava.com/api/v3/push_subscriptions" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}"
