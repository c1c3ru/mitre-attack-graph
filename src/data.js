/**
 * Camada de dados: carrega o JSON pré-processado (gerado por scripts/etl.mjs)
 * e monta subgrafos { nodes, links } para o D3 a partir dos filtros da UI.
 */

import { tacticLabel } from './i18n.js';

export async function loadDataset(url = 'data/attack-graph.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar ${url} (HTTP ${res.status})`);
  const raw = await res.json();
  return indexDataset(raw);
}

export function indexDataset(raw) {
  const byId = new Map(raw.nodes.map((n) => [n.id, n]));
  const out = new Map(); // id -> Set(targets)
  const inc = new Map(); // id -> Set(sources)
  for (const { source, target } of raw.links) {
    if (!out.has(source)) out.set(source, new Set());
    if (!inc.has(target)) inc.set(target, new Set());
    out.get(source).add(target);
    inc.get(target).add(source);
  }
  const groups = raw.nodes
    .filter((n) => n.type === 'group')
    .sort((a, b) => a.name.localeCompare(b.name));
  const tactics = raw.tactics.map((t) => ({ ...t, nameEn: t.name }));
  const tacticByShort = new Map(tactics.map((t) => [t.shortname, t]));
  return { ...raw, tactics, byId, out, inc, groups, tacticByShort };
}

const parentOf = (id) => (id.includes('.') ? id.split('.')[0] : id);

/** Técnicas usadas por um grupo: diretas + (opcional) via software. */
export function groupProfile(ds, groupId, { viaSoftware = true } = {}) {
  const targets = [...(ds.out.get(groupId) ?? [])].map((id) => ds.byId.get(id));
  const software = targets.filter((n) => n.type === 'software');
  const direct = new Set(targets.filter((n) => n.type === 'technique').map((n) => n.id));
  const all = new Set(direct);
  if (viaSoftware) {
    for (const s of software) for (const t of ds.out.get(s.id) ?? []) all.add(t);
  }
  return { software, direct, techniques: [...all].map((id) => ds.byId.get(id)) };
}

/**
 * Constrói o subgrafo visível.
 * @param {object} ds dataset indexado
 * @param {object} opts { groups: string[], tactic: string, viaSoftware: boolean, subtechniques: boolean }
 * @returns {{nodes: object[], links: {source:string,target:string,kind:string}[]}}
 */
export function buildSubgraph(ds, { groups, tactic = '', viaSoftware = true, subtechniques = true }) {
  const nodeIds = new Set();
  const linkMap = new Map();

  const techId = (id) => (subtechniques ? id : parentOf(id));
  const techVisible = (id) => {
    const n = ds.byId.get(id);
    return n && (!tactic || (n.tactics ?? []).includes(tactic));
  };
  const addLink = (source, target, kind) => {
    const key = `${source}>${target}`;
    if (source === target || linkMap.has(key)) return;
    linkMap.set(key, { source, target, kind });
    nodeIds.add(source);
    nodeIds.add(target);
  };

  for (const g of groups) {
    if (!ds.byId.has(g)) continue;
    nodeIds.add(g);
    for (const t of ds.out.get(g) ?? []) {
      const node = ds.byId.get(t);
      if (node.type === 'software') {
        addLink(g, t, 'gs');
        if (!viaSoftware) continue;
        for (const st of ds.out.get(t) ?? []) {
          const tid = techId(st);
          if (techVisible(tid)) addLink(t, tid, 'st');
        }
      } else if (node.type === 'technique') {
        const tid = techId(t);
        if (techVisible(tid)) addLink(g, tid, 'gt');
      }
    }
  }

  const nodes = [...nodeIds].map((id) => {
    const n = ds.byId.get(id);
    return { id: n.id, name: n.name, type: n.type };
  });
  return { nodes, links: [...linkMap.values()] };
}

/** Agrega mitigações mais recorrentes de um conjunto de técnicas. */
export function topMitigations(techniques, limit = 8) {
  const counts = new Map();
  for (const t of techniques) {
    for (const m of t.mitigations ?? []) {
      const c = counts.get(m.id) ?? { ...m, count: 0 };
      c.count += 1;
      counts.set(m.id, c);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Distribuição de técnicas por tática (ordem da kill chain). */
export function tacticBreakdown(ds, techniques) {
  const counts = new Map(ds.tactics.map((t) => [t.shortname, 0]));
  for (const t of techniques) for (const tac of t.tactics ?? []) counts.set(tac, (counts.get(tac) ?? 0) + 1);
  return ds.tactics
    .map((t) => ({ id: t.shortname, name: tacticLabel(t), count: counts.get(t.shortname) ?? 0 }))
    .filter((t) => t.count > 0);
}
