#!/usr/bin/env node
/** Baixa o enterprise-attack.json oficial (STIX 2.1) para data/ (arquivo grande, ignorado pelo git). */
import { mkdirSync, writeFileSync } from 'node:fs';

const URL =
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';
const OUT = 'data/enterprise-attack.json';

console.log(`Baixando ${URL} ...`);
const res = await fetch(URL);
if (!res.ok) {
  console.error(`Falha no download: HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
mkdirSync('data', { recursive: true });
writeFileSync(OUT, buf);
console.log(`Salvo em ${OUT} (${(buf.length / 1e6).toFixed(1)} MB)`);
