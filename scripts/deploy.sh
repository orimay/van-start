#!/bin/sh
# Builds for orimay.github.io/van-start/ and pushes the site repo.
set -e
APP=$(cd "$(dirname "$0")/.." && pwd)
SITE=${SITE:-$HOME/Projects/private/pages/orimay.github.io}
ID="--config user.email=dmitrii.a.baranov@gmail.com --config user.name=Dmitrii_Baranov"
cd "$APP"
pnpm test >/dev/null
# Sources go to orimay/van-start: each deploy is one commit, so nothing lives only on this laptop.
JJ_EMAIL=dmitrii.a.baranov@gmail.com JJ_EDITOR=true jj commit -m "${1:-chore: update van start}"
jj bookmark set main -r @-
jj git push --bookmark main
AUDIO=${AUDIO:-$HOME/Projects/private/pages/van-start-audio}
python3 -I scripts/sync-audio.py "$AUDIO"
# Clips go out before the site that references them.
cd "$AUDIO"
if [ -n "$(jj diff --summary)" ]; then
  # jj refuses to push past an empty undescribed commit.
  jj abandon 'mutable() & empty() & description(exact:"") & ~@'
  JJ_EDITOR=true jj --config user.email=dmitrii.a.baranov@gmail.com --config 'user.name="Dmitrii Baranov"' commit -m "${1:-chore: update van start audio}"
  jj bookmark set main -r @-
  jj git push --bookmark main
fi
cd "$APP"
NUXT_APP_BASE_URL=/van-start/ NUXT_PUBLIC_AUDIO_BASE=/van-start-audio/ pnpm build >/dev/null
# Old chunks stay: a page still open on the previous version loads them lazily.
rsync -a --delete --exclude audio --exclude _nuxt .output/public/ "$SITE/van-start/"
rsync -a .output/public/_nuxt/ "$SITE/van-start/_nuxt/"
cd "$SITE"
JJ_EDITOR=true jj --config snapshot.max-new-file-size=60000000 --config user.email=dmitrii.a.baranov@gmail.com --config 'user.name="Dmitrii Baranov"' commit -m "${1:-chore: update van start}"
jj bookmark set main -r @-
jj git push --bookmark main
