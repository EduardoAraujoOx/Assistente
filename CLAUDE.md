# TransfereGov Assistente — Guia para Claude Code

## Visão geral

Aplicação estática (HTML único) com funções serverless Vercel em `/api/`.
Pré-preenche Planos de Trabalho de Transferências Especiais (EC 105/2019).
Escopo atual: Estado do Espírito Santo + municípios ES.

## Arquivos principais

| Arquivo | Função |
|---------|--------|
| `transferegov-assistente.html` | UI completa + toda lógica frontend |
| `api/transferegov.js` | Proxy serverless — busca PAs e PT executor |
| `api/transferegov-entes.js` | Lista entes (beneficiários) ES |
| `api/historico.js` | Busca KB histórico por similaridade textual |
| `api/gemini.js` | Proxy para Gemini AI |
| `data/kb-2025.json`, `data/kb-2026.json` | Knowledge base de planos aprovados |

## APIs externas

### PostgREST (público, sem auth)
```
https://api.transferegov.gestao.gov.br/transferenciasespeciais
```
- `plano_acao_especial` — lista PAs por CNPJ/UF/ano
  - Campos úteis: `id_plano_acao`, `situacao_plano_acao`, `cnpj_beneficiario_plano_acao`
  - **`codigo_descricao_areas_politicas_publicas_plano_acao`** → campo 2.4 (classificação SIOP), disponível mesmo para planos AGUARDANDO (sem PT)
- `plano_trabalho_especial` — PT vinculado ao PA
  - Campos úteis: `id_plano_acao`, **`id_plano_trabalho`**, `situacao_plano_trabalho`
  - `id_plano_trabalho` confirmado presente (retornou 56217 para PA 91510)

### Portal backend (público, sem auth)
```
https://especiais.transferegov.sistema.gov.br/maisbrasil-transferencia-especial-backend/api
```
- `GET /public/plano-acao/{paId}` — detalhes do PA
  - `listaAPP`: **frequentemente null** — não confiar como fonte primária de campo 2.4
  - `objeto.descricaoFormatada`: texto do objeto parlamentar (campo 2.3)
- `GET /public/plano-trabalho/{ptId}/executor` — **fonte principal campos 2.4 e 2.5**
  - `[].objeto` → **campo 2.5** (texto descritivo do executor já submetido)
  - `[].detalhamentos[].subFuncao.funcao.codigo/descricao` → **campo 2.4** (funcão SIOP)
  - `[].detalhamentos[].subFuncao.codigo/descricao` → subfunção SIOP
  - `[].detalhamentos[].descricao` → descrição específica do objeto SIOP
  - Formato campo 2.4: `"{funcao.codigo} - {funcao.descricao} / {subFuncao.codigo} - {subFuncao.descricao} / {descricao}"`
  - `[].metas[]` → metas detalhadas (descrição, unidade, quantidade, mesesPrevistos)

**ATENÇÃO**: `GET /public/plano-trabalho?idPlanoAcao={paId}` está **BUGADO** — retorna PT de outros planos. Usar sempre `id_plano_trabalho` do PostgREST.

## Campos do Plano de Trabalho e suas fontes

| Campo | ID HTML | Fonte primária | Fallback |
|-------|---------|----------------|----------|
| 1.2 Classificação Orçamentária | `f12` | `EXECUTOR_POR_OBJETO[codigoSIOP]` (estado) / KB histórico (município) | naturezaDespesaDe() + placeholder |
| 2.3 Objeto de Execução | `f23` | `S.emenda.objeto` (API) | — |
| 2.4 Lista de Detalhamentos | `f24` | `appPostgrest` (PostgREST, disponível p/ AGUARDANDO) → `listaDetalhamentoPT` (executor PT) | `detalhamentoSIOP` → `objeto` |
| 2.5 Detalhamento do Objeto | `f25` | `objetoExecPT` (executor.objeto) | Gemini → KB histórico |
| 2.6 Finalidades | `f26` | Gemini (lista de opções da emenda) | — |
| 2.7 Metas | `f27` | Gemini | fallback genérico |
| 2.8 Conta Específica | `f28` | `EXECUTOR_POR_OBJETO` (estado) / false (município) | true (estado) |
| 2.9 Banco | `f29banco` | `EXECUTOR_POR_OBJETO` / KB histórico | CEF 104 (município) |
| 2.10 Agência | `f210ag` | `EXECUTOR_POR_OBJETO` / KB histórico | KB estático (EXECUTOR_KB) |
| Prazo execução | `f14` | `EXECUTOR_POR_OBJETO.prazoMeses` / KB histórico | 36 meses |

## Regras de negócio importantes

### Estado ES vs Municípios
- `CNPJ_ESTADO_ES = '27080530000143'`
- Estado: usa `EXECUTOR_POR_OBJETO` (lookup por código SIOP do objeto)
- Municípios: executor = o próprio município (regra empírica 29/30 planos)

### Natureza de Despesa (STN)
- `valorInvestimento > 0` + palavra "obra/construção/pavimento..." → `4.4.90.51.00`
- `valorInvestimento > 0` (outros) → `4.4.90.52.00`
- `valorCusteio` apenas → `3.3.90.39.00`
- Fonte sempre: `1.706.311001`
- Aplica a estado E municípios

### Banco (municípios)
- CEF (104) como padrão: 76% acurácia (melhor que KB histórico = 57%)
- KB estático (`EXECUTOR_KB`) usado para agência (90% correto quando banco certo)

### Campos 2.4 e 2.5 — disponibilidade por status do PA

| Situação PA | `listaDetalhamentoPT` | `objetoExecPT` |
|-------------|----------------------|----------------|
| Com PT submetido | ✓ disponível | ✓ disponível |
| AGUARDANDO (sem PT) | null (ver nota abaixo) | null |

**Nota sobre campo 2.4 em planos AGUARDANDO**: O portal TransfereGov mostra o dropdown de
"Lista de Detalhamentos" (código/função SIOP) mesmo antes de o PT ser submetido, sugerindo
que essa lista de opções vem de algum endpoint público. Testamos 20+ padrões de URL (incluindo
`/public/plano-acao/{id}/app`, `/public/emenda/{codigoEmenda}/detalhamento`, `/public/objeto/{codigo}`)
— todos retornaram 404. A lista provavelmente vem de uma API autenticada interna do frontend
(`/api/...` com JWT do usuário logado), inacessível sem sessão ativa. **Investigação futura**:
interceptar requests do browser durante preenchimento manual para capturar o endpoint real.

**Como campo 2.4 difere de campo 2.5 (confusão comum)**:
- Campo 2.4 = classificação SIOP: "14 - Direitos da Cidadania / 422 - Direitos..." → fonte: `executor.detalhamentos`
- Campo 2.5 = texto descritivo escrito pelo executor: "Promover a prevenção..." → fonte: `executor.objeto`
- **Ambos já estão implementados** em `api/transferegov.js` via `/public/plano-trabalho/{ptId}/executor`

## Cache localStorage

- Chave: `tgov_{CACHE_VERSION}_{cnpj}` — **incrementar `CACHE_VERSION` ao mudar schema da API**
- TTL: 6 horas
- Versão atual: `v4`

## Workflow Git

- Branch de desenvolvimento: `claude/gemini-work-plan-prompts-X1SIO`
- **NUNCA trabalhar no `main` e na feature branch ao mesmo tempo** — causa conflitos de merge
- Fazer rebase (`git rebase origin/main`) antes do merge para evitar conflitos no GitHub
- Após rebase: `git push --force-with-lease origin <branch>`

## Descobertas de API que NÃO funcionam

- `GET /public/plano-trabalho?idPlanoAcao={id}` → **BUGADO**, retorna PT errado
- `listaAPP` em `/public/plano-acao/{id}` → null para maioria dos planos ES
- Endpoint de detalhamento via frontend URL (`/plano-acao/detalhe/{id}/plano-trabalho/executor/detalhamento/{execId}`) → 404 no backend público
