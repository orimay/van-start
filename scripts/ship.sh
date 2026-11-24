#!/bin/sh
# Deploys a snapshot of the working copy from the `build` workspace, so editing goes on while it builds.
set -e
APP=$(cd "$(dirname "$0")/.." && pwd)
BUILD=${BUILD:-$APP/../van-start-build}
cd "$APP"
jj status >/dev/null
if [ ! -d "$BUILD/.jj" ]; then
  jj workspace add --name build "$BUILD"
fi
cd "$BUILD"
JJ_EDITOR=true jj new main
jj restore --from default@
# Gitignored, so linked in from the working copy; the deploy syncs the clips from here.
ln -sfn "$APP/node_modules" node_modules
ln -sfn "$APP/public/audio" public/audio
rm -rf .output
scripts/deploy.sh "$1"
cd "$APP"
# The working copy moves onto the pushed main with its files as they are: a merge would conflict on a file added before the snapshot and edited after.
OLD=$(jj log --no-graph -r @ -T commit_id)
JJ_EDITOR=true jj new main
jj restore --from "$OLD"
jj abandon "$OLD"
