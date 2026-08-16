#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"
root="$(pwd)"

echo "Removing node_modules from root, apps/*, and packages/*..."

rm -rf "$root/node_modules"

for dir in apps packages; do
  if [ -d "$dir" ]; then
    for pkg in "$dir"/*; do
      if [ -d "$pkg/node_modules" ]; then
        echo "Removing $pkg/node_modules"
        rm -rf "$pkg/node_modules"
      fi
    done
  fi
done

echo "Installing dependencies with pnpm..."
pnpm install

echo "Done."
