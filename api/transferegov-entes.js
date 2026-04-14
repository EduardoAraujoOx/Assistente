// Lista de entes (beneficiários) do Espírito Santo que possuem Plano de Ação
// registrado na API TransfereGov (Transferências Especiais).
//
// Rota: GET /api/transferegov-entes
//
// Retorna: [{ cnpj: string(14 dígitos), nome: string }]
//
// Observação: a API pode ter várias linhas de PA para o mesmo beneficiário
// (uma por emenda/parlamentar), então consolidamos server-side.

const TGOV_BASE = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';
const UF_ALVO = 'ES';
const TIMEOUT_MS = 12000;

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
      throw new Error(`TransfereGov ${r.status} :: ${text.slice(0, 200)}`);
    }
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

function urlPlanoAcaoES() {
  const qs = new URLSearchParams({
    uf_beneficiario_plano_acao: `eq.${UF_ALVO}`,
    select: 'cnpj_beneficiario_plano_acao,nome_beneficiario_plano_acao',
    limit: '1000',
  });
  return `${TGOV_BASE}/plano_acao_especial?${qs.toString()}`;
}

export default async function handler(req, res) {
  try {
    const rows = await getJson(urlPlanoAcaoES());

    // Deduplica por CNPJ; mantém o primeiro nome encontrado.
    const byCnpj = new Map();
    for (const r of rows) {
      const cnpj = String(r.cnpj_beneficiario_plano_acao || '').replace(/\D/g, '');
      if (!/^\d{14}$/.test(cnpj)) continue;
      if (!byCnpj.has(cnpj)) {
        byCnpj.set(cnpj, r.nome_beneficiario_plano_acao || '(Sem nome)');
      }
    }

    const entes = [...byCnpj.entries()]
      .map(([cnpj, nome]) => ({ cnpj, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    // Cache mais longo — a lista muda com baixa frequência.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(entes);
  } catch (err) {
    return res.status(502).json({
      error: 'Falha ao consultar a API TransfereGov.',
      detail: String(err && err.message ? err.message : err),
    });
  }
}
