"""Voices the Dutch side and Dutch example of every card with a neural voice (edge-tts) into
public/audio/<key>.mp3 and stamps each card in public/deck.json with `au` / `axb` keys.
Existing files are skipped, so an interrupted run resumes.

Needs edge-tts:  python3 -m venv .venv && .venv/bin/pip install edge-tts
Run after build-deck.py:  .venv/bin/python -I scripts/build-audio.py [voice]
"""

import asyncio
import hashlib
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DECK = ROOT / 'public' / 'deck.json'
OUT = ROOT / 'public' / 'audio'
VOICE = sys.argv[1] if len(sys.argv) > 1 else 'nl-NL-FennaNeural'
PARALLEL = 6


# Words the voice gets wrong, respelled so it says them right.
# Guarded by app/utils/respell.spec.ts, so a rebuild cannot bring the wrong clip back.
RESPELL = {'garages': 'garaazjes', 'maandelijks': 'maandeluks'}
RESPELLED = re.compile(r'\b(' + '|'.join(RESPELL) + r')\b', re.I)


def spoken(text: str) -> str:
    plain = re.sub(r'\s+', ' ', re.sub(r'\(.*?\)', '', text)).strip()
    return RESPELLED.sub(lambda m: RESPELL[m.group(1).lower()], plain)


# Hex digits as the letters a-p: a name of 16 digits reads as a card number to leak scanners.
LETTERS = str.maketrans('0123456789abcdef', 'abcdefghijklmnop')


def key_of(text: str) -> str:
    return hashlib.sha1(f'{VOICE}|{text}'.encode()).hexdigest()[:16].translate(LETTERS)


def cards(node):
    yield from node.get('cards', [])
    for child in node.get('children', []):
        yield from cards(child)


async def render(text: str, gate: asyncio.Semaphore) -> None:
    target = OUT / f'{key_of(text)}.mp3'
    if target.exists():
        return
    async with gate:
        for attempt in range(5):
            try:
                partial = target.with_suffix('.part')
                await edge_tts.Communicate(text, VOICE).save(str(partial))
                partial.rename(target)
                return
            except Exception as error:  # network hiccups and throttling
                if attempt == 4:
                    print(f'failed: {text!r}: {error}', file=sys.stderr)
                await asyncio.sleep(2 ** attempt)


async def main() -> None:
    deck = json.loads(DECK.read_text())
    OUT.mkdir(exist_ok=True)
    texts: dict[str, None] = {}  # deck order, so early lessons get voiced first
    for card in cards(deck):
        for side, key in (('b', 'au'), ('xb', 'axb')):
            text = spoken(card.get(side) or '')
            if text:
                card[key] = key_of(text)
                texts[text] = None
    # Keys are content hashes, so the deck can point at clips before they are rendered.
    DECK.write_text(json.dumps(deck, ensure_ascii=False, separators=(',', ':')))
    gate = asyncio.Semaphore(PARALLEL)
    batch = list(texts)
    for i in range(0, len(batch), 500):
        await asyncio.gather(*(render(t, gate) for t in batch[i:i + 500]))
        print(f'{min(i + 500, len(batch))}/{len(batch)}', file=sys.stderr, flush=True)
    print(f'{len(texts)} clips in {OUT}')


if __name__ == '__main__':
    asyncio.run(main())
