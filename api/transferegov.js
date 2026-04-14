// Proxy serverless para a API TransfereGov (Transferências Especiais).
// Contorna o bloqueio de CORS na chamada direta pelo navegador e encapsula
// a lógica de junção entre Plano de Ação, Plano de Trabalho, Executor e
// Finalidades.
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
// Estratégia (o PostgREST limita a 1000 rows por request, por isso partimos
// sempre do CNPJ — que tem poucas dezenas de PA — e filtramos os recursos
// relacionados por `in.(ids)`):
//   1. /plano_acao_especial       uf=ES & cnpj={cnpj}         → ids de PA
//   2. /plano_trabalho_especial   id_plano_acao in (ids)
//                                 & situacao in (pendentes)    → PTs pendentes
//   3. /executor_especial         id_plano_acao in (ids)       → objeto_executor
//   4. /finalidade_especial       id_executor   in (execs)     → áreas políticas
//   5. Join em memória, devolvendo no formato camelCase consumido pelo
//      normalizarEmendas do cliente (com `finalidades` como array).

const TGOV_BASE = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';

const SITUACOES_PENDENTES = [
  'Em Elaboração',
  'Em Complementação',
  'Em Ajuste do Plano de Trabalho',
];

const UF_ALVO = 'ES';

const TIMEOUT_MS = 15000;

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
  const inSituacoes = SITUACOES_PENDENTES.map((s) => `"${s}"`).join(',');
  const qs = new URLSearchParams({
    situacao_plano_trabalho: `in.(${inSituacoes})`,
    id_plano_acao: `in.(${idsPA.join(',')})`,
    select:
      'id_plano_trabalho,situacao_plano_trabalho,prazo_execucao_meses_plano_trabalho,classificacao_orcamentaria_pt,id_plano_acao',
    limit: '1000',
  });
  return `${TGOV_BASE}/plano_trabalho_especial?${qs.toString()}`;
}

function urlExecutoresDosPA(idsPA) {
  const qs = new URLSearchParams({
    id_plano_acao: `in.(${idsPA.join(',')})`,
    select: 'id_executor,id_plano_acao,objeto_executor,nome_executor,cnpj_executor',
    limit: '1000',
  });
  return `${TGOV_BASE}/executor_especial?${qs.toString()}`;
}

function urlFinalidadesDosExec(idsExec) {
  const qs = new URLSearchParams({
    id_executor: `in.(${idsExec.join(',')})`,
    select: 'id_executor,area_politica_publica_tipo_pt,area_politica_publica_pt',
    limit: '1000',
  });
  return `${TGOV_BASE}/finalidade_especial?${qs.toString()}`;
}

function formatBRL(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarFinalidade(f) {
  const tipo = (f.area_politica_publica_tipo_pt || '').trim();
  const area = (f.area_politica_publica_pt || '').trim();
  if (tipo && area) return `${tipo} — ${area}`;
  return tipo || area || '';
}

function montar(pa, pt, exec, finalidades) {
  const valorTotal = (pa.valor_custeio_plano_acao || 0) + (pa.valor_investimento_plano_acao || 0);
  const finalidadesList = (finalidades || [])
    .map(montarFinalidade)
    .filter((s) => s.length > 0);

  return {
    idPlanoAcao: pa.id_plano_acao,
    codigoPlanoAcao: pa.codigo_plano_acao,
    idPlanoTrabalho: pt.id_plano_trabalho,
    situacaoPlanoTrabalho: pt.situacao_plano_trabalho,
    situacaoPlanoAcao: pa.situacao_plano_acao,
    parlamentar: pa.nome_parlamentar_emenda_plano_acao,
    codigoEmenda: pa.codigo_emenda_parlamentar_formatado_plano_acao,
    objeto: exec && exec.objeto_executor
      ? exec.objeto_executor
      : 'Objeto não informado na API (sem executor cadastrado).',
    valorTotal: formatBRL(valorTotal),
    valorCusteio: formatBRL(pa.valor_custeio_plano_acao),
    valorInvestimento: formatBRL(pa.valor_investimento_plano_acao),
    nomeBeneficiario: pa.nome_beneficiario_plano_acao,
    nomeExecutor: exec && exec.nome_executor ? exec.nome_executor : pa.nome_beneficiario_plano_acao,
    cnpjExecutor: exec && exec.cnpj_executor ? exec.cnpj_executor : null,
    prazoExecucao: pt.prazo_execucao_meses_plano_trabalho,
    classificacaoOrcamentaria: pt.classificacao_orcamentaria_pt || '',
    finalidades: finalidadesList,
    areaPoliticaPublicaResumo:
      pa.codigo_descricao_areas_politicas_publicas_plano_acao || '',
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

    // 2. e 3. Planos de Trabalho pendentes + Executores (em paralelo)
    const [planosTrabPendentes, executores] = await Promise.all([
      getJson(urlPlanoTrabalhoPendentesDosPA(idsPA)),
      getJson(urlExecutoresDosPA(idsPA)),
    ]);

    // Index Plano de Trabalho por id_plano_acao
    const ptPorPA = new Map();
    for (const pt of planosTrabPendentes) {
      if (pt.id_plano_acao != null) ptPorPA.set(pt.id_plano_acao, pt);
    }

    // Index Executor por id_plano_acao (1:1 na prática desta modalidade)
    const execPorPA = new Map();
    const idsExecUsados = new Set();
    for (const ex of executores) {
      if (ex.id_plano_acao != null && ptPorPA.has(ex.id_plano_acao)) {
        execPorPA.set(ex.id_plano_acao, ex);
        if (ex.id_executor != null) idsExecUsados.add(ex.id_executor);
      }
    }

    // 4. Finalidades dos executores envolvidos
    let finalidadesPorExec = new Map();
    if (idsExecUsados.size > 0) {
      const finRows = await getJson(urlFinalidadesDosExec([...idsExecUsados]));
      for (const f of finRows) {
        const arr = finalidadesPorExec.get(f.id_executor) || [];
        arr.push(f);
        finalidadesPorExec.set(f.id_executor, arr);
      }
    }

    const itens = planosAcao
      .filter((pa) => ptPorPA.has(pa.id_plano_acao))
      .map((pa) => {
        const pt = ptPorPA.get(pa.id_plano_acao);
        const exec = execPorPA.get(pa.id_plano_acao);
        const finalidades = exec ? finalidadesPorExec.get(exec.id_executor) : [];
        return montar(pa, pt, exec, finalidades);
      });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(502).json({
      error: 'Falha ao consultar a API TransfereGov.',
      detail: String(err && err.message ? err.message : err),
    });
  }
}
