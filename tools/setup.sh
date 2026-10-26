#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export npm_config_cache="/tmp/wsa-npm"
npm exec --yes --package=npm@11.16.0 -- npm ci --no-audit --no-fund
mkdir -p .runtime
if [ ! -f .runtime/wordpress-core/wp-load.php ]; then
  git clone --depth 1 --branch 7.1.3 https://github.com/WordPress/WordPress.git .runtime/wordpress-core
fi
expected_commit=fc9832bef919c2a08541248db23af90d14ffb082
actual_commit=$(git -C .runtime/wordpress-core rev-parse HEAD)
if [ "$actual_commit" != "$expected_commit" ]; then
  echo "Local WordPress checkout does not match the pinned release. Preserve it and investigate before proceeding." >&2
  exit 1
fi
