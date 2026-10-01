import { loadDataset, buildSubgraph } from './data.js';
import { createGraph } from './graph.js';
import { createSidebar } from './sidebar.js';

const DEFAULT_GROUPS = ['APT29']; // inicia filtrado para evitar sobrecarga visual
const MAX_GROUPS = 5;

const $ = (sel) => document.querySelector(sel);
const state = { groups: [], tactic: '', viaSoftware: true, subtechniques: true };

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function syncTopbarHeight() {
  document.documentElement.style.setProperty('--topbar-h', `${$('.topbar').offsetHeight}px`);
}

async function init() {
  syncTopbarHeight();
  window.addEventListener('resize', syncTopbarHeight);

  let ds;
  try {
    ds = await loadDataset();
  } catch (err) {
    console.error(err);
    $('#loading').classList.add('error');
    $('#loading').textContent = `Erro ao carregar dados: ${err.message}. Rode "npm run data" para gerar public/data/attack-graph.json.`;
    return;
  }
  window.__ATTACK__ = ds; // útil para depuração no console

  const tooltip = $('#tooltip');
  const stage = $('.stage');
  const graph = createGraph($('#graph'), {
    onSelect: (id) => sidebar.render(id),
    onHover: (d, event) => {
      if (!d) return (tooltip.hidden = true);
      const rect = stage.getBoundingClientRect();
      tooltip.hidden = false;
      tooltip.innerHTML = `<b>${esc(d.name)}</b><span class="tid">${esc(d.id)}</span><br><span class="muted">${d.degree} conexões no grafo</span>`;
      tooltip.style.left = `${event.clientX - rect.left + 14}px`;
      tooltip.style.top = `${event.clientY - rect.top + 14}px`;
    },
  });

  const sidebar = createSidebar($('#sidebar-content'), ds, {
    getState: () => state,
    onNavigate: (id) => {
      if (!graph.focusNode(id)) sidebar.render(id);
    },
    onAddGroup: (id) => addGroup(id, { focus: true }),
  });

  // ---------- Filtros ----------
  const tacticSel = $('#tactic-filter');
  for (const t of ds.tactics) tacticSel.add(new Option(t.name, t.shortname));
  tacticSel.addEventListener('change', () => ((state.tactic = tacticSel.value), refresh()));
  $('#toggle-software-tech').addEventListener('change', (e) => ((state.viaSoftware = e.target.checked), refresh()));
  $('#toggle-subtech').addEventListener('change', (e) => ((state.subtechniques = e.target.checked), refresh()));
  $('#btn-reset').addEventListener('click', () => (graph.select(null), graph.fitToView()));

  // ---------- Seletor de Ator de Ameaça (busca + dropdown) ----------
  const input = $('#group-search');
  const list = $('#group-options');
  let active = 0;
  let matches = [];

  function renderOptions() {
    const q = input.value.trim().toLowerCase();
    matches = ds.groups
      .filter((g) => !state.groups.includes(g.id))
      .filter((g) => !q || g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q) || g.aliases.some((a) => a.toLowerCase().includes(q)))
      .slice(0, 60);
    active = Math.min(active, Math.max(0, matches.length - 1));
    list.innerHTML = matches.length
      ? matches
          .map(
            (g, i) => `<li role="option" data-id="${esc(g.id)}" aria-selected="${i === active}">
              <span>${esc(g.name)} <span class="alias">${esc(g.aliases.slice(0, 3).join(', '))}</span></span>
              <span class="gid">${esc(g.id)}</span></li>`,
          )
          .join('')
      : '<li class="muted">Nenhum grupo encontrado</li>';
    list.hidden = false;
  }
  input.addEventListener('focus', renderOptions);
  input.addEventListener('input', () => ((active = 0), renderOptions()));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') active = Math.min(active + 1, matches.length - 1);
    else if (e.key === 'ArrowUp') active = Math.max(active - 1, 0);
    else if (e.key === 'Enter' && matches[active]) return pick(matches[active].id);
    else if (e.key === 'Escape') return (list.hidden = true);
    else return;
    e.preventDefault();
    renderOptions();
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-id]');
    if (li) (e.preventDefault(), pick(li.dataset.id));
  });
  input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 120));

  function pick(id) {
    input.value = '';
    list.hidden = true;
    input.blur();
    addGroup(id, { focus: true });
  }

  function addGroup(id, { focus = false } = {}) {
    if (!state.groups.includes(id)) {
      if (state.groups.length >= MAX_GROUPS) state.groups.shift(); // mantém o grafo legível
      state.groups.push(id);
      refresh();
    }
    if (focus) {
      graph.select(id);
      setTimeout(() => graph.fitToView(), 900);
    }
  }

  function removeGroup(id) {
    state.groups = state.groups.filter((g) => g !== id);
    refresh();
    if (graph.selectedId === id || !state.groups.length) graph.select(null);
  }

  function renderChips() {
    $('#group-chips').innerHTML = state.groups
      .map((id) => `<span class="chip">${esc(ds.byId.get(id).name)}<button type="button" data-remove="${esc(id)}" aria-label="Remover ${esc(ds.byId.get(id).name)}">×</button></span>`)
      .join('');
    syncTopbarHeight();
  }
  $('#group-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (b) removeGroup(b.dataset.remove);
  });

  function refresh() {
    renderChips();
    const t0 = performance.now();
    const sub = buildSubgraph(ds, state);
    const stats = graph.update(sub);
    const types = { group: 0, software: 0, technique: 0 };
    sub.nodes.forEach((n) => types[n.type]++);
    $('#graph-stats').textContent = `${types.group} grupos · ${types.software} softwares · ${types.technique} técnicas · ${stats.links} arestas · ${(performance.now() - t0).toFixed(0)} ms`;
    if (graph.selectedId) sidebar.render(graph.selectedId);
  }

  // ---------- Estado inicial ----------
  const initial = DEFAULT_GROUPS.map((name) => ds.groups.find((g) => g.name === name)?.id).filter(Boolean);
  state.groups = initial.length ? initial : ds.groups.slice(0, 1).map((g) => g.id);
  sidebar.render(null);
  refresh();
  $('#loading').remove();
}

init();
