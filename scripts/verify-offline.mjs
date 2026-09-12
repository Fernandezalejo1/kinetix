// Los callbacks de Playwright corren en el navegador, no en Node.
/* global caches, document, localStorage, navigator */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.argv[2] || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") console.log(msg.text()); });
  page.on('pageerror', error => { errors.push(error.message); console.log(error.message); });
  page.on('requestfailed', req => console.log('request failed', req.url()));
  await context.addInitScript(() => localStorage.setItem('kinetix_onboarding_v2', '1'));
  await page.goto('http://127.0.0.1:4174/manifest.json');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      reject(new Error(`SW timeout: ${reg?.installing?.state}/${reg?.active?.state}/${reg?.waiting?.state}`));
    }, 20000))]);
    const urls = await (await fetch('/precache-manifest.json')).json();
    const media = urls.filter(u => /\.(mp4|webm|mov|m4v|gif|avif)$/i.test(u));
    if (media.length) throw new Error(`precache manifest still lists ${media.length} heavy media files (e.g. ${media[0]})`);
    for (const url of urls) if (!await caches.match(url)) throw new Error(`Asset missing from cache: ${url}`);
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  for (const tab of ['hoy', 'workout', 'programs', 'exercises', 'analytics', 'nutrition', 'reto', 'objetivo']) {
    await page.goto(`http://127.0.0.1:4174/?tab=${tab}`);
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      return main?.textContent.trim().length > 20 && !main.textContent.includes('Cargando…');
    }, null, { timeout: 10000 }).catch(async error => { console.log(await page.locator('body').innerText()); await page.screenshot({path:'screenshots/offline-debug.png'}); throw error; });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`offline: ${tab} passed`);
  }
} finally { await browser.close(); }
