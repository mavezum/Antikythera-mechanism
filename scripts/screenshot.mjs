import { chromium } from 'playwright-core';

const outDir = process.argv[2] ?? '.';
const exe =
  process.env.CHROMIUM_PATH ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
console.log('launching', exe);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
console.log('launched');
// reducedMotion makes camera flights instant, so low-fps software GL
// still yields deterministic shots (and exercises the a11y path).
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'reduce',
});

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto('http://localhost:4173/', { waitUntil: 'load', timeout: 30000 });
console.log('loaded');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/01-initial.png` });
console.log('shot 1');

// front view
await page.click('#view-front');
await page.waitForTimeout(5000);
await page.screenshot({ path: `${outDir}/02-front.png` });

// back view
await page.click('#view-back');
await page.waitForTimeout(5000);
await page.screenshot({ path: `${outDir}/03-back.png` });

// exploded + x-ray, side
await page.click('#view-side');
await page.fill('#explode', '1');
await page.dispatchEvent('#explode', 'input');
await page.check('#xray');
await page.waitForTimeout(5000);
await page.screenshot({ path: `${outDir}/04-exploded.png` });

// reset, isolate moon train
await page.fill('#explode', '0');
await page.dispatchEvent('#explode', 'input');
await page.uncheck('#xray');
await page.selectOption('#isolate', 'moon');
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/05-isolate-moon.png` });

// slice
await page.selectOption('#isolate', '');
await page.fill('#slice', '0.55');
await page.dispatchEvent('#slice', 'input');
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/06-slice.png` });

// tour step
await page.fill('#slice', '0');
await page.dispatchEvent('#slice', 'input');
await page.click('#btn-tour');
await page.waitForTimeout(5000);
await page.screenshot({ path: `${outDir}/07-tour.png` });

// glossary modal
await page.click('#tour-close');
await page.click('#btn-glossary');
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/08-glossary.png` });

// readings text for sanity
await page.keyboard.press('Escape');
const readings = await page.textContent('#readings');
console.log('READINGS:', readings?.replace(/\s+/g, ' ').slice(0, 600));

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO PAGE ERRORS');
await browser.close();
