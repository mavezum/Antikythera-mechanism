// Interaction smoke test: crank drag, hover tooltip, click-to-isolate.
import { chromium } from 'playwright-core';

const exe =
  process.env.CHROMIUM_PATH ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(2500);

// side view so the crank (right side of case) is visible & hittable
await page.click('#view-side');
await page.waitForTimeout(2000);

const before = await page.textContent('#readings');

// crank drag: press near where the crank grip should project, drag down.
// Find it by probing: hover across the right half until cursor turns 'grab'.
let crankPt = null;
for (let x = 500; x <= 900 && !crankPt; x += 25) {
  for (let y = 250; y <= 550; y += 25) {
    await page.mouse.move(x, y);
    const cur = await page.evaluate(() => document.querySelector('canvas').style.cursor);
    if (cur === 'grab') {
      crankPt = { x, y };
      break;
    }
  }
}
console.log('crank found at:', crankPt);
if (crankPt) {
  await page.mouse.move(crankPt.x, crankPt.y);
  await page.mouse.down();
  await page.mouse.move(crankPt.x, crankPt.y + 160, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await page.textContent('#readings');
  console.log('readings changed after crank drag:', before !== after);
}

// hover tooltip over the centre of the case (should hit something)
await page.mouse.move(640, 400);
await page.waitForTimeout(300);
const tipHidden = await page.evaluate(() => document.getElementById('tooltip').hidden);
const tipText = await page.textContent('#tooltip');
console.log('tooltip visible:', !tipHidden, '| text:', (tipText ?? '').slice(0, 60));

// click-to-isolate: front view, click on the front dial face
await page.click('#view-front');
await page.waitForTimeout(2000);
await page.mouse.click(640, 320);
await page.waitForTimeout(400);
const isoVal = await page.evaluate(() => document.getElementById('isolate').value);
console.log('isolate after dial click:', JSON.stringify(isoVal));

// keyboard: arrow key cranking
const b4 = await page.textContent('#readings');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(2000);
const aft = await page.textContent('#readings');
console.log('readings changed after ArrowRight:', b4 !== aft);

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO PAGE ERRORS');
await browser.close();
