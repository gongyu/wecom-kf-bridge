#!/bin/bash
cd /opt/wecom-kf-bridge

# Load environment variables
set -a
source .env
set +a

# Start the service
exec node server.js
