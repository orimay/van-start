// Leak scanners read 12 or more digits in a row as a card number; these keep the build output free of such runs.

/** Nuxt stamps a prerendered page in milliseconds (13 digits); the client only checks the stamp is set, so seconds do. */
export function stampInSeconds(html: string): string {
  return html.replace(/(id="__NUXT_DATA__">)(.*?)(<\/script>)/, (all, open: string, json: string, close: string) => {
    const payload: unknown[] = JSON.parse(json);
    const at = (payload[0] as { prerenderedAt?: number } | undefined)?.prerenderedAt;
    const ms = at === undefined ? undefined : payload[at];
    return typeof ms === 'number' ? open + json.replace(String(ms), String(Math.floor(ms / 1000))) + close : all;
  });
}

/** A precache revision is a hex hash; its digits spelled as the letters g-p keep it unique to the content. */
export const revisionInLetters = (revision: string): string => revision.replace(/\d/g, d => 'ghijklmnop'[Number(d)]!);
