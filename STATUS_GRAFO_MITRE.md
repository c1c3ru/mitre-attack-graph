# STATUS — Grafo MITRE ATT&CK (D3.js)

> Arquivo de estado/memória do projeto. Atualizado a cada ciclo de trabalho.
> **Situação atual: CONCLUÍDO** — todos os critérios de sucesso atendidos no ciclo 1, sem tentativas de correção gastas no motor D3.

## 1) Aquisição e Parse de Dados
- [x] `enterprise-attack.json` (STIX 2.1, ATT&CK Enterprise **v19.2**, 53,8 MB) baixado de `mitre-attack/attack-stix-data` via `npm run fetch-data` (fica em `data/`, fora do git).
- [x] ETL (`scripts/etl.mjs`) filtra `intrusion-set`, `malware`, `tool`, `attack-pattern`; descarta objetos `revoked` / `x_mitre_deprecated`.
- [x] Relacionamentos: só `uses` válidos (Grupo→Software, Grupo→Técnica, Software→Técnica). Campanhas ficam de fora.
- [x] Enriquecimento: mitigações (`course-of-action` *mitigates*), táticas em ordem da kill chain (via `x-mitre-matrix`), plataformas, aliases.
- [x] Descrições limpas (sem `(Citation: …)`, markdown e HTML), 1º parágrafo, ≤ 700 caracteres.
- Resultado: `public/data/attack-graph.json` com **1,5 MB** (176 grupos, 825 softwares, 621 técnicas, 17.139 arestas).

## 2) Estrutura de Dados D3.js
- [x] Formato `{ nodes: [{id, name, type}], links: [{source, target, kind}] }` gerado por `buildSubgraph()` (`src/data.js`).
- [x] `kind` da aresta: `gs` (grupo→software), `gt` (grupo→técnica), `st` (software→técnica).
- [x] Índices `out`/`inc` (Map de Sets) para vizinhança O(1); deduplicação de arestas.
- [x] Filtros aplicados no subgrafo: tática, técnicas via software, agrupamento de sub-técnicas na técnica-pai.

## 3) Motor de Renderização
- [x] SVG com `<line>` (arestas), `<g><circle>` (nós) e `<text>` (rótulos) — `src/graph.js`.
- [x] `d3.forceSimulation` com `forceLink` (distância por tipo), `forceManyBody` (repulsão por tipo, `theta 0.9`, `distanceMax 600`), `forceCollide`, `forceCenter` e `forceRadial` em camadas (grupos no centro, software no meio, técnicas na borda) para evitar o "fio emaranhado".
- [x] Pan/zoom (`d3.zoom`, 0.1×–6×), arrastar nós (`d3.drag`), "fit to view" automático ao fim da simulação.
- [x] Posições preservadas entre atualizações de filtro (transição suave).

## 4) UI/UX de Segurança
- [x] Dark mode sóbrio, alto contraste, Grupo = vermelho, Software = laranja, Técnica = azul, legenda fixa.
- [x] Inicia filtrado em **1 ator (APT29)**; busca com dropdown (nome, ID ou alias, navegação por teclado); até 5 grupos simultâneos em chips removíveis.
- [x] Clique em nó: destaca conexões e opaca o resto (grupo → cadeia completa Grupo→Software→Técnica; demais → vizinhos imediatos).
- [x] Sidebar executiva: descrição, ID MITRE com link, aliases, KPIs, cobertura por tática (barras), mitigações prioritárias (agregadas), arsenal de software, grupos que usam a técnica (clique adiciona ao grafo).
- [x] Rótulos de técnicas aparecem só com zoom ≥ 1,5× para manter a leitura limpa.
- [x] Sem recriação da matriz: layout 100% relacional.

## 5) Falhas de renderização, performance ou erros de tipagem
- Tentativas de correção do motor D3 usadas: **0 de 5**.
- Validação automatizada (`npm run validate`, Chromium headless):
  - APT29: 280 `<circle>`, 696 `<line>`, 280 `<text>`; 0 erros no console.
  - Clique no grupo ativa modo foco e sidebar mostra "APT29"; clique em técnica mostra mitigações.
  - Busca "Lazarus" + Enter adiciona 2º grupo (75 softwares, 273 técnicas, 1.143 arestas).
  - Montagem do subgrafo: 16–50 ms; maior intervalo entre frames durante a simulação ≈ 117 ms (sem travar a thread principal).
- Ajuste de UX feito no ciclo: com foco em um grupo, rótulos de técnicas ficavam todos visíveis e poluíam a tela → agora só aparecem com zoom.
- Observação: algumas técnicas não têm mitigação mapeada pelo próprio MITRE (ex.: T1083); o painel indica "Nenhuma mitigação mapeada".
