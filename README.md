# Assistente Transferegov — SEFAZ/ES

Aplicação Next.js para apoiar o preenchimento de **Plano de Trabalho** (Transferências Especiais), com pré-preenchimento orientado por IA e histórico de planos aprovados.

## Objetivo do projeto

- Reduzir retrabalho no preenchimento do plano.
- Padronizar qualidade textual e coerência do detalhamento técnico.
- Facilitar a revisão antes da inserção manual no Transferegov.

## Plano de intervenções (executado nesta etapa)

1. **Padronização de textos e rótulos**
   - Correções de nomenclatura e melhoria da clareza (ex.: “Ente público beneficiário”).
2. **Refino visual com estilo mais sóbrio**
   - Redução de elementos muito chamativos e reforço de layout minimalista.
3. **Integração com API Transferegov via cliente centralizado**
   - Criação de camada de acesso com suporte a token, timeout e fallback.
4. **Documentação para IA (Gemini)**
   - Passo a passo para gerar e configurar chave de API.

## Integração com Transferegov

A consulta de histórico usa:

- Base padrão: `https://api.transferegov.gestao.gov.br/transferenciasespeciais`
- Endpoint: `/v1/plano-acao`
- Filtros: `uf`, `codigoIbge`, `situacaoPlanoAcao`, `page`, `size`

### Variáveis de ambiente

Crie um arquivo `.env.local` com:

```bash
# IA (opcional, recomendada)
GEMINI_API_KEY=sua_chave_gemini

# Opcional: fallback adicional
ANTHROPIC_API_KEY=sua_chave_anthropic

# API Transferegov
TRANSFEREGOV_API_URL=https://api.transferegov.gestao.gov.br/transferenciasespeciais
TRANSFEREGOV_API_TOKEN=seu_token_se_necessario
```

> Se o ambiente da API exigir autenticação, use `TRANSFEREGOV_API_TOKEN`.

## Como gerar chave Gemini (passo a passo)

1. Acesse o **Google AI Studio**: https://aistudio.google.com/
2. Faça login com sua conta Google.
3. No menu de API keys, clique em **Create API key**.
4. Copie a chave gerada.
5. No projeto, adicione no `.env.local`:
   ```bash
   GEMINI_API_KEY=cole_aqui_a_chave
   ```
6. Reinicie o servidor (`npm run dev`).
7. Gere um plano no sistema para validar resposta da IA.

### Boas práticas de segurança

- Nunca commitar `.env.local` no Git.
- Rotacionar chave em caso de vazamento.
- Preferir restrição por projeto/ambiente quando disponível.

## Execução local

```bash
npm install
npm run dev
```

Aplicação disponível em `http://localhost:3000`.

## Stack

- Next.js 14
- React 18
- Tailwind CSS
