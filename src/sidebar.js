/**
 * Painel lateral executivo: resumo legível do nó selecionado.
 * Todos os itens interativos são <button> (mouse e teclado); a ação é resolvida
 * por delegação de eventos pelos atributos data-*.
 */
import { groupProfile, tacticBreakdown, topMitigations } from './data.js';
import { fmtDate, fmtNumber, getLang, mitigationLabel, nodeName, platformLabel, t, tacticLabel, tn } from './i18n.js';

/** Listas com mais itens que isto exibem o restante sob "Mostrar mais N". */
const LIST_LIMIT = 10;

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const byName = (a, b) => nodeName(a).localeCompare(nodeName(b));

/** Atualiza o rótulo "Mostrar mais N" / "Mostrar menos" ao abrir/fechar uma lista longa. */
function syncMoreLabel(e) {
  const d = e.target;
  if (!d.matches?.('details.more')) return;
  d.querySelector('summary').textContent = d.open ? t('sb.showLess') : t('sb.showMore', { n: fmtNumber(Number(d.dataset.count)) });
}

export function createSidebar(el, ds, { onNavigate, onAddGroup, onFilterTactic, inGraph, getState }) {
  let currentId = null;
  const modal = createModal();

  el.addEventListener('click', (e) => {
    const target = e.target.closest('[data-nav],[data-add-group],[data-tactic],[data-mitigation],[data-platform],[data-jump]');
    if (!target || !el.contains(target)) return;
    const { nav, addGroup, tactic, mitigation, platform, jump } = target.dataset;
    if (nav) onNavigate(nav);
    else if (addGroup) onAddGroup(addGroup);
    else if (tactic) onFilterTactic(tactic);
    else if (mitigation) openMitigation(mitigation);
    else if (platform) openPlatform(platform);
    else if (jump) jumpTo(jump);
  });
  el.addEventListener('toggle', syncMoreLabel, true);

  /** KPI -> rola até a seção correspondente e expande a lista, se houver. */
  function jumpTo(sectionId) {
    const sec = el.querySelector(`#${CSS.escape(sectionId)}`);
    if (!sec) return;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sec.classList.remove('flash');
    void sec.offsetWidth; // reinicia a animação
    sec.classList.add('flash');
  }

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
      <h2 class="sb-title">${esc(nodeName(n))}</h2>
      <a class="sb-id" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.id)} · ${t('sb.viewOn')} ↗</a>
      ${n.aliases?.length ? `<div class="sb-aliases">${t('sb.aliases')}: ${esc(n.aliases.slice(0, 8).join(', '))}</div>` : ''}
      ${description(n)}`;
  }

  /** items: [valor, chaveDoRótulo, idDaSeção?] — com seção, o KPI vira um botão de atalho. */
  const kpis = (items) =>
    `<div class="kpis">${items
      .map(([v, l, target]) =>
        target
          ? `<button type="button" class="kpi" data-jump="${esc(target)}" title="${esc(t('sb.kpi.title'))}"><b>${fmtNumber(v)}</b><span>${t(l)}</span></button>`
          : `<div class="kpi"><b>${fmtNumber(v)}</b><span>${t(l)}</span></div>`,
      )
      .join('')}</div>`;

  function bars(rows) {
    if (!rows.length) return `<p class="muted">${t('sb.noData')}</p>`;
    const max = Math.max(...rows.map((r) => r.count));
    const active = getState().tactic;
    return `<div class="bars">${rows
      .map(
        (r) => `<button type="button" class="bar-row" data-tactic="${esc(r.id)}" aria-pressed="${r.id === active}"
            title="${esc(t(r.id === active ? 'sb.filterTactic.active' : 'sb.filterTactic.title'))}">
          <span class="bar-label">${esc(r.name)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(r.count / max) * 100}%"></span></span>
          <span class="bar-val">${fmtNumber(r.count)}</span></button>`,
      )
      .join('')}</div>`;
  }

  const itemButton = (attrs, id, label, title) =>
    `<li><button type="button" class="item-btn" ${attrs} title="${esc(title)}"><span class="iid">${esc(id)}</span><span class="item-name">${label}</span></button></li>`;

  function itemList(nodes, { extra } = {}) {
    if (!nodes.length) return `<p class="muted">${t('sb.noItems')}</p>`;
    return expandable(
      nodes,
      (n) => itemButton(`data-nav="${esc(n.id)}"`, n.id, `${esc(nodeName(n))}${extra ? ` <span class="muted">${extra(n)}</span>` : ''}`, t('sb.open.title')),
      (html) => `<ul class="item-list">${html}</ul>`,
    );
  }

  function mitigationList(ms) {
    if (!ms.length) return `<p class="muted">${t('sb.noMitigations')}</p>`;
    return expandable(
      ms,
      (m) =>
        itemButton(
          `data-mitigation="${esc(m.id)}"`,
          m.id,
          `${esc(mitigationLabel(m))}${m.count ? ` <span class="muted">· ${t('sb.covers')} ${tn(m.count, 'n.technique')}</span>` : ''}`,
          t('sb.mitigation.title'),
        ),
      (html) => `<ul class="item-list">${html}</ul>`,
    );
  }

  function tacticPills(tactics) {
    if (!tactics.length) return '<span class="muted">—</span>';
    const active = getState().tactic;
    return `<div class="pill-list">${tactics
      .map(
        (tac) =>
          `<button type="button" class="pill" data-tactic="${esc(tac.shortname)}" aria-pressed="${tac.shortname === active}" title="${esc(
            t(tac.shortname === active ? 'sb.filterTactic.active' : 'sb.filterTactic.title'),
          )}">${esc(tacticLabel(tac))}</button>`,
      )
      .join('')}</div>`;
  }

  const platformPills = (values) =>
    `<div class="pill-list">${values
      .map((p) => `<button type="button" class="pill" data-platform="${esc(p)}" title="${esc(t('sb.platform.title'))}">${esc(platformLabel(p))}</button>`)
      .join('')}</div>`;

  const section = (title, body, id) => `<div class="sb-section"${id ? ` id="${id}"` : ''}><h3>${t(title)}</h3>${body}</div>`;

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
        [p.software.length, 'kpi.software', 'sec-software'],
        [p.direct.size, 'kpi.directTech', 'sec-tactics'],
        [p.techniques.length, viaSoftware ? 'kpi.totalTech' : 'kpi.tech', 'sec-tactics'],
      ])}
      ${section('sec.tactics', bars(tacticBreakdown(ds, p.techniques)), 'sec-tactics')}
      ${section('sec.topMitigations', mitigationList(topMitigations(p.techniques, 8)), 'sec-mitigations')}
      ${section('sec.arsenal', itemList(swByUse, { extra: (s) => `· ${tn(s.uses, 'n.technique')}` }), 'sec-software')}`;
  }

  function renderSoftware(n) {
    const techniques = [...(ds.out.get(n.id) ?? [])].map((id) => ds.byId.get(id));
    const groups = [...(ds.inc.get(n.id) ?? [])].map((id) => ds.byId.get(id)).filter((x) => x.type === 'group');
    return `${header(n)}
      ${kpis([
        [groups.length, 'kpi.groups', 'sec-groups'],
        [techniques.length, 'kpi.tech', 'sec-tactics'],
        [n.platforms?.length ?? 0, 'kpi.platforms', n.platforms?.length ? 'sec-platforms' : null],
      ])}
      ${n.platforms?.length ? section('sec.platforms', platformPills(n.platforms), 'sec-platforms') : ''}
      ${section('sec.tactics', bars(tacticBreakdown(ds, techniques)), 'sec-tactics')}
      ${section('sec.topMitigations', mitigationList(topMitigations(techniques, 6)), 'sec-mitigations')}
      ${section('sec.usedByGroups.sw', groupPills(groups), 'sec-groups')}`;
  }

  function renderTechnique(n) {
    const users = [...(ds.inc.get(n.id) ?? [])].map((id) => ds.byId.get(id));
    const groups = users.filter((u) => u.type === 'group');
    const software = users.filter((u) => u.type === 'software').sort(byName);
    const tactics = (n.tactics ?? []).map((s) => ds.tacticByShort.get(s)).filter(Boolean);
    return `${header(n)}
      ${kpis([
        [groups.length, 'kpi.groups', 'sec-groups'],
        [software.length, 'kpi.software', 'sec-software'],
        [n.mitigations?.length ?? 0, 'kpi.mitigations', 'sec-mitigations'],
      ])}
      ${section('sec.tacticsList', tacticPills(tactics))}
      ${n.platforms?.length ? section('sec.platforms', platformPills(n.platforms)) : ''}
      ${section('sec.mitigations', mitigationList(n.mitigations ?? []), 'sec-mitigations')}
      ${section('sec.usedByGroups.tech', groupPills(groups), 'sec-groups')}
      ${section('sec.implementedBy', itemList(software), 'sec-software')}`;
  }

  function groupPills(groups) {
    if (!groups.length) return `<p class="muted">${t('sb.noGroups')}</p>`;
    const sel = new Set(getState().groups);
    return expandable(
      [...groups].sort(byName),
      (g) =>
        sel.has(g.id)
          ? `<button type="button" class="pill" data-nav="${esc(g.id)}" title="${esc(t('sb.open.title'))}">${esc(g.name)}</button>`
          : `<button type="button" class="pill" data-add-group="${esc(g.id)}" title="${esc(t('sb.addToGraph.title'))}">+ ${esc(g.name)}</button>`,
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
      <p class="meta-line">${t('empty.source', { source: esc(t('empty.sourceName')), version: esc(m.version ?? '?'), date: esc(fmtDate(m.modified)) })}</p>
    </div>`;
  }

  // ---------- Modal de detalhes (mitigação / plataforma) ----------
  function openMitigation(id) {
    const m = ds.mitigations.get(id);
    if (!m) return;
    const inView = m.techniques.filter((n) => inGraph(n.id)).sort((a, b) => a.id.localeCompare(b.id));
    modal.open({
      reopen: () => openMitigation(id),
      kind: t('modal.mitigation'),
      title: mitigationLabel(m),
      id: m.id,
      url: `https://attack.mitre.org/mitigations/${encodeURIComponent(m.id)}/`,
      body: `<p class="muted">${t('modal.mitigates.total', { n: tn(m.techniques.length, 'n.technique') })}</p>
        <div class="sb-section"><h3>${t('modal.mitigates.inGraph')} (${fmtNumber(inView.length)})</h3>
        ${inView.length ? itemList(inView) : `<p class="muted">${t('modal.mitigates.none')}</p>`}</div>`,
    });
  }

  function openPlatform(p) {
    const all = ds.nodes.filter((n) => n.platforms?.includes(p));
    const inView = all.filter((n) => inGraph(n.id));
    const sw = inView.filter((n) => n.type === 'software').sort(byName);
    const tech = inView.filter((n) => n.type === 'technique').sort((a, b) => a.id.localeCompare(b.id));
    const total = {
      sw: tn(all.filter((n) => n.type === 'software').length, 'n.software'),
      tech: tn(all.filter((n) => n.type === 'technique').length, 'n.technique'),
    };
    modal.open({
      reopen: () => openPlatform(p),
      kind: t('modal.platform'),
      title: platformLabel(p),
      body: `<p class="muted">${t('modal.platform.lead')} ${t('modal.platform.total', total)}</p>
        <div class="sb-section"><h3>${t('modal.platform.software')} (${fmtNumber(sw.length)})</h3>${itemList(sw)}</div>
        <div class="sb-section"><h3>${t('modal.platform.techniques')} (${fmtNumber(tech.length)})</h3>${itemList(tech)}</div>`,
    });
  }

  function createModal() {
    const dlg = document.getElementById('detail-modal');
    const content = dlg.querySelector('.modal-content');
    let last = null; // reabre o mesmo conteúdo na troca de idioma
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        dlg.close();
        onNavigate(nav.dataset.nav);
      }
    });
    dlg.addEventListener('toggle', syncMoreLabel, true);
    dlg.addEventListener('close', () => (last = null));
    return {
      open(opts) {
        last = opts.reopen ?? null;
        content.innerHTML = `
          <header class="modal-head">
            <div>
              <span class="sb-type">${esc(opts.kind)}</span>
              <h2 class="sb-title" id="detail-modal-title">${esc(opts.title)}</h2>
              ${opts.url ? `<a class="sb-id" href="${esc(opts.url)}" target="_blank" rel="noopener">${esc(opts.id)} · ${t('sb.viewOn')} ↗</a>` : ''}
            </div>
            <button type="button" class="modal-close" data-close aria-label="${esc(t('modal.close'))}" title="${esc(t('modal.close'))}">×</button>
          </header>
          <div class="modal-body">${opts.body}</div>`;
        if (!dlg.open) dlg.showModal();
        content.scrollTop = 0;
      },
      /** Redesenha o modal aberto (ex.: após a troca de idioma ou de filtros). */
      refresh() {
        if (dlg.open && last) last();
      },
    };
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

  return {
    render,
    rerender: () => (render(currentId), modal.refresh()),
  };
}
