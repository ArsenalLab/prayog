#!/usr/bin/env bash

# .arsenal/execute.sh
# Production-ready execution script for running the multi-agent pipeline fully autonomously via IBM Bob Shell.
# Designed for CI/CD, batch processing, and non-interactive deployments.

set -euo pipefail

# Define configuration parameters
MAX_RETRIES=3
RETRY_DELAY=5
MEMORY_ALLOCATION_MB=4096
EXECUTION_TIMEOUT_SECONDS=600 # 10 minute execution limit

echo "================================================================================"
echo "🛡️  IBM Bob Shell Autonomous Deployment & Orchestration Wrapper"
echo "================================================================================"

# Step 1: Pre-flight Checks
if [ -z "${BOB_API_KEY:-}" ]; then
    echo "⚠️  WARNING: BOB_API_KEY environment variable is not set!"
    echo "   Ensure it is configured in your execution environment for the agent to authenticate."
fi

# Step 2: Configure Node Memory Options
export NODE_OPTIONS="--max-old-space-size=${MEMORY_ALLOCATION_MB}"
echo "✅ Set Node.js memory allocation limit: ${MEMORY_ALLOCATION_MB}MB"

# Step 3: Run-with-Retry Loop for Autonomous Execution Resilience
attempt=1
success=false

while [ $attempt -le $MAX_RETRIES ]; do
    echo "🔄 Autonomous Execution Attempt $attempt of $MAX_RETRIES..."
    
    # Run the Bob Shell in non-interactive mode.
    # The --yolo flag allows autonomous write/update operations in the repo.
    # The --accept-license flag bypasses interactive EULA prompts.
    # We set a shell timeout to prevent hanging.
    set +e
    timeout "${EXECUTION_TIMEOUT_SECONDS}" bob --accept-license --yolo -p \
        "Run the complete multi-agent RCA pipeline by executing 'node .arsenal/run.mjs' in the terminal. Verify that all 4 stages execute successfully, state handoffs are validated, and run summary is correctly archived."
    
    exit_code=$?
    set -e
    
    if [ $exit_code -eq 0 ]; then
        echo "================================================================================"
        echo "🎉 SUCCESS: Multi-agent orchestration completed successfully on attempt $attempt."
        echo "================================================================================"
        success=true
        break
    elif [ $exit_code -eq 124 ]; then
        echo "⚠️  TIMEOUT: Execution exceeded the limit of ${EXECUTION_TIMEOUT_SECONDS}s."
    else
        echo "❌ FAILURE: Bob Shell exited with non-zero code $exit_code."
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -le $MAX_RETRIES ]; then
        echo "Waiting ${RETRY_DELAY}s before retrying..."
        sleep ${RETRY_DELAY}
    fi
done

if [ "$success" = false ]; then
    echo "================================================================================"
    echo "❌ FATAL: Autonomous orchestration pipeline failed after $MAX_RETRIES attempts."
    echo "================================================================================"
    exit 1
fi
