// Quick error probe: load the page headless and print any page errors.
import { chromium } from 'playwright-core';

const exe =
  process.env.CHROMIUM_PATH ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.stack ?? e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    console.log(`CONSOLE[${m.type()}]:`, m.text().slice(0, 400));
});
await page.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(4000);
console.log('done');
await browser.close();
