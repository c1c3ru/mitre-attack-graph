#!/usr/bin/env node
/**
 * ETL: enterprise-attack.json (STIX 2.1)  ->  public/data/attack-graph.json
 *
 * Mantém apenas:
 *   - nós:   intrusion-set (Grupo), malware/tool (Software), attack-pattern (Técnica)
 *   - links: relationship_type === "uses"  (Grupo->Software, Grupo->Técnica, Software->Técnica)
 * Enriquecimento: mitigações (course-of-action "mitigates" attack-pattern) e táticas.
 * Remove objetos revogados ou depreciados.
 *
 * Uso: node scripts/etl.mjs [caminho/enterprise-attack.json] [saida.json]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const input = resolve(process.argv[2] ?? 'data/enterprise-attack.json');
const output = resolve(process.argv[3] ?? 'public/data/attack-graph.json');

if (!existsSync(input)) {
  console.error(`Arquivo não encontrado: ${input}\nExecute "npm run fetch-data" primeiro.`);
  process.exit(1);
}

const bundle = JSON.parse(readFileSync(input, 'utf8'));
const objects = bundle.objects ?? [];
const collection = objects.find((o) => o.type === 'x-mitre-collection');

const isActive = (o) => !o.revoked && !o.x_mitre_deprecated;
const mitreRef = (o) => (o.external_references ?? []).find((r) => r.source_name === 'mitre-attack');

/** Remove citações, links markdown e tags HTML; mantém o 1º parágrafo limitado. */
function cleanText(text = '', max = 700) {
  let t = text
    .replace(/\(Citation:[^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<\/?code>/g, '')
    .replace(/<[^>]+>/g, '');
  t = t.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, t.lastIndexOf(' ', max)) + '…';
  return t;
}

const TYPE_MAP = {
  'intrusion-set': 'group',
  malware: 'software',
  tool: 'software',
  'attack-pattern': 'technique',
};

// --- Nós ---
const byStixId = new Map();
const mitigationsById = new Map(); // stixId -> {id, name}
for (const o of objects) {
  if (!isActive(o)) continue;
  const ref = mitreRef(o);
  if (o.type === 'course-of-action' && ref) {
    mitigationsById.set(o.id, { id: ref.external_id, name: o.name });
    continue;
  }
  const type = TYPE_MAP[o.type];
  if (!type || !ref) continue;

  const node = {
    id: ref.external_id,
    name: o.name,
    type,
    url: ref.url,
    description: cleanText(o.description),
  };
  if (type === 'group') {
    node.aliases = (o.aliases ?? []).filter((a) => a !== o.name);
  }
  if (type === 'software') {
    node.subtype = o.type; // malware | tool
    node.aliases = (o.x_mitre_aliases ?? []).filter((a) => a !== o.name);
    node.platforms = o.x_mitre_platforms ?? [];
  }
  if (type === 'technique') {
    node.tactics = (o.kill_chain_phases ?? [])
      .filter((k) => k.kill_chain_name === 'mitre-attack')
      .map((k) => k.phase_name);
    node.platforms = o.x_mitre_platforms ?? [];
    node.subtechnique = Boolean(o.x_mitre_is_subtechnique);
    node.mitigations = [];
  }
  byStixId.set(o.id, node);
}

// --- Relacionamentos ---
const links = [];
const seen = new Set();
for (const r of objects) {
  if (r.type !== 'relationship' || !isActive(r)) continue;

  if (r.relationship_type === 'mitigates') {
    const m = mitigationsById.get(r.source_ref);
    const t = byStixId.get(r.target_ref);
    if (m && t?.type === 'technique' && !t.mitigations.some((x) => x.id === m.id)) {
      t.mitigations.push(m);
    }
    continue;
  }

  if (r.relationship_type !== 'uses') continue;
  const s = byStixId.get(r.source_ref);
  const t = byStixId.get(r.target_ref);
  if (!s || !t) continue; // campanhas e objetos revogados ficam de fora
  const valid =
    (s.type === 'group' && (t.type === 'software' || t.type === 'technique')) ||
    (s.type === 'software' && t.type === 'technique');
  if (!valid) continue;
  const key = `${s.id}>${t.id}`;
  if (seen.has(key)) continue;
  seen.add(key);
  links.push({ source: s.id, target: t.id });
}

// Mantém nós que participam de algum link + técnicas-pai (necessárias para agrupar sub-técnicas)
const used = new Set(links.flatMap((l) => [l.source, l.target]));
for (const id of [...used]) if (id.includes('.')) used.add(id.split('.')[0]);
const nodes = [...byStixId.values()].filter((n) => used.has(n.id));

// Traduções das descrições (i18n/pt-BR/descriptions.json: { "G0016": "texto", ... })
const ptFile = resolve('i18n/pt-BR/descriptions.json');
if (existsSync(ptFile)) {
  const pt = JSON.parse(readFileSync(ptFile, 'utf8'));
  let applied = 0;
  for (const n of nodes) if (pt[n.id]) (n.description_pt = pt[n.id]), applied++;
  console.log(`Descrições em português aplicadas: ${applied}`);
}
// Nomes de técnicas em português (i18n/pt-BR/technique-names.json: { "T1059": "Interpretador de Comandos e Scripts", ... })
const namesFile = resolve('i18n/pt-BR/technique-names.json');
if (existsSync(namesFile)) {
  const names = JSON.parse(readFileSync(namesFile, 'utf8'));
  let applied = 0;
  for (const n of nodes) if (n.type === 'technique' && names[n.id]) (n.name_pt = names[n.id]), applied++;
  console.log(`Nomes de técnicas em português aplicados: ${applied}`);
}
const missing = nodes.filter((n) => n.description && !n.description_pt).length;
if (missing) console.warn(`Atenção: ${missing} nós ainda sem descrição em português.`);
for (const n of nodes) if (n.mitigations) n.mitigations.sort((a, b) => a.id.localeCompare(b.id));

// Táticas na ordem da kill chain (definida pela matriz Enterprise)
const matrix = objects.find((o) => o.type === 'x-mitre-matrix');
const tacticOrder = new Map((matrix?.tactic_refs ?? []).map((id, i) => [id, i]));
const tactics = objects
  .filter((o) => o.type === 'x-mitre-tactic' && isActive(o))
  .sort((a, b) => (tacticOrder.get(a.id) ?? 99) - (tacticOrder.get(b.id) ?? 99))
  .map((o) => ({ shortname: o.x_mitre_shortname, name: o.name, id: mitreRef(o)?.external_id }));

const graph = {
  meta: {
    source: 'MITRE ATT&CK Enterprise (STIX 2.1)',
    version: collection?.x_mitre_version ?? null,
    modified: collection?.modified ?? null,
    generatedAt: new Date().toISOString(),
    counts: {
      groups: nodes.filter((n) => n.type === 'group').length,
      software: nodes.filter((n) => n.type === 'software').length,
      techniques: nodes.filter((n) => n.type === 'technique').length,
      links: links.length,
    },
  },
  tactics,
  nodes,
  links,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(graph));
console.log(`ETL concluído -> ${output}`);
console.table(graph.meta.counts);
