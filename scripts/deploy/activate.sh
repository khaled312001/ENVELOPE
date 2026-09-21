#!/bin/sh
# Unpack a release built by scripts/deploy/build.mjs and make it live.
#
# Runs ON THE HOST, from the directory holding app.tar.gz and web.tar.gz. It does
# no building and no installing — tar, cp and mv — because the account's CPU and
# process allowance is shared with its other sites.
#
# The previous release is kept outside the web root, so `rollback` can put it back
# and a copy of the old site is never reachable over HTTP. The .env is never in an
# archive: it is carried from the live app directory to the new one, mode 600.
#
#   sh activate.sh           make the release in this directory live
#   sh activate.sh rollback  put the previous release back
set -eu

DOMAIN="$HOME/domains/khaledahmed.net"
APP="$DOMAIN/tob-app"
WEB="$DOMAIN/public_html/tob"
KEEP="$HOME/tob-releases/previous"

restart() {
  mkdir -p "$APP/tmp"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$APP/tmp/restart.txt"
}

if [ "${1:-}" = "rollback" ]; then
  [ -d "$KEEP/app" ] && [ -d "$KEEP/web" ] || { echo "no previous release to roll back to"; exit 1; }
  cp -p "$APP/.env" "$KEEP/app/.env" 2>/dev/null || true
  rm -rf "$APP.failed" "$WEB.failed"
  mv "$APP" "$APP.failed" && mv "$KEEP/app" "$APP"
  mv "$WEB" "$WEB.failed" && mv "$KEEP/web" "$WEB"
  restart
  echo "rolled back to: $(cat "$APP/release.txt" 2>/dev/null || echo unknown)"
  exit 0
fi

HERE="$(pwd)"
[ -f "$HERE/app.tar.gz" ] && [ -f "$HERE/web.tar.gz" ] || { echo "app.tar.gz and web.tar.gz must be here"; exit 1; }

rm -rf "$APP.new" "$WEB.new"
mkdir -p "$APP.new" "$WEB.new"
tar -xzf "$HERE/app.tar.gz" -C "$APP.new"
tar -xzf "$HERE/web.tar.gz" -C "$WEB.new"

# The environment stays with the host, never with a release.
if [ -f "$APP/.env" ]; then
  cp -p "$APP/.env" "$APP.new/.env"
elif [ ! -f "$APP.new/.env" ]; then
  echo "no .env on the host yet — create $APP/.env (mode 600) before activating"; exit 1
fi
chmod 600 "$APP.new/.env"

mkdir -p "$KEEP"
rm -rf "$KEEP/app" "$KEEP/web"
if [ -d "$APP" ]; then mv "$APP" "$KEEP/app"; fi
mv "$APP.new" "$APP"
if [ -d "$WEB" ]; then mv "$WEB" "$KEEP/web"; fi
mv "$WEB.new" "$WEB"

restart
echo "live: $(cat "$APP/release.txt")"
