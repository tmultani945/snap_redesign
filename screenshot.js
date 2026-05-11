const puppeteer = require('puppeteer');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

const PORT = 3031;
const OUT  = path.join(__dirname, 'screenshots');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.jsx':  'text/plain',
  '.js':   'application/javascript',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function snap(page, name) {
  await sleep(600);
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
  await sleep(600);
}

async function clickRunTab(page, label) {
  await page.evaluate(label => {
    for (const el of document.querySelectorAll('.rep-tab')) {
      if (el.textContent.trim().startsWith(label)) { el.click(); return; }
    }
  }, label);
  await sleep(500);
}

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
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);

    console.log('\nCapturing screenshots…\n');

    // 01 — Dashboard top
    await page.evaluate(() => window.scrollTo(0, 0));
    await snap(page, '01-dashboard-top');

    // 02 — Dashboard — How it works section
    await page.evaluate(() => {
      document.querySelector('.tour')?.scrollIntoView({ behavior: 'instant' });
    });
    await snap(page, '02-dashboard-how-it-works');

    // 03 — Dashboard — Drive Testing section (scroll + wait for routes to load)
    await page.evaluate(() => window.scrollTo(0, 99999));
    await sleep(2800); // mock API 600ms delay + Leaflet tile fetch
    await snap(page, '03-dashboard-drive-testing');

    // 04 — Drive section — select second route (LBJ Freeway / Highway)
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.rt-card');
      if (cards[1]) cards[1].click();
    });
    await sleep(1200);
    await snap(page, '04-dashboard-drive-route2-selected');

    // 05 — Drive section — select third route (Plano / Suburban)
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.rt-card');
      if (cards[2]) cards[2].click();
    });
    await sleep(1200);
    await snap(page, '05-dashboard-drive-route3-selected');

    // 06 — Drive section — "Use this route" toast
    await page.evaluate(() => {
      const btn = document.querySelector('.rt-detail-foot .btn-primary');
      if (btn) btn.click();
    });
    await sleep(700);
    await snap(page, '06-dashboard-drive-toast');

    // 07 — Test Cases / Catalog
    await clickNav(page, 'Test Cases');
    await snap(page, '07-test-cases');

    // 08 — Configure (click first Configure button)
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === 'Configure');
      if (btn) btn.click();
    });
    await sleep(600);
    await snap(page, '08-configure');

    // 09 — Test Runs / History
    await clickNav(page, 'Test Runs');
    await snap(page, '09-test-runs');

    // 10 — Run Report (click first row in table)
    await page.evaluate(() => {
      const row = document.querySelector('table tbody tr');
      if (row) row.click();
    });
    await sleep(1800); // wait for Leaflet map + report to render
    await snap(page, '10-run-report-summary');

    // 11 — Run Report: Session tab
    await clickRunTab(page, 'Session');
    await sleep(400);
    await snap(page, '11-run-report-session');

    // 12 — Run Report: KPI Analysis tab
    await clickRunTab(page, 'KPI Analysis');
    await sleep(400);
    await snap(page, '12-run-report-kpi-analysis');

    // 13 — Run Report: Artifacts tab
    await clickRunTab(page, 'Artifacts');
    await sleep(400);
    await snap(page, '13-run-report-artifacts');

    // 14 — Reports
    await clickNav(page, 'Reports');
    await snap(page, '14-reports');

    // 15 — Devices
    await clickNav(page, 'Devices');
    await snap(page, '15-devices');

    // 16 — Settings
    await clickNav(page, 'Settings');
    await snap(page, '16-settings');

    console.log(`\n✅  16 screenshots saved to ./screenshots/\n`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
