/**
 * Painel lateral executivo: resumo legível do nó selecionado.
 */
import { groupProfile, tacticBreakdown, topMitigations } from './data.js';

const TYPE_LABEL = { group: 'Ator de Ameaça', software: 'Software', technique: 'Técnica' };

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createSidebar(el, ds, { onNavigate, onAddGroup, getState }) {
  el.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) onNavigate(nav.dataset.nav);
    const add = e.target.closest('[data-add-group]');
    if (add) onAddGroup(add.dataset.addGroup);
  });

  function header(n) {
    const subtype = n.subtype ? ` · ${n.subtype === 'malware' ? 'Malware' : 'Ferramenta'}` : '';
    return `
      <span class="sb-type"><i class="dot ${n.type}"></i>${TYPE_LABEL[n.type]}${subtype}</span>
      <h2 class="sb-title">${esc(n.name)}</h2>
      <a class="sb-id" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.id)} ↗ attack.mitre.org</a>
      ${n.aliases?.length ? `<div class="sb-aliases">Também conhecido como: ${esc(n.aliases.slice(0, 8).join(', '))}</div>` : ''}
      <p class="sb-desc">${esc(n.description || 'Sem descrição disponível.')}</p>`;
  }

  const kpis = (items) =>
    `<div class="kpis">${items.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;

  function bars(rows) {
    if (!rows.length) return '<p class="muted">Sem dados.</p>';
    const max = Math.max(...rows.map((r) => r.count));
    return `<div class="bars">${rows
      .map(
        (r) => `<div class="bar-row"><span class="bar-label" title="${esc(r.name)}">${esc(r.name)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.count / max) * 100}%"></div></div>
          <span class="bar-val">${r.count}</span></div>`,
      )
      .join('')}</div>`;
  }

  function itemList(nodes, { limit = 12, extra } = {}) {
    if (!nodes.length) return '<p class="muted">Nenhum.</p>';
    const rows = nodes
      .slice(0, limit)
      .map((n) => `<li class="clickable" data-nav="${esc(n.id)}"><span class="iid">${esc(n.id)}</span><span>${esc(n.name)}${extra ? ` <span class="muted">${extra(n)}</span>` : ''}</span></li>`)
      .join('');
    const more = nodes.length > limit ? `<p class="muted">+ ${nodes.length - limit} outros</p>` : '';
    return `<ul class="item-list">${rows}</ul>${more}`;
  }

  function mitigationList(ms) {
    if (!ms.length) return '<p class="muted">Nenhuma mitigação mapeada.</p>';
    return `<ul class="item-list">${ms
      .map(
        (m) => `<li><span class="iid">${esc(m.id)}</span><span>${esc(m.name)}${m.count ? ` <span class="muted">· cobre ${m.count} técnica(s)</span>` : ''}</span></li>`,
      )
      .join('')}</ul>`;
  }

  const section = (title, body) => `<div class="sb-section"><h3>${title}</h3>${body}</div>`;

  function renderGroup(n) {
    const { viaSoftware } = getState();
    const p = groupProfile(ds, n.id, { viaSoftware });
    const swByUse = p.software
      .map((s) => ({ ...s, uses: ds.out.get(s.id)?.size ?? 0 }))
      .sort((a, b) => b.uses - a.uses);
    const selected = getState().groups.includes(n.id);
    return `${header(n)}
      ${selected ? '' : `<button type="button" data-add-group="${esc(n.id)}">+ Adicionar ao grafo</button>`}
      ${kpis([
        [p.software.length, 'Softwares'],
        [p.direct.size, 'Técnicas diretas'],
        [p.techniques.length, viaSoftware ? 'Técnicas totais' : 'Técnicas'],
      ])}
      ${section('Cobertura por tática', bars(tacticBreakdown(ds, p.techniques)))}
      ${section('Mitigações prioritárias', mitigationList(topMitigations(p.techniques, 8)))}
      ${section('Arsenal (softwares)', itemList(swByUse, { extra: (s) => `· ${s.uses} técnicas` }))}`;
  }

  function renderSoftware(n) {
    const techniques = [...(ds.out.get(n.id) ?? [])].map((id) => ds.byId.get(id));
    const groups = [...(ds.inc.get(n.id) ?? [])].map((id) => ds.byId.get(id)).filter((x) => x.type === 'group');
    return `${header(n)}
      ${kpis([
        [groups.length, 'Grupos'],
        [techniques.length, 'Técnicas'],
        [n.platforms?.length ?? 0, 'Plataformas'],
      ])}
      ${n.platforms?.length ? section('Plataformas', `<div class="pill-list">${n.platforms.map((p) => `<span class="pill static">${esc(p)}</span>`).join('')}</div>`) : ''}
      ${section('Cobertura por tática', bars(tacticBreakdown(ds, techniques)))}
      ${section('Mitigações prioritárias', mitigationList(topMitigations(techniques, 6)))}
      ${section('Usado pelos grupos', groupPills(groups))}`;
  }

  function renderTechnique(n) {
    const users = [...(ds.inc.get(n.id) ?? [])].map((id) => ds.byId.get(id));
    const groups = users.filter((u) => u.type === 'group');
    const software = users.filter((u) => u.type === 'software');
    return `${header(n)}
      ${kpis([
        [groups.length, 'Grupos'],
        [software.length, 'Softwares'],
        [n.mitigations?.length ?? 0, 'Mitigações'],
      ])}
      ${section('Táticas', `<div class="pill-list">${(n.tactics ?? []).map((t) => `<span class="pill static">${esc(ds.tacticName.get(t) ?? t)}</span>`).join('') || '<span class="muted">—</span>'}</div>`)}
      ${n.platforms?.length ? section('Plataformas', `<div class="pill-list">${n.platforms.map((p) => `<span class="pill static">${esc(p)}</span>`).join('')}</div>`) : ''}
      ${section('Mitigações', mitigationList(n.mitigations ?? []))}
      ${section('Usada pelos grupos', groupPills(groups))}
      ${section('Softwares que implementam', itemList(software, { limit: 10 }))}`;
  }

  function groupPills(groups) {
    if (!groups.length) return '<p class="muted">Nenhum grupo documentado.</p>';
    const sel = new Set(getState().groups);
    return `<div class="pill-list">${groups
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30)
      .map((g) => `<span class="pill" ${sel.has(g.id) ? `data-nav="${esc(g.id)}"` : `data-add-group="${esc(g.id)}" title="Adicionar ao grafo"`}>${sel.has(g.id) ? '' : '+ '}${esc(g.name)}</span>`)
      .join('')}${groups.length > 30 ? `<span class="muted">+${groups.length - 30}</span>` : ''}</div>`;
  }

  function renderEmpty() {
    const m = ds.meta;
    return `<div class="empty-state">
      <h2>Painel de Inteligência</h2>
      <p>Visualização relacional do MITRE ATT&amp;CK: quem ataca, com quais ferramentas e de que forma.</p>
      <ol>
        <li>Escolha um <b>Ator de Ameaça</b> na busca acima.</li>
        <li>Clique em um nó para destacar suas conexões.</li>
        <li>Use a roda do mouse para zoom e arraste para navegar; aproxime para ler as técnicas.</li>
      </ol>
      ${kpis([
        [m.counts.groups, 'Grupos'],
        [m.counts.software, 'Softwares'],
        [m.counts.techniques, 'Técnicas'],
      ])}
      <p class="meta-line">Fonte: ${esc(m.source)} v${esc(m.version ?? '?')} · atualizado em ${esc((m.modified ?? '').slice(0, 10))}</p>
    </div>`;
  }

  function render(id) {
    const n = id ? ds.byId.get(id) : null;
    if (!n) el.innerHTML = renderEmpty();
    else if (n.type === 'group') el.innerHTML = renderGroup(n);
    else if (n.type === 'software') el.innerHTML = renderSoftware(n);
    else el.innerHTML = renderTechnique(n);
    el.parentElement.scrollTop = 0;
  }

  return { render };
}
