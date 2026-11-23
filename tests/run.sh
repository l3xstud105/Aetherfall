#!/usr/bin/env bash
# Runs every headless test suite. Usage: bash tests/run.sh   (from the project root)
set -e
cd "$(dirname "$0")/.."
run() { # name, entry, extra esbuild flags
  echo "=== $1"; npx esbuild "$2" --bundle --platform=node --format=esm --outfile=tests/.out.mjs --log-level=error --external:react --external:react-dom ${@:3}
  node tests/.out.mjs | tail -15; rm -f tests/.out.mjs
}
run "logic" tests/logic.test.ts
run "world" tests/world.test.ts --external:peerjs
run "ui" tests/ui.test.tsx --jsx=automatic
run "play" tests/play.test.ts --alias:three=./tests/three-stub.ts
run "multiplayer" tests/multiplayer.test.ts --alias:three=./tests/three-stub.ts --external:peerjs
run "mmo_server" tests/mmo_server.test.ts --external:ws
run "mmo_load" tests/mmo_load.test.ts --external:ws
