#!/bin/bash

# Usage: ./script.sh <object_id> <owner_id> <subscription_id>

# Assign command line arguments to variables
URL=$1
SUB_ID=$2

# Check if all arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <webhook url> <subscription id>"
    exit 1
fi

# Define the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "aspect_type": "create",
  "event_time": 1549560669,
  "object_id": "398209",
  "object_type": "activity",
  "owner_id": "greg_tracy",
  "subscription_id": $SUB_ID
}
EOF
)

# Run the curl command with the provided arguments and JSON data
curl -X POST "$URL" \
     -H 'Content-Type: application/json' \
     -d "$JSON_PAYLOAD"
