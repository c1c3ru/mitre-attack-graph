/**
 * Textos em português: nomes das táticas, números e plurais.
 * Nomes e IDs oficiais do MITRE (grupos, softwares, técnicas) permanecem no original.
 */

/** Tradução das táticas do ATT&CK Enterprise; o nome oficial em inglês é preservado em `nameEn`. */
export const TACTIC_PT = {
  reconnaissance: 'Reconhecimento',
  'resource-development': 'Desenvolvimento de recursos',
  'initial-access': 'Acesso inicial',
  execution: 'Execução',
  persistence: 'Persistência',
  'privilege-escalation': 'Escalonamento de privilégios',
  'defense-evasion': 'Evasão de defesas',
  stealth: 'Furtividade',
  'defense-impairment': 'Comprometimento de defesas',
  'credential-access': 'Acesso a credenciais',
  discovery: 'Descoberta',
  'lateral-movement': 'Movimentação lateral',
  collection: 'Coleta',
  'command-and-control': 'Comando e controle',
  exfiltration: 'Exfiltração',
  impact: 'Impacto',
};

const numberFmt = new Intl.NumberFormat('pt-BR');

/** Número no padrão brasileiro (ex.: 17.139). */
export const fmtNumber = (n) => numberFmt.format(n);

/** Quantidade com o substantivo concordando em número (ex.: "1 grupo", "3 grupos"). */
export const plural = (n, singular, pluralForm = `${singular}s`) => `${fmtNumber(n)} ${n === 1 ? singular : pluralForm}`;

/** Data ISO (AAAA-MM-DD...) no formato DD/MM/AAAA. */
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
