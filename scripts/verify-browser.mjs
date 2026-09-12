// Usage: node scripts/verify-browser.mjs <absolute playwright package directory>
// Uses an isolated browser context; never opens the user's browser profile.
// Los callbacks de page.evaluate corren en el navegador, no en Node.
/* global document, localStorage */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/manifest.json');
  const result = await page.evaluate(async () => {
    const { replaceArchive, idbBackupSave, idbBackupList, collectFullState, replaceFullState,
      hydrateFromArchive, resumeHistoryWrites, mirrorHistoryToArchive } = await import('/scripts/browser-entry.ts');
    const check = (ok, message) => { if (!ok) throw new Error(message); };
    const workout = id => ({ id, date: '2026-01-01T10:00:00.000Z', routineName: 'Push', durationSeconds: 600, totalVolumeKg: 800, totalSets: 1, exercises: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 10, completed: true }] }] });
    const history = Array.from({ length: 250 }, (_, i) => workout(String(i)));
    await replaceArchive({ workoutHistory: history, nutritionHistory: [{ date: '2020-01-01', meals: [] }] }, true);
    localStorage.setItem('kinetix_workout_history', JSON.stringify(history.slice(0, 10)));
    check((await collectFullState()).kinetix_workout_history.length === 250, 'export lost archive');
    await mirrorHistoryToArchive({ workoutHistory: history, exerciseHistory: [], bodyMetrics: [], nutritionHistory: [{ date: '2026-01-01', meals: [] }] });
    check((await hydrateFromArchive()).nutritionHistory.length === 2, 'nutrition truncated');
    await replaceFullState({ kinetix_workout_history: [workout('restored')] });
    check((await hydrateFromArchive()).workoutHistory[0].id === 'restored', 'restore mixed archive');
    check((await hydrateFromArchive()).workoutHistory.length === 1, 'old records resurrected');
    resumeHistoryWrites();
    await idbBackupSave('test', { kinetix_workout_history: history });
    await replaceFullState({}, true);
    check((await hydrateFromArchive()).workoutHistory === null, 'wipe left archive');
    check((await idbBackupList()).length === 0, 'wipe left backups');
    check(localStorage.length === 0, 'wipe left local keys');
    return 'native IndexedDB: complete export, restore, nutrition retention and wipe passed';
  });
  console.log(result);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('dialog').first().waitFor();
  await page.getByTitle('Omitir').click();
  await page.locator('#today-hub').waitFor();
  await page.getByRole('button', { name: 'Abrir configuración' }).click();
  await page.getByRole('dialog', { name: 'Configuración', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Exportar datos cifrado (con contraseña)', exact: true }).click();
  const password = page.getByRole('dialog', { name: 'Exportar backup cifrado', exact: true });
  await password.waitFor();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    if (!await password.evaluate(el => el.contains(document.activeElement))) throw new Error('focus escaped nested dialog');
  }
  await password.getByRole('button', { name: 'Cancelar', exact: true }).click();
  console.log('nested dialog keeps keyboard focus');
  await page.screenshot({ path: 'screenshots/verification-settings-mobile.png', fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('mobile app opens settings without runtime errors');
} finally { await browser.close(); }
