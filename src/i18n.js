/**
 * Internacionalização (pt-BR / en): textos da interface, táticas, mitigações,
 * plataformas, números e plurais. Nomes de grupos e softwares são nomes
 * próprios e permanecem no original; técnicas usam name_pt em português.
 */

export const LANGS = ['pt', 'en'];
const STORAGE_KEY = 'attack-graph-lang';

let lang = 'pt';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (LANGS.includes(saved)) lang = saved;
} catch {
  /* armazenamento indisponível: mantém o padrão */
}

export const getLang = () => lang;
export function setLang(next) {
  if (!LANGS.includes(next)) return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignora */
  }
  document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
}

// ---------------------------------------------------------------------------
// Textos da interface. Entradas em array são [singular, plural].
// ---------------------------------------------------------------------------
const STRINGS = {
  pt: {
    'doc.title': 'Grafo ATT&CK · Painel Executivo de Inteligência de Ameaças',
    'brand.title': 'Grafo ATT&CK',
    'brand.subtitle': 'Grupo → Software → Técnica',
    'lang.label': 'Idioma',
    'filter.group': 'Ator de ameaça',
    'filter.group.placeholder': 'Pesquisar grupo (por exemplo, APT29 ou Lazarus)…',
    'filter.group.none': 'Nenhum grupo encontrado',
    'filter.group.remove': 'Remover {name}',
    'filter.tactic': 'Tática',
    'filter.tactic.all': 'Todas as táticas',
    'filter.viaSoftware': 'Incluir técnicas via software',
    'filter.subtech': 'Exibir subtécnicas',
    'stage.aria': 'Grafo de relacionamentos',
    'svg.aria': 'Grafo de relacionamentos do MITRE ATT&CK com disposição por simulação de forças',
    'legend.aria': 'Legenda',
    'btn.reset': 'Centralizar',
    'btn.reset.title': 'Remover o destaque e centralizar a visualização',
    'sidebar.aria': 'Detalhes do nó',
    loading: 'Carregando a base de dados do ATT&CK…',
    'loading.error': 'Erro ao carregar os dados: {msg}. Execute "npm run data" para gerar o arquivo public/data/attack-graph.json.',
    'type.group': 'Ator de ameaça',
    'type.software': 'Software',
    'type.technique': 'Técnica',
    'legend.group': 'Grupo',
    'legend.software': 'Software',
    'legend.technique': 'Técnica',
    'subtype.malware': 'Malware',
    'subtype.tool': 'Ferramenta',
    'sb.viewOn': 'ver em attack.mitre.org',
    'sb.aliases': 'Outras denominações',
    'sb.noDesc': 'Sem descrição disponível.',
    'sb.descEnOnly': 'Descrição oficial do MITRE, disponível apenas em inglês.',
    'sb.noData': 'Não há dados disponíveis.',
    'sb.noItems': 'Nenhum item.',
    'sb.showMore': 'Mostrar mais {n}',
    'sb.showLess': 'Mostrar menos',
    'sb.noMitigations': 'Nenhuma mitigação mapeada.',
    'sb.covers': 'abrange',
    'sb.addToGraph': '+ Adicionar ao grafo',
    'sb.addToGraph.title': 'Adicionar ao grafo',
    'sb.noGroups': 'Nenhum grupo documentado.',
    'sec.tactics': 'Cobertura por tática',
    'sec.topMitigations': 'Mitigações prioritárias',
    'sec.arsenal': 'Arsenal de softwares',
    'sec.platforms': 'Plataformas',
    'sec.usedByGroups.sw': 'Usado pelos grupos',
    'sec.usedByGroups.tech': 'Usada pelos grupos',
    'sec.tacticsList': 'Táticas',
    'sec.mitigations': 'Mitigações',
    'sec.implementedBy': 'Softwares que a implementam',
    'kpi.software': 'Softwares',
    'kpi.directTech': 'Técnicas diretas',
    'kpi.totalTech': 'Total de técnicas',
    'kpi.tech': 'Técnicas',
    'kpi.groups': 'Grupos',
    'kpi.platforms': 'Plataformas',
    'kpi.mitigations': 'Mitigações',
    'empty.title': 'Painel de inteligência',
    'empty.lead': 'Visualização relacional do MITRE ATT&CK: quem ataca, com quais ferramentas e de que forma.',
    'empty.step1': 'Selecione um <b>ator de ameaça</b> no campo de pesquisa acima.',
    'empty.step2': 'Clique em um nó para destacar as respectivas conexões.',
    'empty.step3': 'Utilize a roda do mouse para ampliar ou reduzir e arraste para navegar; amplie a visualização para ler os nomes das técnicas.',
    'empty.source': 'Fonte: {source} v{version} · atualizada em {date}',
    'empty.sourceName': 'MITRE ATT&CK, matriz Enterprise (STIX 2.1)',
    'sb.open.title': 'Abrir detalhes',
    'sb.filterTactic.title': 'Filtrar o grafo por esta tática',
    'sb.filterTactic.active': 'Filtro ativo. Clique para remover',
    'sb.mitigation.title': 'Ver detalhes da mitigação',
    'sb.platform.title': 'Ver itens desta plataforma no grafo',
    'sb.kpi.title': 'Ir para a seção correspondente',
    'modal.close': 'Fechar',
    'modal.mitigation': 'Mitigação',
    'modal.platform': 'Plataforma',
    'modal.mitigates.inGraph': 'Técnicas mitigadas no grafo atual',
    'modal.mitigates.total': 'Na base completa, esta mitigação abrange {n}.',
    'modal.mitigates.none': 'Nenhuma técnica do grafo atual é abrangida por esta mitigação.',
    'modal.platform.lead': 'Softwares e técnicas do grafo atual que atuam nesta plataforma.',
    'modal.platform.software': 'Softwares',
    'modal.platform.techniques': 'Técnicas',
    'modal.platform.total': 'Na base completa: {sw} e {tech}.',
    'tooltip.inGraph': 'no grafo',
    'n.group': ['grupo', 'grupos'],
    'n.software': ['software', 'softwares'],
    'n.technique': ['técnica', 'técnicas'],
    'n.link': ['aresta', 'arestas'],
    'n.connection': ['conexão', 'conexões'],
  },
  en: {
    'doc.title': 'ATT&CK Graph · Executive Threat Intelligence Dashboard',
    'brand.title': 'ATT&CK Graph',
    'brand.subtitle': 'Group → Software → Technique',
    'lang.label': 'Language',
    'filter.group': 'Threat actor',
    'filter.group.placeholder': 'Search group (e.g., APT29 or Lazarus)…',
    'filter.group.none': 'No group found',
    'filter.group.remove': 'Remove {name}',
    'filter.tactic': 'Tactic',
    'filter.tactic.all': 'All tactics',
    'filter.viaSoftware': 'Include techniques via software',
    'filter.subtech': 'Show sub-techniques',
    'stage.aria': 'Relationship graph',
    'svg.aria': 'MITRE ATT&CK force-directed relationship graph',
    'legend.aria': 'Legend',
    'btn.reset': 'Recenter',
    'btn.reset.title': 'Clear highlight and recenter the view',
    'sidebar.aria': 'Node details',
    loading: 'Loading the ATT&CK dataset…',
    'loading.error': 'Failed to load data: {msg}. Run "npm run data" to generate public/data/attack-graph.json.',
    'type.group': 'Threat actor',
    'type.software': 'Software',
    'type.technique': 'Technique',
    'legend.group': 'Group',
    'legend.software': 'Software',
    'legend.technique': 'Technique',
    'subtype.malware': 'Malware',
    'subtype.tool': 'Tool',
    'sb.viewOn': 'view on attack.mitre.org',
    'sb.aliases': 'Also known as',
    'sb.noDesc': 'No description available.',
    'sb.descEnOnly': '',
    'sb.noData': 'No data available.',
    'sb.noItems': 'No items.',
    'sb.showMore': 'Show {n} more',
    'sb.showLess': 'Show less',
    'sb.noMitigations': 'No mitigations mapped.',
    'sb.covers': 'covers',
    'sb.addToGraph': '+ Add to graph',
    'sb.addToGraph.title': 'Add to graph',
    'sb.noGroups': 'No documented groups.',
    'sec.tactics': 'Coverage by tactic',
    'sec.topMitigations': 'Priority mitigations',
    'sec.arsenal': 'Software arsenal',
    'sec.platforms': 'Platforms',
    'sec.usedByGroups.sw': 'Used by groups',
    'sec.usedByGroups.tech': 'Used by groups',
    'sec.tacticsList': 'Tactics',
    'sec.mitigations': 'Mitigations',
    'sec.implementedBy': 'Software implementing it',
    'kpi.software': 'Software',
    'kpi.directTech': 'Direct techniques',
    'kpi.totalTech': 'Total techniques',
    'kpi.tech': 'Techniques',
    'kpi.groups': 'Groups',
    'kpi.platforms': 'Platforms',
    'kpi.mitigations': 'Mitigations',
    'empty.title': 'Intelligence dashboard',
    'empty.lead': 'Relational view of MITRE ATT&CK: who attacks, with which tools, and how.',
    'empty.step1': 'Select a <b>threat actor</b> in the search field above.',
    'empty.step2': 'Click a node to highlight its connections.',
    'empty.step3': 'Use the mouse wheel to zoom and drag to pan; zoom in to read technique names.',
    'empty.source': 'Source: {source} v{version} · updated on {date}',
    'empty.sourceName': 'MITRE ATT&CK Enterprise (STIX 2.1)',
    'sb.open.title': 'Open details',
    'sb.filterTactic.title': 'Filter the graph by this tactic',
    'sb.filterTactic.active': 'Filter active. Click to remove',
    'sb.mitigation.title': 'View mitigation details',
    'sb.platform.title': 'View items on this platform in the graph',
    'sb.kpi.title': 'Go to the related section',
    'modal.close': 'Close',
    'modal.mitigation': 'Mitigation',
    'modal.platform': 'Platform',
    'modal.mitigates.inGraph': 'Mitigated techniques in the current graph',
    'modal.mitigates.total': 'Across the full dataset, this mitigation covers {n}.',
    'modal.mitigates.none': 'No technique in the current graph is covered by this mitigation.',
    'modal.platform.lead': 'Software and techniques in the current graph that target this platform.',
    'modal.platform.software': 'Software',
    'modal.platform.techniques': 'Techniques',
    'modal.platform.total': 'Full dataset: {sw} and {tech}.',
    'tooltip.inGraph': 'in the graph',
    'n.group': ['group', 'groups'],
    'n.software': ['software', 'software'],
    'n.technique': ['technique', 'techniques'],
    'n.link': ['edge', 'edges'],
    'n.connection': ['connection', 'connections'],
  },
};

/** Texto traduzido, com interpolação de {variáveis}. */
export function t(key, vars = {}) {
  const raw = STRINGS[lang][key] ?? STRINGS.pt[key] ?? key;
  const s = Array.isArray(raw) ? raw[1] : raw;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/** Quantidade com o substantivo concordando em número (ex.: "1 grupo", "3 grupos"). */
export function tn(n, key) {
  const forms = STRINGS[lang][key] ?? STRINGS.pt[key];
  return `${fmtNumber(n)} ${n === 1 ? forms[0] : forms[1]}`;
}

/** Número no padrão do idioma (ex.: 17.139 / 17,139). */
export const fmtNumber = (n) => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US').format(n);

/** Data ISO (AAAA-MM-DD...) em DD/MM/AAAA ou YYYY-MM-DD. */
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return '—';
  return lang === 'pt' ? `${m[3]}/${m[2]}/${m[1]}` : `${m[1]}-${m[2]}-${m[3]}`;
}

// ---------------------------------------------------------------------------
// Vocabulário do ATT&CK em português (o original em inglês fica como fallback)
// ---------------------------------------------------------------------------

/** Táticas do ATT&CK Enterprise. */
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

/** Mitigações (course-of-action) do ATT&CK Enterprise, por ID. */
export const MITIGATION_PT = {
  M1013: 'Orientações para desenvolvedores de aplicações',
  M1015: 'Configuração do Active Directory',
  M1016: 'Varredura de vulnerabilidades',
  M1017: 'Treinamento de usuários',
  M1018: 'Gerenciamento de contas de usuário',
  M1019: 'Programa de inteligência de ameaças',
  M1020: 'Inspeção de SSL/TLS',
  M1021: 'Restrição de conteúdo da web',
  M1022: 'Restrição de permissões de arquivos e diretórios',
  M1024: 'Restrição de permissões do Registro',
  M1025: 'Integridade de processos privilegiados',
  M1026: 'Gerenciamento de contas privilegiadas',
  M1027: 'Políticas de senha',
  M1028: 'Configuração do sistema operacional',
  M1029: 'Armazenamento remoto de dados',
  M1030: 'Segmentação de rede',
  M1031: 'Prevenção de intrusão em rede',
  M1032: 'Autenticação multifator',
  M1033: 'Limitação da instalação de software',
  M1034: 'Limitação da instalação de hardware',
  M1035: 'Limitação do acesso a recursos pela rede',
  M1036: 'Políticas de uso de contas',
  M1037: 'Filtragem de tráfego de rede',
  M1038: 'Prevenção de execução',
  M1039: 'Permissões de variáveis de ambiente',
  M1040: 'Prevenção comportamental no endpoint',
  M1041: 'Criptografia de informações sensíveis',
  M1042: 'Desativação ou remoção de recurso ou programa',
  M1043: 'Proteção de acesso a credenciais',
  M1044: 'Restrição do carregamento de bibliotecas',
  M1045: 'Assinatura de código',
  M1046: 'Integridade da inicialização',
  M1047: 'Auditoria',
  M1048: 'Isolamento de aplicações e sandboxing',
  M1049: 'Antivírus/antimalware',
  M1050: 'Proteção contra exploração',
  M1051: 'Atualização de software',
  M1052: 'Controle de Conta de Usuário (UAC)',
  M1053: 'Backup de dados',
  M1054: 'Configuração de software',
  M1055: 'Não mitigar',
  M1056: 'Pré-comprometimento',
  M1057: 'Prevenção contra perda de dados',
  M1060: 'Canal de comunicação fora de banda',
};

/** Plataformas (apenas as que não são nomes próprios). */
export const PLATFORM_PT = {
  'Network Devices': 'Dispositivos de rede',
  Containers: 'Contêineres',
  'Engineering Workstation': 'Estação de trabalho de engenharia',
  'Office Suite': 'Pacote de escritório',
  'Identity Provider': 'Provedor de identidade',
  'Field Controller/RTU/PLC/IED': 'Controlador de campo/RTU/CLP/IED',
  PRE: 'PRE (pré-comprometimento)',
};

export const tacticLabel = (tac) => (lang === 'pt' ? TACTIC_PT[tac.shortname] ?? tac.nameEn : tac.nameEn);
export const mitigationLabel = (m) => (lang === 'pt' ? MITIGATION_PT[m.id] ?? m.name : m.name);
export const platformLabel = (p) => (lang === 'pt' ? PLATFORM_PT[p] ?? p : p);
/** Nome exibido do nó: técnicas têm nome traduzido (name_pt); grupos e softwares são nomes próprios. */
export const nodeName = (n) => (lang === 'pt' && n.name_pt ? n.name_pt : n.name);

/** Aplica os textos estáticos marcados no HTML (data-i18n e data-i18n-attr="atributo:chave;..."). */
export function applyStatic(root = document) {
  document.title = t('doc.title');
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  }
}
