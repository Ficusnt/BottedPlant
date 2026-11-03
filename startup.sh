#!/usr/bin/env bash
# Startup script for low-memory environments
# Based on: https://www.tomspencer.dev/blog/2016/10/01/running-a-node-dot-js-app-in-a-low-memory-environment/

# Exit on error
set -e

# Default Node.js entry point
NODE_ENTRY_POINT="${NODE_ENTRY_POINT:-dist/index.js}"

# The --color flag ensures that any log output is correctly colorised
# in all environments, even those which inaccurately report as not supporting color.
NODE_ARGS="${NODE_ENTRY_POINT} --color"

# If WEB_MEMORY environment variable is set, calculate max_old_space_size
# as 4/5 (80%) of available memory - determined via trial and error to be
# the optimum value to ensure V8 uses all available memory without OOM.
if [[ -n "${WEB_MEMORY}" ]]; then
    # Calculate 4/5 of WEB_MEMORY (in MB)
    MEM_NODE_OLD_SPACE=$(( (WEB_MEMORY * 4) / 5 ))
    NODE_ARGS="--max_old_space_size=${MEM_NODE_OLD_SPACE} ${NODE_ARGS}"
    echo "[startup] WEB_MEMORY=${WEB_MEMORY}MB -> max_old_space_size=${MEM_NODE_OLD_SPACE}MB"
fi

# Pass any additional V8 arguments from NODEJS_V8_ARGS env var
if [[ -n "${NODEJS_V8_ARGS}" ]]; then
    NODE_ARGS="${NODEJS_V8_ARGS} ${NODE_ARGS}"
fi

echo "[startup] Starting: node ${NODE_ARGS}"

# Use exec to ensure that when node exits, the exit code is passed up
# to the caller of this script. This is critical for proper signal handling
# in containerized environments (Docker, Kubernetes, etc.)
exec node ${NODE_ARGS}