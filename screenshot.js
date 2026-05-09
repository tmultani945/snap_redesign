const puppeteer = require('puppeteer');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

const PORT = 3030;
const OUT  = path.join(__dirname, 'screenshots');

// ── static file server ────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.jsx':  'text/plain',
  '.js':   'application/javascript',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.md':   'text/markdown',
  '.json': 'application/json',
};

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const abs = path.join(__dirname, rel);
    fs.readFile(abs, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'text/plain' });
      res.end(data);
    });
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function snap(page, name) {
  await sleep(800);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✓  ${name}.png`);
}

async function clickNav(page, label) {
  await page.evaluate(label => {
    for (const el of document.querySelectorAll('.nav-item')) {
      if (el.textContent.trim().startsWith(label)) { el.click(); return; }
    }
  }, label);
  await sleep(500);
}

async function clickRunTab(page, label) {
  await page.evaluate(label => {
    for (const el of document.querySelectorAll('.run-tab')) {
      if (el.textContent.trim() === label) { el.click(); return; }
    }
  }, label);
  await sleep(500);
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const server = createServer();
  await new Promise(r => server.listen(PORT, r));
  console.log(`\nServer → http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Initial load — wait for Babel to fetch + transpile all JSX files
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);

    console.log('\nCapturing screenshots…\n');

    // 01 — Dashboard
    await snap(page, '01-dashboard');

    // 02 — Test Cases / Catalog
    await clickNav(page, 'Test Cases');
    await snap(page, '02-test-cases');

    // 03 — Configure (click first Configure button on catalog page)
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent.includes('Configure'));
      if (btn) btn.click();
    });
    await sleep(600);
    await snap(page, '03-configure');

    // 04 — Test Runs / History
    await clickNav(page, 'Test Runs');
    await snap(page, '04-test-runs');

    // 05 — Run Detail: Live tab (click a PROGRESS run row)
    await page.evaluate(() => {
      const row = document.querySelector('table tbody tr');
      if (row) row.click();
    });
    await sleep(600);
    await snap(page, '05-run-detail-live');

    // 06 — Run Detail: Summary tab
    await clickRunTab(page, 'Summary');
    await snap(page, '06-run-detail-summary');

    // 07 — Run Detail: Session tab
    await clickRunTab(page, 'Session');
    await snap(page, '07-run-detail-session');

    // 08 — Run Detail: Artifact tab
    await clickRunTab(page, 'Artifact');
    await snap(page, '08-run-detail-artifact');

    // 09 — Reports
    await clickNav(page, 'Reports');
    await snap(page, '09-reports');

    // 10 — Devices
    await clickNav(page, 'Devices');
    await snap(page, '10-devices');

    // 11 — Settings
    await clickNav(page, 'Settings');
    await snap(page, '11-settings');

    console.log(`\n✅  11 screenshots saved to ./screenshots/\n`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
