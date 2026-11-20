#!/bin/bash
# Move to script directory
cd "$(dirname "$0")"

echo "==============================================="
echo "   Starting Local Finance Management App...    "
echo "==============================================="

# Wait a second for server to initialize, then open browser
(sleep 2 && open "http://localhost:5001") &

# Start production server
npm start

