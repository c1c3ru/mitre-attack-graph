#!/usr/bin/env node
/**
 * Validação automatizada: abre a app num Chromium headless, confere se o SVG
 * criou <circle>, <line> e <text>, se não há erros no console, e testa clique/destaque.
 * Uso: npm run dev (em outro terminal) e depois node scripts/validate.mjs [url] [pasta-screenshots]
 */
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const shots = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url);
await page.waitForSelector('#graph circle', { timeout: 15000 });
await page.waitForTimeout(4000);

const count = (sel) => page.$$eval(sel, (els) => els.length);
const report = {
  circles: await count('#graph circle'),
  lines: await count('#graph line'),
  texts: await count('#graph text'),
  groups: await count('#graph .node.group'),
  software: await count('#graph .node.software'),
  techniques: await count('#graph .node.technique'),
  stats: await page.textContent('#graph-stats'),
};
if (shots) await page.screenshot({ path: `${shots}/01-inicial.png` });

// Clique no grupo -> destaque + sidebar
await page.click('#graph .node.group');
await page.waitForTimeout(400);
report.sidebarTitle = await page.textContent('.sb-title');
report.highlighted = await count('#graph .node.hl');
report.focusMode = await page.$eval('#graph', (s) => s.classList.contains('has-focus'));
if (shots) await page.screenshot({ path: `${shots}/02-grupo-selecionado.png` });

// Clique numa técnica -> mitigações no painel
await page.$eval('#graph .node.technique', (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await page.waitForTimeout(400);
report.techniqueTitle = await page.textContent('.sb-title');
report.mitigationsSection = (await page.textContent('#sidebar')).includes('Mitigações');
if (shots) await page.screenshot({ path: `${shots}/03-tecnica.png` });

// Busca no dropdown e adição de um 2º grupo
await page.fill('#group-search', 'Lazarus');
await page.keyboard.press('Enter');
await page.waitForTimeout(3500);
report.groupsAfterAdd = await count('#graph .node.group');
report.chips = await page.$$eval('.chip', (c) => c.map((x) => x.textContent.replace('×', '').trim()));
if (shots) await page.screenshot({ path: `${shots}/04-dois-grupos.png` });

// Responsividade da thread principal: mede atraso máximo de frame durante a simulação
report.maxFrameGapMs = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let last = performance.now(), max = 0, n = 0;
      const step = (t) => {
        max = Math.max(max, t - last);
        last = t;
        if (++n < 90) requestAnimationFrame(step);
        else resolve(Math.round(max));
      };
      document.querySelector('#btn-reset').click();
      requestAnimationFrame(step);
    }),
);

report.consoleErrors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
const ok = report.circles > 0 && report.lines > 0 && report.texts > 0 && errors.length === 0 && report.focusMode;
console.log(ok ? '\nVALIDAÇÃO OK' : '\nVALIDAÇÃO FALHOU');
process.exit(ok ? 0 : 1);
