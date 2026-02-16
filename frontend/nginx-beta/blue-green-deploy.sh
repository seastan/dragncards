#!/bin/bash
#
# Blue-green deploy for DragnCards (beta).
#
# Instead of stop/start (which kills all rooms), this:
#   1. Builds the new release
#   2. Starts it on the alternate port (4000 <-> 4001)
#   3. Swaps nginx to send new connections to the new port
#   4. Old instance keeps running — existing rooms/websockets stay alive
#
# Later, when old rooms have ended, stop the old instance:
#   sudo systemctl stop dragncards.service       (if old was 4000)
#   sudo systemctl stop dragncards-4001.service   (if old was 4001)
#
# ============================================================
# FIRST-TIME SETUP (run these once before first blue-green deploy):
#
#   # 1. Install the upstream config file
#   sudo cp /var/www/dragncards.com/dragncards/frontend/nginx-beta/dragncards-upstream.conf /etc/nginx/dragncards-upstream.conf
#
#   # 2. Install the updated site config
#   sudo cp /var/www/dragncards.com/dragncards/frontend/nginx-beta/sites-available/dragncards.com /etc/nginx/sites-available/dragncards.com
#
#   # 3. Install the port 4001 systemd service
#   sudo cp /var/www/dragncards.com/dragncards/frontend/nginx-beta/dragncards-4001.service /lib/systemd/system/dragncards-4001.service
#   sudo systemctl daemon-reload
#
#   # 4. Test and reload nginx
#   sudo nginx -t && sudo nginx -s reload
# ============================================================

set -euo pipefail

UPSTREAM_FILE="/etc/nginx/dragncards-upstream.conf"

# Determine current active port
CURRENT_PORT=$(grep -oP '\d{4}' "$UPSTREAM_FILE" | head -1)

if [ "$CURRENT_PORT" = "4000" ]; then
  NEW_PORT=4001
  NEW_SERVICE="dragncards-4001.service"
  OLD_SERVICE="dragncards.service"
else
  NEW_PORT=4000
  NEW_SERVICE="dragncards.service"
  OLD_SERVICE="dragncards-4001.service"
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
echo "==> Building frontend..."
cd frontend
npm run build:css
npm run build
cp -r /var/www/dragncards.com/dragncards/frontend/build/* /var/www/dragncards.com/html/
cd ..

# Step 3: Stop the new service if it was still running from a previous deploy
sudo systemctl stop "$NEW_SERVICE" 2>/dev/null || true

# Step 4: Start new backend on alternate port
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
    echo "    ERROR: New instance didn't start in time."
    echo "    Check logs: sudo journalctl -u $NEW_SERVICE -n 50"
    exit 1
  fi
  sleep 2
done

# Step 5: Swap nginx upstream to new port
echo "==> Swapping nginx to port $NEW_PORT..."
echo "upstream phoenix {
  server 127.0.0.1:$NEW_PORT;
}" | sudo tee "$UPSTREAM_FILE" > /dev/null
sudo nginx -t && sudo nginx -s reload

echo ""
echo "=========================================="
echo "  Deploy complete!"
echo "=========================================="
echo ""
echo "  New connections -> port $NEW_PORT ($NEW_SERVICE)"
echo "  Old instance still running on port $CURRENT_PORT ($OLD_SERVICE)"
echo ""
echo "  When old rooms have ended, stop the old instance:"
echo "    sudo systemctl stop $OLD_SERVICE"
echo ""
