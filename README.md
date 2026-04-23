# TransfereGov Assistente — SEFAZ-ES v2

Aplicação HTML standalone para apoiar o preenchimento de **Plano de Trabalho**
(Transferências Especiais, EC 105/2019), com integração direta à API TransfereGov
e geração de campos por IA (Gemini 2.0 Flash).

## Como usar

Abra o arquivo `TransfereGov Assistente.html` diretamente no navegador (ou `transferegov-assistente.html`, que mantém compatibilidade).
Nenhuma instalação necessária.

## Funcionalidades

- Seleção de beneficiário com carregamento automático das emendas via API TransfereGov
- Tabela de emendas disponíveis para plano de trabalho (Transferências Especiais 2025)
- Geração de todos os campos do Plano de Trabalho e Detalhamento do Executor com IA
- Regeneração individual de cada campo via botão ✦ IA
- Cópia com um clique (⧉) de qualquer campo
- Envio do resumo completo por e-mail (registro de uso)
- Fallback para dados de demonstração quando a API não está acessível

## Integração com APIs

### TransfereGov (dados abertos — sem autenticação)

Base: `https://api.transferegov.gestao.gov.br/transferenciasespeciais`

O sistema tenta múltiplos endpoints em sequência:
1. `/proposta?cnpjProponente=eq.{CNPJ}&situacaoTransferencia=eq.AGUARDANDO_PLANO_DE_TRABALHO`
2. `/proposta?cnpjProponente=eq.{CNPJ}&select=*&limit=30`
3. `/v1/proposta?cnpjProponente={CNPJ}&page=0&size=20`

Se todos falharem (CORS em ambiente de desenvolvimento local é esperado),
o sistema cai silenciosamente nos dados de demonstração.

> **Nota sobre CORS**: Em produção, roteie as chamadas à API TransfereGov
> através de um proxy servidor (Next.js API Route, Vercel Edge Function, etc.)
> para evitar bloqueios CORS. A chave de autenticação, se necessária, deve
> ficar exclusivamente no servidor.

### Gemini 2.0 Flash

Modelo: `gemini-2.0-flash`
Chave configurada diretamente no HTML (para prototipagem).

> **Segurança**: Em produção, mova a chave Gemini para variável de ambiente
> no servidor e roteie as chamadas por `/api/gemini`. Nunca exponha a chave
> em código client-side em produção.

## Campos gerados

### Aba "Plano de Trabalho"
| Campo | Fonte |
|-------|-------|
| 1.1 Orçamento próprio do beneficiário | Fixo (SIM) |
| 1.2 Classificação Orçamentária de Despesa | Histórico / IA |
| 1.3 Declaração pessoal/dívida | Fixo (SIM) |
| 1.4 Prazo de Execução | Histórico |

### Aba "Detalhamento do Executor"
| Campo | Fonte |
|-------|-------|
| 2.1 Declaração pessoal/dívida | Fixo (SIM) |
| 2.2 Executor | Histórico |
| 2.3 Objeto de Execução | API TransfereGov |
| 2.4 Lista de Detalhamentos | IA |
| 2.5 Detalhamento do Objeto (Obrigatório) | IA |
| 2.6 Finalidades | IA |
| 2.7 Metas do Executor (Meta 1) | IA |
| 2.8 Conta específica do executor | Fixo (SIM) |
| 2.9 Lista de Conselhos | Histórico |
| 2.10 Notificações aos Conselhos | Em branco |


### Regra do campo 2.5 (sem contexto adicional)

Quando o usuário **não preenche** o campo “Informações adicionais do parlamentar”, o campo **2.5 Detalhamento do Objeto** passa a priorizar estritamente os dados de objeto SIOP:

1. **Gemini (2.5)** gerado com base **exclusiva** no SIOP (sem histórico e sem contexto externo)
2. `descricaoDetPT` (descrição do detalhamento ministerial, quando disponível)
3. `objStd.detalhamentos[0].descricao` (objeto padronizado SIOP)
4. `detalhamentoSIOP` / `appPostgrest` (classificação SIOP como contexto mínimo)

Com isso, o Gemini gera o texto com base no objeto SIOP, reduzindo respostas genéricas só com o objeto parlamentar.

> Quando o usuário **preenche** “Informações adicionais do parlamentar”, o sistema mantém o comportamento tradicional e pode aproveitar texto já existente do executor para refinamento.

Exemplo esperado de base SIOP para 2.5:

> “Equipe de formação e bolsas de participação para meninas e suas respectivas mães ou cuidadoras, abrangendo total de 320 meninas e 320 mães ou cuidadoras em cada grupo de formação.”


## Deploy no Vercel (opcional)

Para deploy estático no Vercel, basta empurrar o repositório. O Vercel
serve arquivos HTML estáticos automaticamente. Não é necessário nenhum
framework ou build step.
Este repositório inclui também um `index.html` de fallback que redireciona automaticamente para `transferegov-assistente.html`, garantindo que acessos diretos ao domínio (ex.: `sefaz-es.vercel.app`) funcionem mesmo sem rota customizada.

Se quiser resolver CORS e proteger as chaves, adicione um diretório `/api/`
com funções serverless simples que proxy as chamadas externas.

## Stack

- HTML5 + CSS3 (sem framework CSS)
- JavaScript vanilla (sem bundler)
- API TransfereGov (dados abertos, PostgREST)
- Gemini 2.0 Flash (Google AI)
