// Usage: node upd.mjs <serveRoot> <dirA> <dirB> [mode]
// Serves A, lets the SW take over, deploys B like deploy.sh, then counts what one reload brings.
// PLAYWRIGHT_CORE: path to playwright-core's index.mjs; CHROME: a Chromium binary.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
const [root, A, B, mode = 'reload'] = process.argv.slice(2);
const site = `${root}/van-start`;
const deploy = dir => execSync(`mkdir -p ${site}/_nuxt && rsync -ac --delete --exclude _nuxt ${dir}/ ${site}/ && rsync -ac ${dir}/_nuxt/ ${site}/_nuxt/`);
execSync(`rm -rf ${site}`); deploy(A);
const ctx = await chromium.launchPersistentContext(mkdtempSync('/tmp/upd-prof-'), { executablePath: process.env.CHROME, viewport: { width: 390, height: 844 } });
const page = ctx.pages()[0] ?? await ctx.newPage();
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6), ...a);
page.on('load', async () => { try { log('load', page.url(), await version()); } catch {} });
const probe = () => page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  const n = document.querySelector('#__nuxt')?.__vue_app__?.$nuxt;
  const st = w => w ? w.state : '-';
  return `active=${st(r?.active)} waiting=${st(r?.waiting)} installing=${st(r?.installing)} needRefresh=${n?.$pwa?.needRefresh} ctrl=${!!navigator.serviceWorker.controller}`;
});
const version = () => page.evaluate(() => window.__NUXT__?.config?.public?.version);
const base = 'http://127.0.0.1:8790/van-start/';
await page.goto(base); await page.waitForTimeout(6000);
await page.reload(); await page.waitForTimeout(6000);
log('controlled', await page.evaluate(() => !!navigator.serviceWorker.controller), 'version', await version());
deploy(B);
log('deployed B');
if (mode === 'reload') { await page.reload(); }
else { await page.goto(base); await page.waitForTimeout(3000); log('step: navigating in app'); await page.evaluate(() => document.querySelector('[data-testid="settings"]')?.click()); }
for (let i = 0; i < 12; i++) { await page.waitForTimeout(2500); try { log('now', page.url(), await version(), await probe()); } catch (e) { log('eval failed', e.message.slice(0, 60)); } }
await ctx.close();
