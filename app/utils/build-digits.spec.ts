import { describe, expect, it } from 'vitest';
import { revisionInLetters, stampInSeconds } from './build-digits';

const CARD_NUMBER = /\d(?:[ -]?\d){11,}/;
const PAGE = '<body><div id="__nuxt"></div><script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__">[{"prerenderedAt":1,"serverRendered":2},1795691941038,false]</script></body>';

const payloadOf = (html: string): unknown[] => JSON.parse(/id="__NUXT_DATA__">(.*?)<\/script>/.exec(html)![1]!);

describe('a prerendered page', () => {
  it('holds no run of digits a leak scanner reads as a card number', () => {
    expect(stampInSeconds(PAGE)).not.toMatch(CARD_NUMBER);
  });

  it('still reads as prerendered, stamped in seconds', () => {
    expect(payloadOf(stampInSeconds(PAGE))).toEqual([{ prerenderedAt: 1, serverRendered: 2 }, 1795691941, false]);
  });

  it('is left alone when it carries no stamp', () => {
    const page = '<script type="application/json" id="__NUXT_DATA__">[{"serverRendered":1},false]</script>';
    expect(stampInSeconds(page)).toBe(page);
  });
});

describe('a precache revision', () => {
  it('holds no run of digits a leak scanner reads as a card number', () => {
    expect(revisionInLetters('de0bed626e6caf60b032545090856f34')).not.toMatch(/\d/);
  });

  it('stays distinct for distinct contents', () => {
    expect(revisionInLetters('0a')).not.toBe(revisionInLetters('a0'));
    expect(revisionInLetters('01')).not.toBe(revisionInLetters('10'));
  });
});
