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
