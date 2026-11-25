/** Linear sRGB of an `oklch(L C H)` colour, L a fraction or a percentage, spaces or Tailwind's `_`; or of a `#rrggbb` hex. */
function linearOf(colour: string) {
  if (colour.startsWith('#')) return [1, 3, 5].map(i => parseInt(colour.slice(i, i + 2), 16) / 255).map(x => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  const [, l, percent, c, h] = colour.match(/oklch\(([\d.]+)(%?)[_ ]([\d.]+)[_ ]([\d.]+)\)/)!;
  const L = Number(l) / (percent ? 100 : 1);
  const a = Number(c) * Math.cos((Number(h) * Math.PI) / 180);
  const b = Number(c) * Math.sin((Number(h) * Math.PI) / 180);
  const [lm, mm, sm] = [L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.291485548 * b].map(x => x ** 3) as [number, number, number];
  return [4.0767416621 * lm - 3.3077115913 * mm + 0.2309699292 * sm, -1.2684380046 * lm + 2.6097574011 * mm - 0.3413193965 * sm, -0.0041960863 * lm - 0.7034186147 * mm + 1.707614701 * sm].map(x => Math.min(1, Math.max(0, x)));
}

/** WCAG contrast between two colours, each an `oklch(...)` or a `#rrggbb` hex. */
export function contrastOf(colour: string, background: string) {
  const luminance = (v: number[]) => 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
  const [hi, lo] = [luminance(linearOf(colour)), luminance(linearOf(background))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** A Tailwind colour token (`stone-500`, `white`, `[oklch(...)]`) as a colour `contrastOf` reads, from Tailwind's `theme.css`. */
function colourOf(token: string, palette: string) {
  if (token.startsWith('[')) return token.slice(1, -1);
  if (token === 'white') return '#ffffff';
  if (token === 'black') return '#000000';
  return palette.match(new RegExp(`--color-${token}: (oklch\\([^)]+\\));`))?.[1];
}

/** The colour token a class list gives one slot (`text` or `bg`) in a theme, if it sets one; the dark theme falls back to the light class. */
function tokenOf(classes: string[], slot: 'text' | 'bg', dark: boolean) {
  const token = (prefix: string) => classes.map(c => c.match(new RegExp(`^${prefix}${slot}-((?:[a-z]+-\\d+)|white|black|\\[oklch\\([^\\]]+\\)\\])$`))?.[1]).find(Boolean);
  return (dark && token('dark:')) || token('');
}

/**
 * Every rendered text under `root` that falls short of WCAG AA in a theme, read off its Tailwind classes:
 * the text colour from the nearest element setting one, the background from the nearest painting one, else `page`.
 * Large text (bold at 20px, or 24px and up) needs 3:1, the rest 4.5:1.
 */
export function lowContrastIn(root: Element, dark: boolean, palette: string, page: string) {
  const nearest = (el: Element, find: (classes: string[]) => string | undefined) => {
    for (let e: Element | null = el; e; e = e.parentElement) {
      const found = find([...e.classList]);
      if (found) return found;
    }
  };
  const large = (el: Element) => {
    const size = nearest(el, cs => cs.find(c => /^text-(xs|sm|base|lg|xl|[2-9]xl)$/.test(c))) ?? 'text-base';
    return /[2-9]xl$/.test(size) || (size === 'text-xl' && !!nearest(el, cs => cs.find(c => /^font-(bold|extrabold|black)$/.test(c))));
  };
  return [root, ...root.querySelectorAll('*')]
    .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()) && !el.closest('.invisible, [aria-hidden="true"]'))
    .flatMap(el => {
      const text = nearest(el, cs => tokenOf(cs, 'text', dark));
      if (!text) return [];
      const background = nearest(el, cs => tokenOf(cs, 'bg', dark));
      const ratio = contrastOf(colourOf(text, palette)!, background ? colourOf(background, palette)! : page);
      return ratio < (large(el) ? 3 : 4.5) ? [`${ratio.toFixed(2)} ${el.textContent!.trim().slice(0, 30)}`] : [];
    });
}
