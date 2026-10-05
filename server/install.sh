#!/bin/sh
# Installs (or updates) the Atrium sync server as a login agent on this Mac.
#
# The server is copied into ~/Library/Application Support/Atrium rather than run
# from the repo: macOS won't let a background agent read ~/Desktop. Re-run this
# after changing server/atrium-sync.mjs or anything in server/public.
#
# It answers on the home network (HOST=0.0.0.0), where the phone syncs to
# http://<LocalHostName>.local:8787. Set HOST=127.0.0.1 to keep it Mac-only.

set -eu

LABEL="com.ritwikdeshpande.atrium-sync"
PORT="${PORT:-8787}"
HOST="${HOST:-0.0.0.0}"
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Library/Application Support/Atrium"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/atrium-sync.log"
NODE="$(command -v node)"

mkdir -p "$APP" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cp "$HERE/atrium-sync.mjs" "$APP/atrium-sync.mjs"
rm -rf "$APP/public" && cp -R "$HERE/public" "$APP/public"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>--no-warnings</string>
    <string>$APP/atrium-sync.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key><string>$PORT</string>
    <key>HOST</key><string>$HOST</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 1
curl -fsS "http://127.0.0.1:$PORT/health" && echo
echo "Installed $LABEL on $HOST:$PORT — data in $APP/atrium.db, log in $LOG"
