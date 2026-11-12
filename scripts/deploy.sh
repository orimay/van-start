#!/bin/sh
# Builds for orimay.github.io/van-start/ and pushes the site repo.
set -e
APP=$(cd "$(dirname "$0")/.." && pwd)
SITE=${SITE:-$HOME/Projects/private/pages/orimay.github.io}
ID="--config user.email=dmitrii.a.baranov@gmail.com --config user.name=Dmitrii_Baranov"
cd "$APP"
pnpm test >/dev/null
NUXT_APP_BASE_URL=/van-start/ NUXT_PUBLIC_AUDIO_BASE=/van-start-audio/ pnpm build >/dev/null
# Old chunks stay: a page still open on the previous version loads them lazily.
rsync -a --delete --exclude audio --exclude _nuxt .output/public/ "$SITE/van-start/"
rsync -a .output/public/_nuxt/ "$SITE/van-start/_nuxt/"
cd "$SITE"
JJ_EDITOR=true jj --config snapshot.max-new-file-size=60000000 --config user.email=dmitrii.a.baranov@gmail.com --config 'user.name="Dmitrii Baranov"' commit -m "${1:-chore: update van start}"
jj bookmark set main -r @-
jj git push --bookmark main
