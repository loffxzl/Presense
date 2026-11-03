#!/usr/bin/env bash
# Run on the AWS server from the project folder:  ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Pulling latest production code"
git pull --ff-only origin production

echo "==> Installing dependencies"
npm ci --omit=dev

echo "==> (Re)starting the app"
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "==> Health check"
sleep 3
if curl -fsS "http://127.0.0.1:${PORT:-3000}/" > /dev/null; then
  echo "Deployed OK"
else
  echo "App did not respond. Check:  pm2 logs presense" >&2
  exit 1
fi
