#!/bin/bash

cd "$(dirname "$0")"

if [ -f ".env" ]; then
  echo ".env file exists. ✅"
else
  echo ".env file does not exist."
  cp .env.example .env
fi

env_path="$(pwd)/.env"

for dir in apps/* packages/*; do
  if [ -d "$dir" ]; then
    target="$dir/.env"
    # Only link if target does not exist or is not already a symlink to the right location
    if [ ! -L "$target" ] || [ "$(readlink -- "$target")" != "$env_path" ]; then
      if [ ! -e "$target" ]; then
        ln -s "$env_path" "$target"
      fi
    fi
  fi
done
