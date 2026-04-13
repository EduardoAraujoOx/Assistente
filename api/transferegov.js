// Proxy serverless para a API TransfereGov (Transferências Especiais).
// Contorna o bloqueio de CORS na chamada direta pelo navegador e encapsula
// a lógica de junção entre Plano de Ação e Plano de Trabalho.
//
// Rota: GET /api/transferegov?cnpj=XXXXXXXXXXXXXX
//
// Escopo SEFAZ-ES:
//  - UF do beneficiário fixa em "ES"
//  - Apenas planos de trabalho AINDA NÃO ENVIADOS ao ministério, ou seja,
//    com situação em {"Em Elaboração", "Em Complementação",
//    "Em Ajuste do Plano de Trabalho"}.
//
// Fonte oficial: https://docs.api.transferegov.gestao.gov.br/transferenciasespeciais/
//
// Estratégia (duas etapas, para respeitar o limite de 1000 linhas do PostgREST):
//   1. Consulta /plano_acao_especial filtrando por uf=ES e cnpj={cnpj}
//      → obtém a lista (pequena) de ids de plano de ação do beneficiário.
//   2. Consulta /plano_trabalho_especial filtrando por
//      id_plano_acao in (ids) e situacao_plano_trabalho in (pendentes).
//   3. Faz o join em memória e devolve no formato camelCase consumido pelo
//      normalizarEmendas do cliente.

const TGOV_BASE = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';

const SITUACOES_PENDENTES = [
  'Em Elaboração',
  'Em Complementação',
  'Em Ajuste do Plano de Trabalho',
];

const UF_ALVO = 'ES';

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
      throw new Error(`TransfereGov ${r.status} em ${url} :: ${text.slice(0, 200)}`);
    }
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

function urlPlanoAcao(cnpj) {
  const fields = [
    'id_plano_acao',
    'codigo_plano_acao',
    'ano_plano_acao',
    'situacao_plano_acao',
    'cnpj_beneficiario_plano_acao',
    'nome_beneficiario_plano_acao',
    'uf_beneficiario_plano_acao',
    'nome_parlamentar_emenda_plano_acao',
    'codigo_emenda_parlamentar_formatado_plano_acao',
    'codigo_descricao_areas_politicas_publicas_plano_acao',
    'descricao_programacao_orcamentaria_plano_acao',
    'valor_custeio_plano_acao',
    'valor_investimento_plano_acao',
    'id_programa',
  ].join(',');

  const qs = new URLSearchParams({
    uf_beneficiario_plano_acao: `eq.${UF_ALVO}`,
    cnpj_beneficiario_plano_acao: `eq.${cnpj}`,
    select: fields,
    limit: '100',
  });
  return `${TGOV_BASE}/plano_acao_especial?${qs.toString()}`;
}

function urlPlanoTrabalhoPendentesDosPA(idsPA) {
  // PostgREST: in.("valor1","valor2") — valores com espaços/acentos devem
  // vir entre aspas duplas; URLSearchParams aplica o percent-encoding.
  const inSituacoes = SITUACOES_PENDENTES.map((s) => `"${s}"`).join(',');
  const inIds = idsPA.join(',');
  const qs = new URLSearchParams({
    situacao_plano_trabalho: `in.(${inSituacoes})`,
    id_plano_acao: `in.(${inIds})`,
    select: 'id_plano_trabalho,situacao_plano_trabalho,prazo_execucao_meses_plano_trabalho,classificacao_orcamentaria_pt,id_plano_acao',
    limit: '1000',
  });
  return `${TGOV_BASE}/plano_trabalho_especial?${qs.toString()}`;
}

function formatBRL(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarObjeto(pa) {
  // Prioriza descrição da programação orçamentária; cai para áreas de política
  // pública se a primeira for nula (caso comum segundo a amostra).
  return (
    pa.descricao_programacao_orcamentaria_plano_acao ||
    pa.codigo_descricao_areas_politicas_publicas_plano_acao ||
    'Objeto não informado na API'
  );
}

function montar(pa, pt) {
  const valorTotal = (pa.valor_custeio_plano_acao || 0) + (pa.valor_investimento_plano_acao || 0);
  return {
    idPlanoAcao: pa.id_plano_acao,
    codigoPlanoAcao: pa.codigo_plano_acao,
    idPlanoTrabalho: pt.id_plano_trabalho,
    situacaoPlanoTrabalho: pt.situacao_plano_trabalho,
    situacaoPlanoAcao: pa.situacao_plano_acao,
    parlamentar: pa.nome_parlamentar_emenda_plano_acao,
    codigoEmenda: pa.codigo_emenda_parlamentar_formatado_plano_acao,
    objeto: montarObjeto(pa),
    valorTotal: formatBRL(valorTotal),
    valorCusteio: formatBRL(pa.valor_custeio_plano_acao),
    valorInvestimento: formatBRL(pa.valor_investimento_plano_acao),
    nomeExecutor: pa.nome_beneficiario_plano_acao,
    prazoExecucao: pt.prazo_execucao_meses_plano_trabalho,
    classificacaoOrcamentaria: pt.classificacao_orcamentaria_pt || '',
  };
}

/* ────────── handler ────────── */

export default async function handler(req, res) {
  const cnpj = String(req.query.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    return res.status(400).json({ error: 'Parâmetro cnpj inválido (esperado 14 dígitos).' });
  }

  try {
    // 1. Planos de Ação do beneficiário em ES
    const planosAcao = await getJson(urlPlanoAcao(cnpj));
    const idsPA = planosAcao.map((pa) => pa.id_plano_acao).filter((x) => x != null);

    if (idsPA.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json([]);
    }

    // 2. Planos de Trabalho pendentes SOMENTE dos PA acima
    const planosTrabPendentes = await getJson(urlPlanoTrabalhoPendentesDosPA(idsPA));

    // Index por id_plano_acao (1:1 assumido; se houver mais de um PT por PA,
    // o último prevalece — caso raro no escopo "não enviado ao ministério").
    const ptPorPA = new Map();
    for (const pt of planosTrabPendentes) {
      if (pt.id_plano_acao != null) ptPorPA.set(pt.id_plano_acao, pt);
    }

    const itens = planosAcao
      .filter((pa) => ptPorPA.has(pa.id_plano_acao))
      .map((pa) => montar(pa, ptPorPA.get(pa.id_plano_acao)));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(502).json({
      error: 'Falha ao consultar a API TransfereGov.',
      detail: String(err && err.message ? err.message : err),
    });
  }
}
