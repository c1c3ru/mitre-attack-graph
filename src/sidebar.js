/**
 * Painel lateral executivo: resumo legível do nó selecionado.
 */
import { groupProfile, tacticBreakdown, topMitigations } from './data.js';
import { fmtDate, fmtNumber, getLang, mitigationLabel, platformLabel, t, tacticLabel, tn } from './i18n.js';

/** Listas com mais itens que isto exibem o restante sob "Mostrar mais N". */
const LIST_LIMIT = 10;

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createSidebar(el, ds, { onNavigate, onAddGroup, getState }) {
  let currentId = null;

  el.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) onNavigate(nav.dataset.nav);
    const add = e.target.closest('[data-add-group]');
    if (add) onAddGroup(add.dataset.addGroup);
  });
  // Atualiza o rótulo "Mostrar mais N" / "Mostrar menos" ao abrir/fechar
  el.addEventListener(
    'toggle',
    (e) => {
      const d = e.target;
      if (!d.matches?.('details.more')) return;
      d.querySelector('summary').textContent = d.open ? t('sb.showLess') : t('sb.showMore', { n: fmtNumber(Number(d.dataset.count)) });
    },
    true,
  );

  /** Envolve os itens excedentes em um <details> expansível. */
  function expandable(items, render, wrap) {
    const head = items.slice(0, LIST_LIMIT).map(render).join('');
    const rest = items.slice(LIST_LIMIT);
    if (!rest.length) return wrap(head);
    return `${wrap(head)}<details class="more" data-count="${rest.length}">
      <summary>${t('sb.showMore', { n: fmtNumber(rest.length) })}</summary>${wrap(rest.map(render).join(''))}</details>`;
  }

  function description(n) {
    if (getLang() === 'pt' && n.description_pt) return `<p class="sb-desc">${esc(n.description_pt)}</p>`;
    if (!n.description) return `<p class="sb-desc">${t('sb.noDesc')}</p>`;
    const note = getLang() === 'pt' ? `<p class="sb-note">${t('sb.descEnOnly')}</p>` : '';
    return `<p class="sb-desc" lang="en">${esc(n.description)}</p>${note}`;
  }

  function header(n) {
    const subtype = n.subtype ? ` · ${t(`subtype.${n.subtype}`)}` : '';
    return `
      <span class="sb-type"><i class="dot ${n.type}"></i>${t(`type.${n.type}`)}${subtype}</span>
      <h2 class="sb-title">${esc(n.name)}</h2>
      <a class="sb-id" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.id)} · ${t('sb.viewOn')} ↗</a>
      ${n.aliases?.length ? `<div class="sb-aliases">${t('sb.aliases')}: ${esc(n.aliases.slice(0, 8).join(', '))}</div>` : ''}
      ${description(n)}`;
  }

  const kpis = (items) =>
    `<div class="kpis">${items.map(([v, l]) => `<div class="kpi"><b>${fmtNumber(v)}</b><span>${t(l)}</span></div>`).join('')}</div>`;

  function bars(rows) {
    if (!rows.length) return `<p class="muted">${t('sb.noData')}</p>`;
    const max = Math.max(...rows.map((r) => r.count));
    return `<div class="bars">${rows
      .map(
        (r) => `<div class="bar-row"><span class="bar-label" title="${esc(r.name)}">${esc(r.name)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.count / max) * 100}%"></div></div>
          <span class="bar-val">${fmtNumber(r.count)}</span></div>`,
      )
      .join('')}</div>`;
  }

  function itemList(nodes, { extra } = {}) {
    if (!nodes.length) return `<p class="muted">${t('sb.noItems')}</p>`;
    return expandable(
      nodes,
      (n) => `<li class="clickable" data-nav="${esc(n.id)}"><span class="iid">${esc(n.id)}</span><span>${esc(n.name)}${extra ? ` <span class="muted">${extra(n)}</span>` : ''}</span></li>`,
      (html) => `<ul class="item-list">${html}</ul>`,
    );
  }

  function mitigationList(ms) {
    if (!ms.length) return `<p class="muted">${t('sb.noMitigations')}</p>`;
    return expandable(
      ms,
      (m) => `<li><span class="iid">${esc(m.id)}</span><span title="${esc(m.name)}">${esc(mitigationLabel(m))}${m.count ? ` <span class="muted">· ${t('sb.covers')} ${tn(m.count, 'n.technique')}</span>` : ''}</span></li>`,
      (html) => `<ul class="item-list">${html}</ul>`,
    );
  }

  const pills = (values, label = (v) => v) =>
    `<div class="pill-list">${values.map((v) => `<span class="pill static">${esc(label(v))}</span>`).join('')}</div>`;

  const section = (title, body) => `<div class="sb-section"><h3>${t(title)}</h3>${body}</div>`;

  function renderGroup(n) {
    const { viaSoftware } = getState();
    const p = groupProfile(ds, n.id, { viaSoftware });
    const swByUse = p.software
      .map((s) => ({ ...s, uses: ds.out.get(s.id)?.size ?? 0 }))
      .sort((a, b) => b.uses - a.uses);
    const selected = getState().groups.includes(n.id);
    return `${header(n)}
      ${selected ? '' : `<button type="button" data-add-group="${esc(n.id)}">${t('sb.addToGraph')}</button>`}
      ${kpis([
        [p.software.length, 'kpi.software'],
        [p.direct.size, 'kpi.directTech'],
        [p.techniques.length, viaSoftware ? 'kpi.totalTech' : 'kpi.tech'],
      ])}
      ${section('sec.tactics', bars(tacticBreakdown(ds, p.techniques)))}
      ${section('sec.topMitigations', mitigationList(topMitigations(p.techniques, 8)))}
      ${section('sec.arsenal', itemList(swByUse, { extra: (s) => `· ${tn(s.uses, 'n.technique')}` }))}`;
  }

  function renderSoftware(n) {
    const techniques = [...(ds.out.get(n.id) ?? [])].map((id) => ds.byId.get(id));
    const groups = [...(ds.inc.get(n.id) ?? [])].map((id) => ds.byId.get(id)).filter((x) => x.type === 'group');
    return `${header(n)}
      ${kpis([
        [groups.length, 'kpi.groups'],
        [techniques.length, 'kpi.tech'],
        [n.platforms?.length ?? 0, 'kpi.platforms'],
      ])}
      ${n.platforms?.length ? section('sec.platforms', pills(n.platforms, platformLabel)) : ''}
      ${section('sec.tactics', bars(tacticBreakdown(ds, techniques)))}
      ${section('sec.topMitigations', mitigationList(topMitigations(techniques, 6)))}
      ${section('sec.usedByGroups.sw', groupPills(groups))}`;
  }

  function renderTechnique(n) {
    const users = [...(ds.inc.get(n.id) ?? [])].map((id) => ds.byId.get(id));
    const groups = users.filter((u) => u.type === 'group');
    const software = users.filter((u) => u.type === 'software').sort((a, b) => a.name.localeCompare(b.name));
    const tactics = (n.tactics ?? []).map((s) => ds.tacticByShort.get(s)).filter(Boolean);
    return `${header(n)}
      ${kpis([
        [groups.length, 'kpi.groups'],
        [software.length, 'kpi.software'],
        [n.mitigations?.length ?? 0, 'kpi.mitigations'],
      ])}
      ${section('sec.tacticsList', tactics.length ? pills(tactics, tacticLabel) : '<span class="muted">—</span>')}
      ${n.platforms?.length ? section('sec.platforms', pills(n.platforms, platformLabel)) : ''}
      ${section('sec.mitigations', mitigationList(n.mitigations ?? []))}
      ${section('sec.usedByGroups.tech', groupPills(groups))}
      ${section('sec.implementedBy', itemList(software))}`;
  }

  function groupPills(groups) {
    if (!groups.length) return `<p class="muted">${t('sb.noGroups')}</p>`;
    const sel = new Set(getState().groups);
    return expandable(
      [...groups].sort((a, b) => a.name.localeCompare(b.name)),
      (g) =>
        `<span class="pill" ${sel.has(g.id) ? `data-nav="${esc(g.id)}"` : `data-add-group="${esc(g.id)}" title="${t('sb.addToGraph.title')}"`}>${sel.has(g.id) ? '' : '+ '}${esc(g.name)}</span>`,
      (html) => `<div class="pill-list">${html}</div>`,
    );
  }

  function renderEmpty() {
    const m = ds.meta;
    return `<div class="empty-state">
      <h2>${t('empty.title')}</h2>
      <p>${t('empty.lead')}</p>
      <ol>
        <li>${t('empty.step1')}</li>
        <li>${t('empty.step2')}</li>
        <li>${t('empty.step3')}</li>
      </ol>
      ${kpis([
        [m.counts.groups, 'kpi.groups'],
        [m.counts.software, 'kpi.software'],
        [m.counts.techniques, 'kpi.tech'],
      ])}
      <p class="meta-line">${t('empty.source', { source: esc(m.source), version: esc(m.version ?? '?'), date: esc(fmtDate(m.modified)) })}</p>
    </div>`;
  }

  function render(id) {
    currentId = id;
    const n = id ? ds.byId.get(id) : null;
    if (!n) el.innerHTML = renderEmpty();
    else if (n.type === 'group') el.innerHTML = renderGroup(n);
    else if (n.type === 'software') el.innerHTML = renderSoftware(n);
    else el.innerHTML = renderTechnique(n);
    el.parentElement.scrollTop = 0;
  }

  return { render, rerender: () => render(currentId) };
}
