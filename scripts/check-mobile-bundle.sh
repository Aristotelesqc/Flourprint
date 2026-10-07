#!/usr/bin/env bash
# Fails when the mobile bundle references a Node module or the Node SQLite driver (ADR 0001).
# Only module specifiers are matched ("node:fs", 'node:sqlite'); object keys such as `node:` are fine.
set -euo pipefail
pattern="[\"'\`]node:[a-z_/]+[\"'\`]|DatabaseSync"
if grep -lE "$pattern" apps/mobile/dist/assets/*.js; then
  echo "The mobile bundle references Node modules (files above)." >&2
  exit 1
fi
echo "Mobile bundle: no Node module."
