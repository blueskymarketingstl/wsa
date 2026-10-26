#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export npm_config_cache=/tmp/wsa-npm
npm ci --no-audit --no-fund
npm run lint
npm run build
