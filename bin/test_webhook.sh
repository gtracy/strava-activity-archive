#!/bin/bash

# Usage: ./script.sh <object_id> <owner_id> <subscription_id>

# Assign command line arguments to variables
URL=$1

# Check if all arguments are provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <webhook url>"
    exit 1
fi

# Define the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "aspect_type": "create",
  "event_time": 1549560669,
  "object_id": "object-id",
  "object_type": "activity",
  "owner_id": "owner-id",
  "subscription_id": "subscription-id"
}
EOF
)

# Run the curl command with the provided arguments and JSON data
curl -X POST "$URL" \
     -H 'Content-Type: application/json' \
     -d "$JSON_PAYLOAD"
