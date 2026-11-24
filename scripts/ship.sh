#!/bin/sh
# Deploys a snapshot of the working copy from the `build` workspace, so editing goes on while it builds.
set -e
APP=$(cd "$(dirname "$0")/.." && pwd)
BUILD=${BUILD:-$APP/../van-start-build}
cd "$APP"
jj status >/dev/null
if [ ! -d "$BUILD/.jj" ]; then
  jj workspace add --name build "$BUILD"
  ln -s "$APP/node_modules" "$BUILD/node_modules"
  # Clips are gitignored; the deploy syncs them from here.
  ln -s "$APP/public/audio" "$BUILD/public/audio"
fi
cd "$BUILD"
JJ_EDITOR=true jj new main
jj restore --from default@
rm -rf .output
scripts/deploy.sh "$1"
cd "$APP"
# The working copy keeps only what changed after the snapshot.
JJ_EDITOR=true jj rebase -r default@ -d main
