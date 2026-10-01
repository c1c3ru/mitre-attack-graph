# SITUAÇÃO — Grafo MITRE ATT&CK (D3.js)

> Arquivo de acompanhamento do projeto, atualizado a cada ciclo de trabalho.
> **Situação atual: CONCLUÍDO.** Todos os critérios de sucesso foram atendidos no primeiro ciclo, sem necessidade de correções no motor D3.

## 1) Aquisição e análise dos dados
- [x] `enterprise-attack.json` (STIX 2.1, ATT&CK Enterprise **v19.2**, 53,8 MB) obtido do repositório `mitre-attack/attack-stix-data` por meio de `npm run fetch-data` (armazenado em `data/`, fora do controle de versão).
- [x] O ETL (`scripts/etl.mjs`) seleciona `intrusion-set`, `malware`, `tool` e `attack-pattern` e descarta objetos `revoked` e `x_mitre_deprecated`.
- [x] Relacionamentos: somente `uses` válidos (Grupo → Software, Grupo → Técnica, Software → Técnica). Campanhas não são incluídas.
- [x] Enriquecimento: mitigações (`course-of-action` com relação *mitigates*), táticas na ordem da cadeia de ataque (via `x-mitre-matrix`), plataformas e denominações alternativas.
- [x] Descrições higienizadas (sem `(Citation: …)`, Markdown e HTML), limitadas ao primeiro parágrafo e a 700 caracteres.
- Resultado: `public/data/attack-graph.json` com **1,5 MB** (176 grupos, 825 softwares, 621 técnicas e 17.139 arestas).

## 2) Estrutura de dados para o D3.js
- [x] Formato `{ nodes: [{id, name, type}], links: [{source, target, kind}] }` gerado por `buildSubgraph()` (`src/data.js`).
- [x] Tipo da aresta (`kind`): `gs` (grupo → software), `gt` (grupo → técnica), `st` (software → técnica).
- [x] Índices `out` e `inc` (Map de Sets) para consulta de vizinhança em O(1); arestas sem duplicidade.
- [x] Filtros aplicados ao subgrafo: tática, técnicas via software e agrupamento de subtécnicas na técnica principal.

## 3) Motor de renderização
- [x] SVG com `<line>` (arestas), `<g><circle>` (nós) e `<text>` (rótulos) — `src/graph.js`.
- [x] `d3.forceSimulation` com `forceLink` (distância conforme o tipo), `forceManyBody` (repulsão conforme o tipo, `theta 0.9`, `distanceMax 600`), `forceCollide`, `forceCenter` e `forceRadial` em camadas (grupos no centro, softwares na faixa intermediária e técnicas na periferia), a fim de evitar o efeito de "novelo".
- [x] Deslocamento e ampliação (`d3.zoom`, de 0,1× a 6×), arraste de nós (`d3.drag`) e enquadramento automático ao término da simulação.
- [x] Posições preservadas entre atualizações de filtro (transição suave).

## 4) Interface e experiência de uso
- [x] Tema escuro sóbrio e de alto contraste: Grupo em vermelho, Software em laranja e Técnica em azul, com legenda fixa.
- [x] Abertura filtrada em **um único ator (APT29)**; pesquisa com lista suspensa (nome, identificador ou denominação alternativa, com navegação por teclado); até cinco grupos simultâneos, exibidos em etiquetas removíveis.
- [x] Clique em um nó: destaca as conexões e esmaece os demais elementos (para grupos, toda a cadeia Grupo → Software → Técnica; para os demais nós, os vizinhos imediatos).
- [x] Painel lateral executivo: descrição, identificador do MITRE com link, denominações alternativas, indicadores, cobertura por tática (barras), mitigações prioritárias (agregadas), arsenal de softwares e grupos que utilizam a técnica (o clique adiciona o grupo ao grafo).
- [x] Rótulos das técnicas exibidos apenas com ampliação de 1,5× ou superior, para manter a leitura limpa.
- [x] Sem reprodução da matriz: disposição inteiramente relacional.
- [x] Interface redigida em português formal; nomes e identificadores oficiais do MITRE mantidos no original; táticas traduzidas, com o nome oficial em inglês disponível no seletor; números e datas no padrão brasileiro.

## 5) Falhas de renderização, desempenho ou erros de tipagem
- Tentativas de correção do motor D3 utilizadas: **0 de 5**.
- Validação automatizada (`npm run validate`, Chromium sem interface gráfica):
  - APT29: 280 `<circle>`, 696 `<line>` e 280 `<text>`; nenhum erro no console.
  - O clique no grupo ativa o modo de foco, e o painel lateral exibe "APT29"; o clique em uma técnica exibe as mitigações.
  - A pesquisa por "Lazarus" seguida de Enter adiciona um segundo grupo (75 softwares, 273 técnicas e 1.143 arestas).
  - Montagem do subgrafo: de 16 a 50 ms; maior intervalo entre quadros durante a simulação ≈ 117 ms (sem bloqueio da thread principal).
- Ajuste de experiência realizado no ciclo: com o foco em um grupo, todos os rótulos de técnicas ficavam visíveis e poluíam a tela; agora, eles aparecem somente com ampliação.
- Observação: algumas técnicas não possuem mitigação mapeada pelo próprio MITRE (por exemplo, T1083); nesses casos, o painel informa "Nenhuma mitigação mapeada".

## Ciclo 2 (01/10/2026): idioma e listas longas
- [x] Seletor de idioma PT/EN (`src/i18n.js`), com a escolha salva no navegador e aplicada aos textos estáticos (`data-i18n`), ao painel lateral, ao filtro de táticas e às estatísticas.
- [x] Traduções: 16 táticas, 44 mitigações, plataformas e descrições dos 176 grupos (`i18n/pt-BR/descriptions.json`, incorporadas pelo ETL).
- [x] Pendente: descrições de 825 softwares e 621 técnicas permanecem em inglês, com aviso no painel.
- [x] Listas com mais de 10 itens (arsenal, mitigações, softwares, grupos) exibem o restante em um `<details>` "Mostrar mais N".
- Validação: APT29 exibe 10 de 49 softwares (18 itens visíveis no painel) e 57 após expandir; troca PT → EN → PT sem erros no console.
