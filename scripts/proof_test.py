"""Run: python3 -I scripts/proof_test.py"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import proof  # noqa: E402

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / 'lang').mkdir()
    deck = {'name': 'deck', 'cards': [
        {'id': 'aaaaaaaa-1', 'b': 'be-', 'tr': 'бэ', 'f': 'о-'},
        {'id': 'bbbbbbbb-1', 'b': 'groot', 'tr': 'хроот', 'f': 'большой'},
    ]}
    (root / 'deck.json').write_text(json.dumps(deck, ensure_ascii=False))
    for l in proof.LANGS:
        # An affix is transcribed as it sounds in its example word, by hand: be- in bəhrútə(n).
        rows = {'aaaaaaaa-1': ['o-', '', 'bă'], 'bbbbbbbb-1': ['big', '', 'hroot']}
        (root / 'lang' / f'{l}.json').write_text(json.dumps({'names': {}, 'cards': rows}, ensure_ascii=False))
    proof.DECK, proof.LANG, proof.DONE = root / 'deck.json', root / 'lang', root / 'done.txt'
    fix = root / 'fix.json'
    fix.write_text(json.dumps({'bbbbbbbb': {'ru': {'f': 'большой, крупный'}}}, ensure_ascii=False))
    proof.apply(str(fix))
    ro = json.loads((root / 'lang' / 'ro.json').read_text())['cards']
    assert ro['aaaaaaaa-1'][2] == 'bă', f"an untouched affix keeps its transcription, got {ro['aaaaaaaa-1'][2]!r}"
print('ok')
