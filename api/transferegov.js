// Proxy serverless para Transferências Especiais — escopo SEFAZ-ES.
//
// Rota: GET /api/transferegov?cnpj=XXXXXXXXXXXXXX
//
// Regra de negócio: o assistente só é útil enquanto o Plano de Trabalho
// ainda NÃO foi preenchido/enviado, ou seja, para Planos de Ação em
// situacao = "AGUARDANDO_CONCLUSAO_PLANO_TRABALHO".
//
// Estratégia (opção A — consolidada):
//   1) PostgREST público lista os id_plano_acao do CNPJ em ES com essa
//      situação.
//   2) Para cada id, consulta o backend do portal do TransfereGov
//      (/maisbrasil-transferencia-especial-backend/api/public/plano-acao/{id}),
//      que é o MESMO endpoint que a tela "Dados Básicos" do portal consome
//      e que expõe `objetoDetalhe` (o "Objeto de Execução" pré-preenchido
//      pelo parlamentar via SIOP) — campo que a API PostgREST documentada
//      não devolve.
//   3) Junta os campos no formato camelCase que o front consome.

const TGOV_BASE = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';
const PORTAL_BASE =
  'https://especiais.transferegov.sistema.gov.br/maisbrasil-transferencia-especial-backend/api';
const UF_ALVO = 'ES';
const SITUACAO_ALVO = 'AGUARDANDO_CONCLUSAO_PLANO_TRABALHO';
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

function urlIdsPlanoAcao(cnpj) {
  const qs = new URLSearchParams({
    uf_beneficiario_plano_acao: `eq.${UF_ALVO}`,
    cnpj_beneficiario_plano_acao: `eq.${cnpj}`,
    situacao_plano_acao: `eq.${SITUACAO_ALVO}`,
    select: 'id_plano_acao',
    limit: '200',
  });
  return `${TGOV_BASE}/plano_acao_especial?${qs.toString()}`;
}

function urlPortalPA(idPA) {
  return `${PORTAL_BASE}/public/plano-acao/${idPA}`;
}

function formatBRL(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function objetoDe(pa) {
  // Preferimos a forma "260 - Descrição" para dar mais contexto ao Gemini.
  const o = pa.objeto || {};
  if (o.descricaoFormatada) return o.descricaoFormatada;
  if (pa.objetoDetalhe) return pa.objetoDetalhe;
  if (o.codigo && o.descricao) return `${o.codigo} - ${o.descricao}`;
  return null;
}

function finalidadesDe(pa) {
  // listaAPP carrega as áreas de política pública vinculadas ao PT. Para
  // PAs em AGUARDANDO (antes do PT começar) ela costuma vir vazia — nesses
  // casos o próprio `objetoDetalhe` é usado como finalidade candidata pelo
  // front/IA.
  const lista = Array.isArray(pa.listaAPP) ? pa.listaAPP : [];
  const out = [];
  for (const app of lista) {
    const tipo = app.cdAreaPoliticaPublicaTipo || app.areaPoliticaPublicaTipo || '';
    const area = app.cdAreaPoliticaPublica || app.areaPoliticaPublica || '';
    const label =
      [tipo, area].filter(Boolean).join(' / ') ||
      app.descricao ||
      app.descricaoFormatada ||
      '';
    if (label) out.push(label);
  }
  return out;
}

function montar(pa) {
  const emenda = pa.emendaParlamentar || {};
  const beneficiario = pa.beneficiario || {};
  return {
    idPlanoAcao: pa.id,
    codigoPlanoAcao: pa.codigo,
    situacaoPlanoAcao: pa.situacao,
    parlamentar: emenda.nomeParlamentar || null,
    codigoEmenda: emenda.codigoEmendaFormatado || null,
    objeto: objetoDe(pa) || 'Objeto de Execução não informado pela API.',
    valorTotal: formatBRL(pa.valorTotal),
    valorCusteio: formatBRL(pa.valorCusteio),
    valorInvestimento: formatBRL(pa.valorInvestimento),
    nomeBeneficiario: beneficiario.nome || null,
    emailBeneficiario: beneficiario.email || null,
    // O executor só é materializado quando o PT é iniciado — neste escopo
    // (AGUARDANDO) ele ainda não existe; o beneficiário assume.
    nomeExecutor: beneficiario.nome || null,
    cnpjExecutor: beneficiario.cnpj || null,
    prazoExecucao: null,
    classificacaoOrcamentaria: '',
    finalidades: finalidadesDe(pa),
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
    const ids = await getJson(urlIdsPlanoAcao(cnpj));
    const idsPA = ids.map((x) => x.id_plano_acao).filter((x) => x != null);

    if (idsPA.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json([]);
    }

    const detalhes = await Promise.all(
      idsPA.map((id) => getJson(urlPortalPA(id)).catch(() => null))
    );

    const itens = detalhes.filter(Boolean).map(montar);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(itens);
  } catch (err) {
    return res.status(502).json({
      error: 'Falha ao consultar a API TransfereGov.',
      detail: String(err && err.message ? err.message : err),
    });
  }
}
