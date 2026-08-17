#!/usr/bin/env bash
#
# Runs a package script only when the current directory's package.json defines
# it. The starters do not expose a uniform script set — nextjs/clerk has no
# check-types or test, the turborepo roots have both — so a plain `pnpm lint`
# across the matrix would fail on absence rather than on a real problem.
#
# Usage: run-if-present.sh <script-name>

set -euo pipefail

script="${1:?usage: run-if-present.sh <script-name>}"

if [[ ! -f package.json ]]; then
  echo "no package.json in $(pwd)" >&2
  exit 1
fi

if node -e "
  const scripts = require('./package.json').scripts || {};
  process.exit(scripts[process.argv[1]] ? 0 : 1);
" "${script}"; then
  echo "::group::pnpm ${script} ($(pwd))"
  pnpm "${script}"
  echo "::endgroup::"
else
  echo "no \"${script}\" script here - skipped"
fi
