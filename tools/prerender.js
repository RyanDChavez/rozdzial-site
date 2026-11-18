// Writes the app preview's opening window (the novel's first scene, as app.js first draws it) into index.html, so the page's
// first paint shows the window filled, before any script has loaded. app.js draws the same window again when it runs.
//
// Run it from the site's folder after changing app.js, styles.css or the samples (tools/make-samples.py):
//   node tools/prerender.js
// It needs Playwright with its Chromium (`require('playwright')`, or set PLAYWRIGHT to the package's folder).
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const site = path.resolve(__dirname, '..');
const file = path.join(site, 'index.html');
const start = '<!-- prerender: the window as app.js first draws it (tools/prerender.js) -->';
const end = '<!-- /prerender -->';

(async () => {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a) throw new Error('index.html has no prerender markers');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  // The page as it is without the drawing, so the window is drawn from scratch.
  await page.goto('file://' + file);
  await page.waitForFunction(() => window.__mockHydrated);
  const inner = await page.evaluate(() => {
    const win = document.getElementById('app-window').cloneNode(true);
    // A wide page's comment card stays (its place is the same at every wide width); any other is placed by the text's lines.
    win.querySelectorAll('.m-margin > :not(.wide)').forEach((m) => m.remove());
    win.querySelectorAll('#view-board, #view-book').forEach((v) => v.replaceChildren());
    win.querySelector('#m-outline').removeAttribute('style');
    const body = win.querySelector('.win-body');
    return [win.querySelector('.titlebar').outerHTML, body.outerHTML].join('\n');
  });
  await browser.close();
  const indent = '        ';
  const out = html.slice(0, a + start.length) + '\n' + indent + inner + '\n' + indent + html.slice(b);
  fs.writeFileSync(file, out);
  console.log(`index.html: ${inner.length} characters of prerendered window`);
})();
