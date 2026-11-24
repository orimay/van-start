"""Run: python3 -I scripts/sync_audio_test.py"""
import importlib.util
import json
import tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('sync', Path(__file__).resolve().parent / 'sync-audio.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

fails = 0


def check(name, got, want):
    global fails
    if got != want:
        fails += 1
        print(f'FAIL {name}: {got!r} != {want!r}')


def files(d):
    return sorted(p.name for p in d.iterdir())


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    deck, local, repo = tmp / 'deck.json', tmp / 'local', tmp / 'repo'
    local.mkdir()
    repo.mkdir()
    deck.write_text(json.dumps({'c': [{'au': 'a', 'axb': 'b', 'c': [{'au': 'c'}]}]}))
    for k in ('a', 'b', 'c', 'old'):
        (local / f'{k}.mp3').write_text(k)
    for k in ('a', 'gone'):
        (repo / f'{k}.mp3').write_text('kept')
    (repo / 'README.md').write_text('x')

    m.sync(deck, local, repo)
    check('local orphans deleted', files(local), ['a.mp3', 'b.mp3', 'c.mp3'])
    check('repo gets new clips, loses orphans, keeps other files', files(repo), ['README.md', 'a.mp3', 'b.mp3', 'c.mp3'])
    check('existing repo clip untouched', (repo / 'a.mp3').read_text(), 'kept')

    (local / 'c.mp3').unlink()
    try:
        m.sync(deck, local, repo)
        check('missing clip refused', 'no error', 'SystemExit')
    except SystemExit as e:
        check('missing clip named', 'c' in str(e.code), True)

print('ok' if not fails else f'{fails} failed')
raise SystemExit(1 if fails else 0)
