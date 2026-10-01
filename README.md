# ATT&CK Graph — Dashboard executivo de CTI em D3.js

Visualização interativa em **grafo de força direcionada** dos dados STIX do **MITRE ATT&CK Enterprise**, focada no encadeamento:

**Ator de Ameaça (Grupo) → Software (Malware/Ferramenta) → Técnica (Attack Pattern)**

Em vez da matriz tradicional de táticas × técnicas, a interface mostra *quem* ataca, *com o quê* e *como*, começando por um único grupo para não sobrecarregar a leitura.

![Grupo selecionado](docs/screenshots/02-grupo-selecionado.png)

## Funcionalidades

- Nós coloridos por tipo: **Grupo = vermelho**, **Software = laranja**, **Técnica = azul**.
- Inicia filtrado em **APT29**; busca de atores por nome, ID (`G0016`) ou alias, com até 5 grupos ao mesmo tempo.
- Clique em um nó para destacar suas conexões (os demais ficam opacos) e abrir o **painel lateral** com descrição, ID do MITRE, cobertura por tática, mitigações prioritárias e softwares/grupos relacionados.
- Filtros por **tática**, **técnicas via software** e **sub-técnicas** (agrupa na técnica-pai).
- Pan, zoom, arrastar nós; rótulos de técnicas aparecem ao aproximar.
- Dark mode com arestas de opacidade adaptativa.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

O repositório já inclui o dataset pré-processado em `public/data/attack-graph.json` (~1,5 MB), então a app funciona sem baixar nada.

## Atualizar os dados do MITRE

O arquivo oficial `enterprise-attack.json` tem ~54 MB e **não é versionado** (fica em `data/`, ignorado pelo git). Para baixar a versão mais recente e regenerar o JSON reduzido:

```bash
npm run data       # = npm run fetch-data && npm run etl
```

Ou manualmente:

```bash
curl -L -o data/enterprise-attack.json \
  https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json
node scripts/etl.mjs data/enterprise-attack.json public/data/attack-graph.json
```

O ETL mantém apenas `intrusion-set`, `malware`, `tool` e `attack-pattern`, relacionamentos `uses`, remove objetos revogados/depreciados e anexa mitigações e táticas a cada técnica. A aplicação **não** consulta o servidor TAXII em tempo real: tudo é carregado de um JSON estático.

## Validação

```bash
npm run dev &
npm run validate   # Chromium headless: confere <circle>, <line>, <text>, console e interações
```

Use `CHROMIUM_PATH=/caminho/do/chrome` se o Chromium estiver em outro local.

## Estrutura

```
scripts/fetch-data.mjs   download do STIX oficial
scripts/etl.mjs          STIX -> { nodes, links } reduzido
scripts/validate.mjs     teste automatizado no navegador
src/data.js              índices e montagem do subgrafo
src/graph.js             motor D3 (forças, zoom, destaque)
src/sidebar.js           painel executivo
src/main.js              filtros, busca e orquestração
STATUS_GRAFO_MITRE.md    estado do desenvolvimento
```

## Fonte dos dados

[MITRE ATT&CK®](https://attack.mitre.org/) — © The MITRE Corporation. Dados usados conforme os [termos de uso do ATT&CK](https://attack.mitre.org/resources/legal-and-branding/terms-of-use/).
