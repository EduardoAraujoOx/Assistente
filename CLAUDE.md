# TransfereGov Assistente — Guia para Claude Code

## Visão geral

Aplicação estática (HTML único) com funções serverless Vercel em `/api/`.
Pré-preenche Planos de Trabalho de Transferências Especiais (EC 105/2019).
Escopo atual: Estado do Espírito Santo + municípios ES.

## Caso de uso principal (foco de desenvolvimento atual)

O sistema é voltado para **planos em status AGUARDANDO** — situação em que o executor
(município ou Estado) recebeu a emenda parlamentar mas ainda não submeteu o Plano de
Trabalho no TransfereGov. Nesse estágio, o único dado SIOP disponível via API pública é
`appPostgrest` (classificação de área de política pública do PostgREST).

O objetivo é que o sistema, a partir dessa classificação SIOP + objeto parlamentar,
gere automaticamente os campos do PT — especialmente o **campo 2.5** — com qualidade
suficiente para que o executor precise apenas revisar e ajustar.

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
  - **`codigo_descricao_areas_politicas_publicas_plano_acao`** → `appPostgrest` no código
    — classificação SIOP da área de política pública. **Sempre presente para todos os
    planos, incluindo AGUARDANDO.** Ex: `"14 - Direitos da Cidadania / 422 - Direitos
    Individuais, Coletivos e Difusos"`
- `plano_trabalho_especial` — PT vinculado ao PA
  - Campos úteis: `id_plano_acao`, **`id_plano_trabalho`**, `situacao_plano_trabalho`
  - `id_plano_trabalho` confirmado presente (retornou 56217 para PA 91510)
- `executor_especial` — executor vinculado ao PA
  - Campo: `objeto_executor` → `objetoExecPostgrest` no código (campo 2.5 quando disponível)

### Portal backend (público, sem auth)
```
https://especiais.transferegov.sistema.gov.br/maisbrasil-transferencia-especial-backend/api
```
- `GET /public/plano-acao/{paId}` — detalhes do PA
  - `listaAPP`: **frequentemente null** — não confiar como fonte primária
  - `objeto.descricaoFormatada`: texto do objeto parlamentar (campo 2.3)
- `GET /public/plano-trabalho/{ptId}/executor` — **só disponível quando PT submetido**
  - `[].id` → id do executor (ex: 59992)
  - `[].objeto` → **`objetoExecPT`** — texto do campo 2.5 já escrito pelo executor
  - `[].detalhamentos[].id` → id do detalhamento (ex: 744)
  - `[].detalhamentos[].descricao` → **`descricaoDetPT`** — descrição específica do
    objeto SIOP escrita pelo Ministério. Ex: `"Equipe de formação e bolsas de
    participação para meninas e suas respectivas mães ou cuidadoras, abrangendo
    total de 320 meninas e 320 mães ou cuidadoras em cada grupo de formação."`
  - `[].detalhamentos[].subFuncao.codigo/descricao` → subfunção SIOP (campo 2.4)
  - `[].metas[]` → metas detalhadas (descrição, unidade, quantidade, mesesPrevistos)

**ATENÇÃO**: `GET /public/plano-trabalho?idPlanoAcao={paId}` está **BUGADO** — retorna PT de outros planos. Usar sempre `id_plano_trabalho` do PostgREST.

## Disponibilidade de dados por status do PA

| Dado | Variável no código | AGUARDANDO | PT submetido |
|------|-------------------|-----------|--------------|
| Classificação SIOP | `appPostgrest` | ✓ sempre | ✓ sempre |
| Descrição específica SIOP | `descricaoDetPT` | ✗ não existe | ✓ disponível |
| Texto campo 2.5 submetido | `objetoExecPT` / `objetoExecPostgrest` | ✗ não existe | ✓ disponível |
| Detalhamentos (campo 2.4) | `listaDetalhamentoPT` | ✗ não existe | ✓ disponível |

**Conclusão para o caso de uso principal (AGUARDANDO)**: o Gemini só tem
`appPostgrest` + objeto parlamentar + KB histórico para gerar o campo 2.5.

## Campo 2.5 — Detalhamento do Objeto de Execução

### O que é
Texto descritivo escrito pelo executor: o que será feito, como, para quem. Não é a
classificação SIOP (isso é campo 2.4).

### Diferença entre appPostgrest, descricaoDetPT e objetoExecPT

| Dado | Exemplo real (PA 91510) | Papel no campo 2.5 |
|------|------------------------|-------------------|
| `appPostgrest` | `"14 - Direitos da Cidadania / 422 - Direitos Individuais, Coletivos e Difusos"` | Contexto para Gemini gerar o campo 2.5 (único disponível em AGUARDANDO) |
| `descricaoDetPT` | `"Equipe de formação e bolsas de participação para meninas e suas respectivas mães ou cuidadoras, abrangendo total de 320 meninas e 320 mães ou cuidadoras em cada grupo de formação."` | Seed mais rico para Gemini (só disponível após PT submetido) |
| `objetoExecPT` | `"Promover a prevenção e o enfrentamento da violência de gênero por meio de cursos de autodefesa e ações socioeducativas..."` | O próprio campo 2.5 já escrito pelo executor |

### Prioridade de preenchimento (código)

```
1. objetoExecPostgrest || objetoExecPT  → mostra diretamente, badge "API"
2. geminiOk && c.detalhamento_completo  → texto gerado pelo Gemini, badge "IA"
     Gemini usa em ordem: descricaoDetPT → appPostgrest → detalhamentoSIOP → KB/modelo
3. objetoExecHist                        → KB histórico, badge "Hist"
4. c.detalhamento_completo (fallback)    → texto genérico, badge "Hist"
```

### Prompts Gemini para campo 2.5

- **Com `descricaoDetPT`**: Gemini gera 3–5 linhas a partir da descrição específica do objeto SIOP
- **Com só `appPostgrest`** (caso principal AGUARDANDO): Gemini gera a partir da classificação + objeto parlamentar
- **Com texto submetido** (`objetoExecPT`): Gemini refina usando SIOP como contexto

## Campos do Plano de Trabalho e suas fontes

| Campo | ID HTML | Fonte primária | Fallback |
|-------|---------|----------------|----------|
| 1.2 Classificação Orçamentária | `f12` | `EXECUTOR_POR_OBJETO[codigoSIOP]` (estado) / KB histórico (município) | naturezaDespesaDe() + placeholder |
| 2.3 Objeto de Execução | `f23` | `S.emenda.objeto` (API) | — |
| 2.4 Lista de Detalhamentos | `f24` | `appPostgrest` (PostgREST, disponível p/ AGUARDANDO) → `listaDetalhamentoPT` (executor PT) | `detalhamentoSIOP` → `objeto` |
| 2.5 Detalhamento do Objeto | `f25` | `objetoExecPostgrest` / `objetoExecPT` → Gemini (`descricaoDetPT` ou `appPostgrest`) | KB histórico → fallback genérico |
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

## Cache localStorage

- Chave: `tgov_{CACHE_VERSION}_{cnpj}` — **incrementar `CACHE_VERSION` ao mudar schema da API**
- TTL: 6 horas
- Versão atual: `v5`

## Workflow Git

- Branch de desenvolvimento atual: `claude/fix-transferegov-field-2.5-edUrH`
- **NUNCA trabalhar no `main` e na feature branch ao mesmo tempo** — causa conflitos de merge
- Fazer rebase (`git rebase origin/main`) antes do merge para evitar conflitos no GitHub
- Após rebase: `git push --force-with-lease origin <branch>`

## Descobertas de API que NÃO funcionam

- `GET /public/plano-trabalho?idPlanoAcao={id}` → **BUGADO**, retorna PT errado
- `listaAPP` em `/public/plano-acao/{id}` → null para maioria dos planos ES
- `GET /transferenciasespeciais/detalhamento_especial?id_plano_acao=...` → 404 (tabela não existe)
- `GET /public/executor-detalhamento/{id}` → 404
- Endpoint de detalhamento via frontend URL (`/plano-acao/detalhe/{id}/plano-trabalho/executor/detalhamento/{execId}`) → o `{execId}` é o id do **executor** (ex: 59992), não do detalhamento. O backend não expõe endpoint direto por esse ID.
- Endpoints de detalhamento autenticados (`/api/...` com JWT): inacessíveis sem sessão ativa

## Estrutura real do endpoint executor (confirmada via API)

`GET /public/plano-trabalho/56217/executor` para PA 91510:
```json
[{
  "id": 59992,
  "cnpj": "50235855000170",
  "nome": "SECRETARIA ESTADUAL DAS MULHERES",
  "objeto": "Promover a prevenção e o enfrentamento da violência de gênero...",
  "detalhamentos": [{
    "id": 744,
    "descricao": "Equipe de formação e bolsas de participação para meninas...",
    "subFuncao": {
      "codigo": 422,
      "descricao": "Direitos Individuais, Coletivos e Difusos"
    },
    "descricaoCompleta": null
  }]
}]
```

**Nota**: `subFuncao` não contém `funcao` aninhada nesta resposta. O código de função
("14 - Direitos da Cidadania") vem do `appPostgrest`, não do endpoint executor.
