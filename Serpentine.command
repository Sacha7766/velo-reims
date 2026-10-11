#!/bin/zsh
# Double-click to ride: starts the local server (if needed) and opens Serpentine in Chrome.
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
if ! curl -s -o /dev/null http://localhost:5199; then
  nohup npx vite --port 5199 --strictPort > /tmp/serpentine.log 2>&1 &
  for i in {1..40}; do curl -s -o /dev/null http://localhost:5199 && break; sleep 0.25; done
fi
open -a "Google Chrome" http://localhost:5199
