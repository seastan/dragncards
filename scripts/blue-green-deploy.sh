#!/bin/bash
#
# Blue-green deploy for DragnCards.
#
# Instead of stop/start (which kills all rooms), this:
#   1. Builds the new release
#   2. Starts it on the alternate port (4000 <-> 4001)
#   3. Swaps nginx to send new connections to the new port
#   4. Old instance keeps running — existing rooms/websockets stay alive
#
# Flags:
#   --skip-frontend   Skip frontend build (backend-only deploy)
#
# Later, when old rooms have ended (days/a week), run:
#   sudo systemctl stop dragncards-old.service
#
# First-time setup:
#   1. Copy /etc/nginx/sites-available/dragncards.com with the new version
#   2. Create /etc/nginx/dragncards-upstream.conf with: upstream phoenix { server 127.0.0.1:4000; }
#   3. Create dragncards-4001.service (copy of dragncards.service with PORT=4001)
#   4. sudo nginx -t && sudo nginx -s reload

set -euo pipefail

# Cache sudo credentials upfront so the script doesn't prompt later
sudo echo "Starting..."

SKIP_FRONTEND=false
for arg in "$@"; do
  case $arg in
    --skip-frontend) SKIP_FRONTEND=true ;;
  esac
done

UPSTREAM_FILE="/etc/nginx/dragncards-upstream.conf"
RELEASE_BIN="/var/www/dragncards.com/dragncards/backend/_build/prod/rel/dragncards/bin/dragncards"

# Determine current active port
CURRENT_PORT=$(grep -oP '\d{4}' "$UPSTREAM_FILE" | head -1)

if [ "$CURRENT_PORT" = "4000" ]; then
  NEW_PORT=4001
  NEW_SERVICE="dragncards-4001.service"
  OLD_SERVICE="dragncards.service"
  OLD_NODE="dragncards@$(hostname)"
else
  NEW_PORT=4000
  NEW_SERVICE="dragncards.service"
  OLD_SERVICE="dragncards-4001.service"
  OLD_NODE="dragncards_4001@$(hostname)"
fi

echo "Current active port: $CURRENT_PORT"
echo "Deploying new version on port: $NEW_PORT"
echo ""

# Step 1: Pull and build
echo "==> Pulling latest code..."
git pull

echo "==> Building backend..."
cd backend
mix deps.get --only prod
MIX_ENV=prod mix compile
NODE_ENV=production npm install --prefix ./assets
NODE_ENV=production npm run deploy --prefix ./assets
mix phx.digest
MIX_ENV=prod mix release --overwrite
cd ..

# Step 2: Build frontend
if [ "$SKIP_FRONTEND" = true ]; then
  echo "==> Skipping frontend build (--skip-frontend)"
else
  echo "==> Building frontend..."
  cd frontend
  npm run build:css
  npm run build
  cp -r /var/www/dragncards.com/dragncards/frontend/build/* /var/www/dragncards.com/html/
  cd ..
fi

# Step 3: Start new backend on alternate port
echo "==> Starting new backend on port $NEW_PORT..."
sudo systemctl start "$NEW_SERVICE"

# Wait for it to come up
echo "==> Waiting for new instance..."
for i in $(seq 1 30); do
  if curl -so /dev/null "http://127.0.0.1:$NEW_PORT/" 2>/dev/null; then
    echo "    New instance is up!"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "    ERROR: New instance didn't start. Stopping it."
    sudo systemctl stop "$NEW_SERVICE"
    exit 1
  fi
  sleep 2
done

# Step 4: Swap nginx upstream to new port
echo "==> Swapping nginx to port $NEW_PORT..."
echo "upstream phoenix {
  server 127.0.0.1:$NEW_PORT;
}" | sudo tee "$UPSTREAM_FILE" > /dev/null
sudo nginx -t && sudo nginx -s reload

# Step 5: Disable room cleanup on old instance so it doesn't delete the new instance's rooms
echo "==> Disabling room cleanup on old instance..."
RELEASE_NODE=$OLD_NODE $RELEASE_BIN rpc "Application.put_env(:dragncards, :cleanup_enabled, false)" 2>/dev/null || echo "    Warning: couldn't reach old instance (may already be stopped)"

echo ""
echo "==> Deploy complete!"
echo "    New connections -> port $NEW_PORT ($NEW_SERVICE)"
echo "    Old instance still running on port $CURRENT_PORT ($OLD_SERVICE)"
echo ""
echo "    When old rooms have ended, stop the old instance:"
echo "      sudo systemctl stop $OLD_SERVICE"
