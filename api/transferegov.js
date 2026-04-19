// Proxy serverless para Transferências Especiais — escopo SEFAZ-ES.
//
// Rota: GET /api/transferegov?cnpj=XXXXXXXXXXXXXX[&modoTeste=1]
//
// Retorna TODOS os Planos de Ação do CNPJ (não apenas AGUARDANDO),
// com campo situacaoPlanoAcao para que a UI mostre badge de status.
//
// modoTeste=1: força inclusão de PAs de qualquer situação (garante
//   sempre retornar dados para testes mesmo sem PA em aberto).
//
// Estratégia:
//   1) PostgREST lista todos os id_plano_acao do CNPJ em ES.
//   2) PostgREST lista status do PT para cada PA.
//   3) Para cada PA, busca detalhes no portal backend.

const TGOV_BASE   = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';
const PORTAL_BASE =
  'https://especiais.transferegov.sistema.gov.br/maisbrasil-transferencia-especial-backend/api';
const UF_ALVO    = 'ES';
const TIMEOUT_MS = 12000;

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

function urlTodosPlanos(cnpj) {
  const qs = new URLSearchParams({
    uf_beneficiario_plano_acao:   `eq.${UF_ALVO}`,
    cnpj_beneficiario_plano_acao: `eq.${cnpj}`,
    select: 'id_plano_acao,situacao_plano_acao',
    limit:  '200',
    order:  'id_plano_acao.desc',
  });
  return `${TGOV_BASE}/plano_acao_especial?${qs}`;
}

function urlPtStatus(ids) {
  const qs = new URLSearchParams({
    id_plano_acao: `in.(${ids.join(',')})`,
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

function montar(pa, ptInfo, situacaoPA) {
  const emenda       = pa.emendaParlamentar || {};
  const beneficiario = pa.beneficiario      || {};
  return {
    idPlanoAcao:        pa.id,
    codigoPlanoAcao:    pa.codigo,
    situacaoPlanoAcao:  situacaoPA || pa.situacao || null,
    situacaoPT:         ptInfo?.situacao_plano_trabalho ?? null,
    parlamentar:        emenda.nomeParlamentar       || null,
    codigoEmenda:       emenda.codigoEmendaFormatado || null,
    objeto:             objetoDe(pa) || 'Objeto de Execução não informado pela API.',
    valorTotal:         formatBRL(pa.valorTotal),
    valorBruto:         Number(pa.valorTotal) || 0,
    valorCusteio:       formatBRL(pa.valorCusteio),
    valorInvestimento:  formatBRL(pa.valorInvestimento),
    nomeBeneficiario:   beneficiario.nome  || null,
    emailBeneficiario:  beneficiario.email || null,
    nomeExecutor:       beneficiario.nome  || null,
    cnpjExecutor:       beneficiario.cnpj  || null,
    prazoExecucao:      null,
    classificacaoOrcamentaria: '',
    emailCamara:        pa.emailCamara || '',
    finalidades:        finalidadesDe(pa),
    areaPoliticaPublicaResumo: pa.objetoDetalhe || '',
  };
}

/* ────────── handler ────────── */

export default async function handler(req, res) {
  const cnpj = String(req.query.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    return res.status(400).json({ error: 'Parâmetro cnpj inválido (esperado 14 dígitos).' });
  }

  try {
    // 1. Todos os PAs do CNPJ em ES (com situação)
    const rows  = await getJson(urlTodosPlanos(cnpj));
    const todos = Array.isArray(rows) ? rows : [];

    if (todos.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json([]);
    }

    const idsPA        = todos.map(x => x.id_plano_acao).filter(x => x != null);
    const situacaoByPa = Object.fromEntries(todos.map(x => [x.id_plano_acao, x.situacao_plano_acao]));

    // 2. Status do PT para cada PA
    const ptRaw  = await getJsonSafe(urlPtStatus(idsPA));
    const ptRows = Array.isArray(ptRaw) ? ptRaw : [];
    const ptByPa = Object.fromEntries(ptRows.map(r => [r.id_plano_acao, r]));

    // 3. Detalhes do portal para todos os PAs
    const idsBuscar = idsPA;

    const detalhesMap = {};
    await Promise.all(
      idsBuscar.map(async id => {
        const d = await getJson(urlPortalPA(id)).catch(() => null);
        if (d) detalhesMap[id] = d;
      })
    );

    // 4. Monta resposta com todos os PAs
    const itens = idsPA.map(id => {
      const pa  = detalhesMap[id] || { id };
      return montar(pa, ptByPa[id], situacaoByPa[id]);
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(502).json({
      error:  'Falha ao consultar a API TransfereGov.',
      detail: String(err?.message ?? err),
    });
  }
}
