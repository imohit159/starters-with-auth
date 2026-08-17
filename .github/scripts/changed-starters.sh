#!/usr/bin/env bash
#
# Prints a JSON array of starter roots that need verifying, for use as a
# GitHub Actions matrix.
#
# A "starter root" is any directory holding its own pnpm-lock.yaml. That covers
# all three layouts in this repo without a hardcoded list:
#   - single Next.js app        nextjs/custom/drizzle-postgres
#   - pnpm/turborepo workspace  trpc/turborepo/drizzle-postgres
#   - independent apps          rest/standalone/drizzle-postgres/{backend,frontend}
#
# Everything is selected when the diff is unknown, when CI's own files changed,
# or when RUN_ALL=true. Otherwise only roots containing a changed file are.
#
# Env:
#   BASE_SHA, HEAD_SHA  commit range to diff (optional)
#   RUN_ALL             "true" forces every root
#
# Run it locally the same way CI does:
#   BASE_SHA=HEAD~1 HEAD_SHA=HEAD .github/scripts/changed-starters.sh

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

mapfile -t roots < <(
  find . -name pnpm-lock.yaml -not -path '*/node_modules/*' -printf '%h\n' |
    sed 's|^\./||' |
    sort -u
)

if ((${#roots[@]} == 0)); then
  echo "no pnpm-lock.yaml found - nothing to verify" >&2
  echo '[]'
  exit 0
fi

changed=""
if [[ -n "${BASE_SHA:-}" && -n "${HEAD_SHA:-}" && "${BASE_SHA}" != *[^0]* ]]; then
  # A base of all zeros means a brand new branch: no usable range.
  changed=""
elif [[ -n "${BASE_SHA:-}" && -n "${HEAD_SHA:-}" ]]; then
  changed="$(git diff --name-only "${BASE_SHA}" "${HEAD_SHA}" 2>/dev/null || true)"
fi

selected=()
if [[ "${RUN_ALL:-}" == "true" || -z "${changed}" ]] || grep -q '^\.github/' <<<"${changed}"; then
  selected=("${roots[@]}")
  echo "verifying every starter root" >&2
else
  for root in "${roots[@]}"; do
    while read -r file; do
      [[ -z "${file}" ]] && continue
      dir="$(dirname "${file}")"
      # Either the file lives inside this root, or it lives in a directory that
      # contains this root. The second case matters for the standalone layout,
      # where docker-compose.yml sits beside backend/ and frontend/ rather than
      # inside either of them.
      if [[ "${file}" == "${root}/"* || "${root}" == "${dir}/"* ]]; then
        selected+=("${root}")
        break
      fi
    done <<<"${changed}"
  done
  echo "changed roots: ${#selected[@]} of ${#roots[@]}" >&2
fi

if ((${#selected[@]} == 0)); then
  echo '[]'
  exit 0
fi

printf '%s\n' "${selected[@]}" | jq -R . | jq -sc .
