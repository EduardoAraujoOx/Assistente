// Proxy serverless para Transferências Especiais — escopo SEFAZ-ES.
//
// Rota: GET /api/transferegov?cnpj=XXXXXXXXXXXXXX[&modoTeste=1]
//
// Regra de negócio padrão: exibe apenas Planos de Ação em
// AGUARDANDO_CONCLUSAO_PLANO_TRABALHO cujo PT ainda não foi enviado.
//
// modoTeste=1: inclui também PAs cujo PT já foi enviado/aprovado —
// útil para testar o assistente com planos que já têm dados reais.
//
// Estratégia:
//   1) PostgREST lista os id_plano_acao do CNPJ em ES com situação AGUARDANDO.
//   2) PostgREST lista quais desses IDs já têm PT enviado (situacao_plano_trabalho
//      != 'Em elaboração' e != null vazio).
//   3) Em modo normal, filtra fora os que têm PT enviado.
//   4) Para cada id restante, busca detalhes no portal backend (objetoDetalhe etc.).

const TGOV_BASE   = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';
const PORTAL_BASE =
  'https://especiais.transferegov.sistema.gov.br/maisbrasil-transferencia-especial-backend/api';
const UF_ALVO       = 'ES';
const SITUACAO_ALVO = 'AGUARDANDO_CONCLUSAO_PLANO_TRABALHO';
const TIMEOUT_MS    = 12000;

// Situações do PT que indicam "já foi além do rascunho"
const PT_ENVIADOS = new Set([
  'Enviado para Análise',
  'Enviado para análise',
  'ENVIADO_PARA_ANALISE',
  'Aprovado',
  'APROVADO',
]);

/* ────────── helpers ────────── */

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`${r.status} em ${url} :: ${text.slice(0, 200)}`);
    }
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getJsonSafe(url) {
  try { return await getJson(url); }
  catch { return null; }
}

function urlIdsPlanoAcao(cnpj) {
  const qs = new URLSearchParams({
    uf_beneficiario_plano_acao:    `eq.${UF_ALVO}`,
    cnpj_beneficiario_plano_acao:  `eq.${cnpj}`,
    situacao_plano_acao:           `eq.${SITUACAO_ALVO}`,
    select: 'id_plano_acao',
    limit:  '200',
  });
  return `${TGOV_BASE}/plano_acao_especial?${qs}`;
}

function urlPtStatus(ids) {
  const qs = new URLSearchParams({
    id_plano_acao:           `in.(${ids.join(',')})`,
    select: 'id_plano_acao,situacao_plano_trabalho',
    limit:  '200',
  });
  return `${TGOV_BASE}/plano_trabalho_especial?${qs}`;
}

function urlPortalPA(idPA) {
  return `${PORTAL_BASE}/public/plano-acao/${idPA}`;
}

function formatBRL(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function objetoDe(pa) {
  const o = pa.objeto || {};
  if (o.descricaoFormatada) return o.descricaoFormatada;
  if (pa.objetoDetalhe)     return pa.objetoDetalhe;
  if (o.codigo && o.descricao) return `${o.codigo} - ${o.descricao}`;
  return null;
}

function finalidadesDe(pa) {
  const lista = Array.isArray(pa.listaAPP) ? pa.listaAPP : [];
  const out = [];
  for (const app of lista) {
    const tipo  = app.cdAreaPoliticaPublicaTipo  || app.areaPoliticaPublicaTipo  || '';
    const area  = app.cdAreaPoliticaPublica      || app.areaPoliticaPublica      || '';
    const label = [tipo, area].filter(Boolean).join(' / ')
               || app.descricao || app.descricaoFormatada || '';
    if (label) out.push(label);
  }
  return out;
}

function montar(pa, ptInfo) {
  const emenda       = pa.emendaParlamentar || {};
  const beneficiario = pa.beneficiario      || {};
  return {
    idPlanoAcao:        pa.id,
    codigoPlanoAcao:    pa.codigo,
    situacaoPlanoAcao:  pa.situacao,
    situacaoPT:         ptInfo?.situacao_plano_trabalho ?? null,
    parlamentar:        emenda.nomeParlamentar       || null,
    codigoEmenda:       emenda.codigoEmendaFormatado || null,
    objeto:             objetoDe(pa) || 'Objeto de Execução não informado pela API.',
    valorTotal:         formatBRL(pa.valorTotal),
    valorCusteio:       formatBRL(pa.valorCusteio),
    valorInvestimento:  formatBRL(pa.valorInvestimento),
    nomeBeneficiario:   beneficiario.nome  || null,
    emailBeneficiario:  beneficiario.email || null,
    nomeExecutor:       beneficiario.nome  || null,
    cnpjExecutor:       beneficiario.cnpj  || null,
    prazoExecucao:      null,
    classificacaoOrcamentaria: '',
    finalidades:        finalidadesDe(pa),
    areaPoliticaPublicaResumo: pa.objetoDetalhe || '',
  };
}

/* ────────── handler ────────── */

export default async function handler(req, res) {
  const cnpj      = String(req.query.cnpj      || '').replace(/\D/g, '');
  const modoTeste = String(req.query.modoTeste  || '') === '1';

  if (!/^\d{14}$/.test(cnpj)) {
    return res.status(400).json({ error: 'Parâmetro cnpj inválido (esperado 14 dígitos).' });
  }

  try {
    // 1. IDs com PA em AGUARDANDO
    const ids    = await getJson(urlIdsPlanoAcao(cnpj));
    let idsPA    = ids.map(x => x.id_plano_acao).filter(x => x != null);

    if (idsPA.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json([]);
    }

    // 2. Verifica status do PT para cada PA (para filtrar ou rotular)
    const ptRaw  = await getJsonSafe(urlPtStatus(idsPA));
    const ptRows = Array.isArray(ptRaw) ? ptRaw : [];   // guard: PostgREST pode retornar objeto em erro
    const ptByPa = Object.fromEntries(ptRows.map(r => [r.id_plano_acao, r]));

    // 3. Em modo normal, exclui planos cujo PT já foi enviado/aprovado
    if (!modoTeste) {
      idsPA = idsPA.filter(id => {
        const situacao = ptByPa[id]?.situacao_plano_trabalho;
        return !situacao || !PT_ENVIADOS.has(situacao);
      });
    }

    if (idsPA.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json([]);
    }

    // 4. Detalhes do portal (objeto SIOP, valores etc.)
    const detalhes = await Promise.all(
      idsPA.map(id => getJson(urlPortalPA(id)).catch(() => null))
    );

    const itens = detalhes
      .filter(Boolean)
      .map(pa => montar(pa, ptByPa[pa.id]));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(502).json({
      error:  'Falha ao consultar a API TransfereGov.',
      detail: String(err?.message ?? err),
    });
  }
}
