#!/bin/bash

# Usage: ./delete.sh <subscription_id> <client_id> <client_secret>

# Assign command line arguments to variables
SUBSCRIPTION_ID=$1
CLIENT_ID=$2
CLIENT_SECRET=$3

# Check if all arguments are provided
if [ $# -ne 3 ]; then
    echo "Usage: $0 <subscription_id> <client_id> <client_secret>"
    exit 1
fi

# Run the curl command with the provided arguments
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/${SUBSCRIPTION_ID}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}"
