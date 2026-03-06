#!/usr/bin/env bash
# Deploy brightbar.dev — build Hugo site then push to Cloudflare Pages
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="$SCRIPT_DIR/.."

echo "Building Hugo site..."
(cd "$SITE_DIR" && hugo --minify)

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy "$SITE_DIR/public" \
  --project-name=brightbar-site \
  --branch=main \
  --commit-dirty=true

echo "Deploy complete. Verify at https://brightbar.dev/"
