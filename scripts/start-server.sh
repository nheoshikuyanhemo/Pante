#!/bin/bash
# Start a simple HTTP server for testing PANTE website
cd /root/.hermes/Pante
echo "Starting local server at http://localhost:8000"
python3 -m http.server 8000