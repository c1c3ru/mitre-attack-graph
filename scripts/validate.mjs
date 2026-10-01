#!/usr/bin/env node
/**
 * Validação automatizada: abre a aplicação em um Chromium sem interface gráfica, verifica se o SVG
 * criou <circle>, <line> e <text>, se não há erros no console, e testa o clique e o destaque.
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
const modalOpen = () => page.$eval('#detail-modal', (d) => d.open);
/** Termos frequentes em inglês que não deveriam aparecer no texto visível em PT (exceto nomes próprios). */
const EN_WORDS = /\b(the|and|with|which|that|from|used|uses|may|adversar(?:y|ies)|has been|have been|this|their|its|via the|such as)\b/i;
/** Termos técnicos consagrados em inglês, usados assim também em português. */
const EN_ALLOWED = /pass[- ]the[- ](hash|ticket|cookie)|mark-of-the-web|living off the land|adversary-in-the-middle|the lamberts|she took his coat and hung it up/gi;
const englishIn = (sel) =>
  page.$$eval(sel, (els, [src, allowed]) => {
    const re = new RegExp(src, 'i');
    const ok = new RegExp(allowed, 'gi');
    return els.map((e) => e.innerText.replace(ok, '')).filter((txt) => re.test(txt)).map((txt) => txt.slice(0, 120));
  }, [EN_WORDS.source, EN_ALLOWED.source]);
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

// Lista longa (> 10 softwares): "Mostrar mais N" expande os itens restantes (grupo ainda selecionado)
report.listVisibleBefore = await page.$$eval('.sb-section .item-list li', (els) => els.filter((e) => e.checkVisibility()).length);
report.moreSummary = (await page.textContent('details.more > summary'))?.trim();
await page.click('details.more > summary');
await page.waitForTimeout(200);
report.listVisibleAfter = await page.$$eval('.sb-section .item-list li', (els) => els.filter((e) => e.checkVisibility()).length);
report.moreSummaryOpen = (await page.textContent('details.more > summary'))?.trim();
report.descriptionPt = (await page.textContent('.sb-desc')).slice(0, 60);
if (shots) await page.screenshot({ path: `${shots}/05-lista-expandida.png` });

// Troca de idioma PT -> EN -> PT
await page.click('#lang-switch [data-lang="en"]');
await page.waitForTimeout(300);
report.en = {
  htmlLang: await page.getAttribute('html', 'lang'),
  label: await page.textContent('label[for="tactic-filter"]'),
  stats: await page.textContent('#graph-stats'),
  section: await page.textContent('.sb-section h3'),
  description: (await page.textContent('.sb-desc')).slice(0, 60),
};
if (shots) await page.screenshot({ path: `${shots}/06-ingles.png` });
await page.click('#lang-switch [data-lang="pt"]');
await page.waitForTimeout(300);
report.backToPt = await page.textContent('label[for="tactic-filter"]');
await page.click('#graph', { position: { x: 5, y: 5 } });

// ---------- Submenus do painel (grupo selecionado) ----------
await page.click('#graph .node.group');
await page.waitForTimeout(400);
report.submenus = {};
const sm = report.submenus;
// Barra de tática -> aplica o filtro; segundo clique remove
const nodesBefore = await count('#graph .node');
const bar = await page.$('.bar-row[data-tactic]');
const barTactic = await bar.getAttribute('data-tactic');
await bar.click();
await page.waitForTimeout(500);
sm.barFilter = await page.$eval('#tactic-filter', (s) => s.value);
sm.barPressed = await page.getAttribute(`.bar-row[data-tactic="${barTactic}"]`, 'aria-pressed');
sm.nodesFiltered = await count('#graph .node');
await page.click(`.bar-row[data-tactic="${barTactic}"]`);
await page.waitForTimeout(500);
sm.barFilterCleared = (await page.$eval('#tactic-filter', (s) => s.value)) === '';
sm.nodesRestored = (await count('#graph .node')) === nodesBefore;
// KPI -> rola até a seção e destaca
await page.click('button.kpi[data-jump]');
await page.waitForTimeout(200);
sm.kpiFlash = await count('.sb-section.flash');
// Mitigação -> modal de detalhes -> navegação para técnica
await page.click('[data-mitigation]');
await page.waitForTimeout(300);
sm.mitigationModalOpen = await modalOpen();
sm.mitigationModalTitle = await page.textContent('#detail-modal-title');
sm.mitigationModalItems = await count('#detail-modal [data-nav]');
if (shots) await page.screenshot({ path: `${shots}/07-modal-mitigacao.png` });
const navTarget = await page.getAttribute('#detail-modal [data-nav]', 'data-nav');
await page.click('#detail-modal [data-nav]');
await page.waitForTimeout(800);
sm.modalClosedOnNav = !(await modalOpen());
sm.navigatedTo = await page.textContent('.sb-title');
sm.navigatedOk = (await page.textContent('.sb-id')).startsWith(navTarget);
// Técnica: pílula de tática (filtro) e de plataforma (modal)
const pill = await page.$('.pill[data-tactic]');
const pillTactic = await pill.getAttribute('data-tactic');
await pill.click();
await page.waitForTimeout(500);
sm.pillFilter = (await page.$eval('#tactic-filter', (s) => s.value)) === pillTactic;
sm.pillPressed = await page.getAttribute(`.pill[data-tactic="${pillTactic}"]`, 'aria-pressed');
await page.click(`.pill[data-tactic="${pillTactic}"]`);
await page.waitForTimeout(500);
sm.pillFilterCleared = (await page.$eval('#tactic-filter', (s) => s.value)) === '';
await page.click('.pill[data-platform]');
await page.waitForTimeout(300);
sm.platformModalOpen = await modalOpen();
sm.platformModalTitle = await page.textContent('#detail-modal-title');
sm.platformModalItems = await count('#detail-modal [data-nav]');
if (shots) await page.screenshot({ path: `${shots}/08-modal-plataforma.png` });
sm.englishInModal = await englishIn('#detail-modal .modal-content');
await page.click('#detail-modal [data-close]');
await page.waitForTimeout(200);
sm.closeButtonWorks = !(await modalOpen());
await page.click('[data-mitigation]');
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
sm.escapeCloses = !(await modalOpen());
// Item de software da lista (botão acessível por teclado)
const swBtn = await page.$('.item-btn[data-nav]');
if (swBtn) {
  await swBtn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  sm.keyboardNav = await page.textContent('.sb-type');
}
sm.inertSpans = await count('#sidebar span[data-nav], #sidebar li[data-nav], #sidebar span[data-add-group], .pill.static');
sm.englishInSidebar = await englishIn('#sidebar .sb-desc, #sidebar .sb-title, #sidebar .item-name, #sidebar h3');
sm.englishLabels = await page.$$eval('#graph text.label.technique', (els) =>
  els.map((e) => e.textContent.replace(/pass the (hash|ticket)|mark-of-the-w/i, '')).filter((txt) => /\b(and|of|the|with|from)\b/i.test(txt)).slice(0, 5),
);

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
const S = report.submenus;
const submenusOk =
  S.barFilter && S.barPressed === 'true' && S.barFilterCleared && S.nodesRestored && S.kpiFlash > 0 &&
  S.mitigationModalOpen && S.mitigationModalItems > 0 && S.modalClosedOnNav && S.navigatedOk &&
  S.pillFilter && S.pillPressed === 'true' && S.pillFilterCleared && S.platformModalOpen && S.closeButtonWorks && S.escapeCloses &&
  S.inertSpans === 0;
const ptOk = !S.englishInModal.length && !S.englishInSidebar.length && !S.englishLabels.length;
console.log({ submenusOk, ptOk });
const ok = submenusOk && ptOk && report.listVisibleAfter > report.listVisibleBefore && report.en.label === 'Tactic' && report.backToPt === 'Tática' && report.circles > 0 && report.lines > 0 && report.texts > 0 && errors.length === 0 && report.focusMode;
console.log(ok ? '\nVALIDAÇÃO OK' : '\nVALIDAÇÃO FALHOU');
process.exit(ok ? 0 : 1);
