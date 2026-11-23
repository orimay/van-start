"""Vendored from the deck build so new languages (ro) live in the repo.

Russian-letter transcription of Dutch (see deck2/TR.md) -> the same sounds spelled the way a
speaker of the target language reads them. A sound the language lacks gets the nearest familiar
letter (ü, ö, kh, zh...), as the Russian one uses Bashkir letters.

The Russian transcription writes schwa and short e alike (э). Here schwa is told apart: an
unstressed э in a word with a stress mark, and the function words de, het, een, te, je, ze, me, we.
The stress mark goes on the first letter of the stressed vowel.
"""
import re
import sys
import unicodedata

ACUTE = "́"
SCHWA_WORDS = {"de", "het", "een", "te", "je", "ze", "me", "we", "'t", "'n"}
SCHWA_TR = {"дэ", "эт", "тэ", "йэ", "зэ", "мэ", "вэ"}
VOWEL_UNITS = ["аа", "ээ", "ии", "оо", "үү", "өө", "эй", "әй", "өй", "ау", "а", "э", "и", "о", "у", "ү", "ө", "я", "ю"]

DIPHTHONGS = ["эй", "әй", "өй", "ау"]

# Vowel sounds: key "ə" is schwa, "э" short e. The Russian ij (әй) is the same sound as ei (эй).
VOWELS = {
    "en": {"а": "a", "аа": "aa", "э": "e", "ə": "uh", "ээ": "ay", "и": "i", "ии": "ee", "о": "o", "оо": "oh",
           "у": "oo", "ү": "ü", "үү": "üü", "өө": "ö", "ө": "ö", "өй": "öy", "эй": "ey", "ау": "ow", "я": "ya", "ю": "yu"},
    "es": {"а": "a", "аа": "aa", "э": "e", "ə": "e", "ээ": "ee", "и": "i", "ии": "ii", "о": "o", "оо": "oo",
           "у": "u", "ү": "ü", "үү": "üü", "өө": "ö", "ө": "ö", "өй": "öi", "эй": "ei", "ау": "au", "я": "ya", "ю": "yu"},
    # Brazilian: é open short e, ê the close e of schwa (a bare unstressed e would read as i).
    "pt": {"а": "a", "аа": "aa", "э": "é", "ə": "ê", "ээ": "ee", "и": "i", "ии": "ii", "о": "ó", "оо": "oo",
           "у": "u", "ү": "ü", "үү": "üü", "өө": "ö", "ө": "ö", "өй": "öi", "эй": "ei", "ау": "au", "я": "ia", "ю": "iu"},
    # Romanian: ă is the schwa itself.
    "ro": {"а": "a", "аа": "aa", "э": "e", "ə": "ă", "ээ": "ee", "и": "i", "ии": "ii", "о": "o", "оо": "oo",
           "у": "u", "ү": "ü", "үү": "üü", "өө": "ö", "ө": "ö", "өй": "öi", "эй": "ei", "ау": "au", "я": "ia", "ю": "iu"},
    "tr": {"а": "a", "аа": "aa", "э": "e", "ə": "ı", "ээ": "ee", "и": "i", "ии": "ii", "о": "o", "оо": "oo",
           "у": "u", "ү": "ü", "үү": "üü", "өө": "öö", "ө": "ö", "өй": "öy", "эй": "ey", "ау": "au", "я": "ya", "ю": "yu"},
}
CONS = {"т": "t", "д": "d", "р": "r", "н": "n", "к": "k", "л": "l", "п": "p", "ф": "f", "м": "m",
        "в": "v", "б": "b", "з": "z", "с": "s", "г": "g", "й": "y"}
LANG = {
    "en": {"х": "kh", "һ": "h", "ш": "sh", "ж": "zh", "ч": "ch", "ц": "ts"},
    "es": {"х": "j", "һ": "h", "ш": "sh", "ж": "zh", "ч": "ch", "ц": "ts"},
    "pt": {"х": "rr", "һ": "h", "ш": "ch", "ж": "j", "ч": "tch", "ц": "ts"},
    "tr": {"х": "h", "һ": "h", "ш": "ş", "ж": "j", "ч": "ç", "ц": "ts"},
    "ro": {"х": "h", "һ": "h", "ш": "ș", "ж": "j", "ч": "ci", "ц": "ț", "й": "i"},
}
# Letter names keep the plain vowels: the learner hears "bee", "kaa" in class.


def tokens(word):
    i, out = 0, []
    while i < len(word):
        unit = next((u for u in VOWEL_UNITS if word.startswith(u, i)), None)
        # A diphthong carries its stress mark after its first letter: ба́ут.
        split = next((u for u in DIPHTHONGS if word.startswith(u[0] + ACUTE + u[1:], i)), None)
        if split:
            i += len(split) + 1
            out.append(("V", split, True))
        elif unit:
            i += len(unit)
            stressed = word.startswith(ACUTE, i)
            if stressed:
                i += 1
            out.append(("V", unit, stressed))
        else:
            if word[i] != ACUTE:
                out.append(("C", word[i], False))
            i += 1
    return out


def convert_word(word, lang, dutch=None, schwa=False):
    toks = tokens(word)
    has_stress = any(s for _, _, s in toks)
    schwa_word = schwa or ((dutch or "").lower() in SCHWA_WORDS if dutch else word in SCHWA_TR)
    vow, cons = VOWELS[lang], {**CONS, **LANG[lang]}
    out = []
    for n, (kind, u, stressed) in enumerate(toks):
        nxt = toks[n + 1] if n + 1 < len(toks) else None
        prev = toks[n - 1] if n else None
        if kind == "V" and u == "у" and prev and prev[0] == "V" and lang != "tr":
            out.append("u" if lang == "ro" else "w")  # uw, ieuw, eeuw: a glide after a vowel
        elif kind == "V":
            if u == "э" and ((has_stress and not stressed) or schwa_word):
                u = "ə"
            s = vow["эй" if u == "әй" else u]
            # Before a final n the schwa keeps its h, so the n stays droppable: munéyruh(n).
            final_n = [t[1] for t in toks[n + 1:] if t[1] not in "()"] == ["н"]
            if lang == "en" and u == "ə" and nxt and nxt[0] == "C" and not final_n:
                s = "u"  # un, vun; a bare word-final u would read "you"
            if lang == "pt" and not stressed and s in ("é", "ó") and has_stress:
                s = {"é": "ê", "ó": "o"}[s]
            # A letter that already carries an accent (pt é, ó) shows the stress itself.
            marked = stressed and unicodedata.normalize("NFD", s[0]) == s[0]
            out.append(s[0] + ACUTE + s[1:] if marked else s)
        elif u == "ң":
            out.append("n" if nxt and nxt[1] == "к" else "ng")
        elif u == "ь":
            out.append("y" if nxt and nxt[0] == "V" else "")
        elif u == "г" and lang in ("es", "pt") and nxt and nxt[1] in ("э", "ээ", "и", "ии", "эй"):
            out.append("gu")
        elif lang == "ro" and u in ("к", "г", "ч"):
            front = nxt and nxt[0] == "V" and nxt[1] in ("э", "ээ", "и", "ии", "эй", "я", "ю")
            out.append({"к": "ch" if front else "c", "г": "gh" if front else "g", "ч": "c" if front else "ci"}[u])
        elif u == "с" and lang == "pt" and prev and prev[0] == "V" and nxt and nxt[0] == "V":
            out.append("ss")
        elif u == "й" and lang == "pt" and (not nxt or nxt[0] != "V"):
            out.append("i")
        elif u == "х" and lang == "pt" and (not prev or (nxt and nxt[1] == "р")):
            out.append("r")  # Brazilian initial r is the throat sound; before r one letter is enough
        else:
            out.append(cons.get(u, u))
    s = "".join(out)
    if lang == "ro":
        s = s.replace("ә", "ă")
    if lang == "en":
        s = s.replace("uhuh", "uh")
    return unicodedata.normalize("NFC", s)


def convert(tr, lang, back=None, schwa=False):
    parts = re.split(r"(\s+|[,.?!]+)", tr)
    words = [w for w in parts if w and not re.fullmatch(r"\s+|[,.?!]+", w)]
    dutch = re.findall(r"[\w'’-]+", back or "")
    if len(dutch) == len(words):
        aligned = dutch
    else:
        # Digits break the alignment; the article een is still the only эн in such a phrase.
        art = re.search(r"\been\b", back or "", re.I) and not re.search(r"\ben\b", back or "", re.I)
        aligned = ["een" if art and w == "эн" else None for w in words]
    it = iter(aligned)
    return "".join(p if not p or re.fullmatch(r"\s+|[,.?!]+", p)
                   else "-".join(convert_word(x, lang, next(it) if k == 0 else None, schwa)
                                 for k, x in enumerate(p.split("-")))
                   for p in parts)


if __name__ == "__main__":
    pairs = [a.split("=") for a in sys.argv[1:]]
    for lang in LANG:
        print(lang, " | ".join(convert(t, lang, b) for b, t in pairs))
