# STATUS_UI_FIXES — Tradução PT-BR e interatividade dos submenus

Branch: `ui-ptbr-submenus` · Ciclo atual: **2 (concluído)** · Tentativas usadas no mesmo bug de estado: **0/5** · `node scripts/validate.mjs` → **VALIDAÇÃO OK**

## 1. Auditoria de Tradução

| Item | Onde | Situação |
|---|---|---|
| Textos fixos da interface (topo, legenda, botões, painel) | `index.html` + `src/i18n.js` (`data-i18n`) | ✅ PT-BR desde o PR #2 |
| Descrições de **grupos** (176) | `i18n/pt-BR/descriptions.json` | ✅ traduzidas |
| Descrições de **softwares** (825) | `i18n/pt-BR/descriptions.json` | ✅ traduzidas manualmente |
| Descrições de **técnicas** (621) | `i18n/pt-BR/descriptions.json` | ✅ traduzidas manualmente; 69 menções internas a nomes de técnicas/táticas trocadas pelo nome em PT |
| **Nomes de técnicas** (621) — rótulos do grafo, tooltip, painel, modal | `i18n/pt-BR/technique-names.json` → `name_pt` | ✅ traduzidos; 78 mantidos por serem nomes de produto/protocolo ou termos consagrados (PowerShell, DCSync, Pass the Hash, Phishing…) |
| Plataforma `PRE` | `PLATFORM_PT` | ✅ "PRE (pré-comprometimento)" |
| Linha "Fonte: …" | chave `empty.sourceName` | ✅ "MITRE ATT&CK, matriz Enterprise (STIX 2.1)" |
| `title` com nome oficial em inglês (táticas, mitigações) | `main.js`, `sidebar.js` | ✅ só no modo EN |
| Nomes de grupos e softwares (APT29, Mimikatz…) | nomes próprios | mantidos (não se traduzem) |

## 2. Interatividade de Menus (onClick / href / expand-collapse)

| Submenu do painel | Antes | Depois |
|---|---|---|
| Itens de mitigação | `<li>` inerte | ✅ `<button data-mitigation>` abre modal de detalhes |
| Pílulas de tática (técnica) | `<span class="pill static">` inerte | ✅ `<button data-tactic aria-pressed>` aplica/remove o filtro |
| Barras "Cobertura por tática" | `<div>` inerte | ✅ `<button data-tactic aria-pressed>` aplica/remove o filtro |
| Pílulas de plataforma | `<span class="pill static">` inerte | ✅ `<button data-platform>` abre modal com softwares e técnicas da plataforma |
| KPIs do nó | `<div>` inerte | ✅ `<button data-jump>` rola até a seção e a destaca |
| Listas de softwares/técnicas e pílulas de grupo | `<li>`/`<span>` sem teclado | ✅ `<button>` (Tab + Enter funciona) |
| "Mostrar mais N" | `<details>` | ✅ já funcionava |

## 3. Renderização de Detalhes

✅ Modal `<dialog>` nativo (sem nova biblioteca; estado continua no objeto `state` de `main.js`). Fecha por botão ×, Esc ou clique fora. Itens do modal navegam para o nó (fecham o modal e focam o grafo). A troca de idioma redesenha o painel, o modal aberto e os rótulos do grafo sem reiniciar a simulação.

Design: mesma paleta; `cursor: pointer`, borda `--accent` no hover, `aria-pressed` com o mesmo realce do seletor PT/EN, `:focus-visible` e leve deslocamento no `:active`.

Capturas: `docs/screenshots/07-modal-mitigacao.png`, `08-modal-plataforma.png`.

## 4. Falhas de renderização ou erros no console pendentes

Nenhuma. `consoleErrors: []` na validação; `vite build` sem avisos.

Verificações automáticas em `scripts/validate.mjs`: filtro por barra e por pílula (aplica e remove), KPI, modal de mitigação (abre, lista, navega e fecha), modal de plataforma, botão ×, Esc, navegação por teclado, zero elementos inertes com `data-nav`, e varredura de palavras em inglês no painel, no modal e nos rótulos do grafo (ignorando termos consagrados como *Pass the Hash* e *Mark-of-the-Web*).
