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

function urlTodosPlanos(cnpj, ano) {
  const qs = new URLSearchParams({
    uf_beneficiario_plano_acao:   `eq.${UF_ALVO}`,
    cnpj_beneficiario_plano_acao: `eq.${cnpj}`,
    ano_plano_acao:               `eq.${ano}`,
    select: 'id_plano_acao,situacao_plano_acao,codigo_descricao_areas_politicas_publicas_plano_acao',
    limit:  '200',
    order:  'id_plano_acao.desc',
  });
  return `${TGOV_BASE}/plano_acao_especial?${qs}`;
}

function urlPtStatus(ids) {
  const qs = new URLSearchParams({
    id_plano_acao: `in.(${ids.join(',')})`,
    select: 'id_plano_acao,id_plano_trabalho,situacao_plano_trabalho',
    limit:  '200',
  });
  return `${TGOV_BASE}/plano_trabalho_especial?${qs}`;
}

function urlPortalPA(idPA) {
  return `${PORTAL_BASE}/public/plano-acao/${idPA}`;
}

function urlPortalPTExecutores(ptId) {
  return `${PORTAL_BASE}/public/plano-trabalho/${ptId}/executor`;
}

function urlExecutorPostgrest(ids) {
  const qs = new URLSearchParams({
    id_plano_acao: `in.(${ids.join(',')})`,
    select: 'id_plano_acao,objeto_executor',
    limit:  '200',
  });
  return `${TGOV_BASE}/executor_especial?${qs}`;
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

// Extrai a descrição completa do SIOP da listaAPP:
// "Função / Subfunção / Descrição do objeto fornecida pelo Ministério"
function detalhamentoSIOPDe(pa) {
  const lista = Array.isArray(pa.listaAPP) ? pa.listaAPP : [];
  const itens = lista.map(app => {
    const tipo = app.cdAreaPoliticaPublicaTipo || app.areaPoliticaPublicaTipo || '';
    const area = app.cdAreaPoliticaPublica     || app.areaPoliticaPublica     || '';
    const desc = app.descricao || app.descricaoFormatada || '';
    return [tipo, area, desc].filter(Boolean).join(' / ');
  }).filter(Boolean);
  return itens.length ? itens.join('\n') : null;
}

function montar(pa, ptInfo, situacaoPA, objetoExecPT, listaDetalhamentoPT, appPostgrest, objetoExecPostgrest) {
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
    valorCusteioRaw:    Number(pa.valorCusteio)    || 0,
    valorInvestimentoRaw: Number(pa.valorInvestimento) || 0,
    nomeBeneficiario:   beneficiario.nome  || null,
    emailBeneficiario:  beneficiario.email || null,
    nomeExecutor:       beneficiario.nome  || null,
    cnpjExecutor:       beneficiario.cnpj  || null,
    prazoExecucao:      null,
    classificacaoOrcamentaria: '',
    emailCamara:        pa.emailCamara || '',
    finalidades:        finalidadesDe(pa),
    detalhamentoSIOP:      detalhamentoSIOPDe(pa),
    areaPoliticaPublicaResumo: pa.objetoDetalhe || '',
    objetoExecPT:          objetoExecPT          || null,
    objetoExecPostgrest:   objetoExecPostgrest   || null,
    listaDetalhamentoPT:   listaDetalhamentoPT   || null,
    appPostgrest:          appPostgrest          || null,
  };
}

/* ────────── handler ────────── */

export default async function handler(req, res) {
  const cnpj = String(req.query.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    return res.status(400).json({ error: 'Parâmetro cnpj inválido (esperado 14 dígitos).' });
  }

  try {
    // 1. Planos do ano atual; se vazio, tenta ano anterior
    const anoAtual = new Date().getFullYear();
    let rows = await getJson(urlTodosPlanos(cnpj, anoAtual));
    if (!Array.isArray(rows) || rows.length === 0) {
      rows = await getJson(urlTodosPlanos(cnpj, anoAtual - 1));
    }
    const todos = Array.isArray(rows) ? rows : [];

    if (todos.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');
      return res.status(200).json([]);
    }

    const idsPA        = todos.map(x => x.id_plano_acao).filter(x => x != null);
    const situacaoByPa = Object.fromEntries(todos.map(x => [x.id_plano_acao, x.situacao_plano_acao]));
    const appByPa      = Object.fromEntries(todos.map(x => [x.id_plano_acao, x.codigo_descricao_areas_politicas_publicas_plano_acao ?? null]));

    // 2. Status do PT + executor PostgREST — em paralelo (ambos por id_plano_acao, sem portal)
    const [ptRaw, execPgRaw] = await Promise.all([
      getJsonSafe(urlPtStatus(idsPA)),
      getJsonSafe(urlExecutorPostgrest(idsPA)),
    ]);
    const ptRows  = Array.isArray(ptRaw)    ? ptRaw    : [];
    const execPgRows = Array.isArray(execPgRaw) ? execPgRaw : [];
    const ptByPa  = Object.fromEntries(ptRows.map(r => [r.id_plano_acao, r]));
    // objeto_executor pode ter múltiplos executores por PA; concatena se houver mais de um
    const execPgByPa = {};
    for (const r of execPgRows) {
      if (!r.objeto_executor) continue;
      execPgByPa[r.id_plano_acao] = execPgByPa[r.id_plano_acao]
        ? `${execPgByPa[r.id_plano_acao]}\n\n${r.objeto_executor}`
        : r.objeto_executor;
    }

    // 3. Detalhes do portal (PA) e dados do executor PT — em paralelo por PA
    // O id_plano_trabalho vem do PostgREST (confiável); o endpoint de lista do portal
    // /public/plano-trabalho?idPlanoAcao={id} retorna PTs incorretos.
    const detalhesMap  = {};
    const execObjByPa  = {};
    const execDetByPa  = {}; // campo 2.4: detalhamentos do executor (funcao/subfuncao/descricao)
    await Promise.all(
      idsPA.map(async id => {
        // PA details
        const d = await getJson(urlPortalPA(id)).catch(() => null);
        if (d) detalhesMap[id] = d;

        // PT executor: objeto (campo 2.5) e detalhamentos (campo 2.4)
        const ptId = ptByPa[id]?.id_plano_trabalho;
        if (ptId) {
          const execs   = await getJsonSafe(urlPortalPTExecutores(ptId));
          const execArr = Array.isArray(execs) ? execs : (execs ? [execs] : []);

          // campo 2.5 — texto descritivo do executor
          const objs = execArr.map(e => e.objeto).filter(Boolean);
          if (objs.length) execObjByPa[id] = objs.join('\n\n');

          // campo 2.4 — lista de detalhamentos (funcao/subfuncao/descricao SIOP)
          const dets = execArr.flatMap(e => Array.isArray(e.detalhamentos) ? e.detalhamentos : []);
          const detTexts = dets.map(det => {
            const funcao    = det.subFuncao?.funcao;
            const subFuncao = det.subFuncao;
            const parts = [];
            if (funcao)      parts.push(`${funcao.codigo} - ${funcao.descricao}`);
            if (subFuncao)   parts.push(`${subFuncao.codigo} - ${subFuncao.descricao}`);
            if (det.descricao) parts.push(det.descricao);
            return parts.filter(Boolean).join(' / ');
          }).filter(Boolean);
          if (detTexts.length) execDetByPa[id] = detTexts.join('\n');
        }
      })
    );

    // 4. Monta resposta com todos os PAs
    const itens = idsPA.map(id => {
      const pa  = detalhesMap[id] || { id };
      return montar(pa, ptByPa[id], situacaoByPa[id], execObjByPa[id] || null, execDetByPa[id] || null, appByPa[id] || null, execPgByPa[id] || null);
    });

    res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(502).json({
      error:  'Falha ao consultar a API TransfereGov.',
      detail: String(err?.message ?? err),
    });
  }
}
