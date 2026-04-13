// Proxy serverless para a API TransfereGov (Transferências Especiais).
// Contorna o bloqueio de CORS na chamada direta pelo navegador.
//
// Rota: GET /api/transferegov?cnpj=XXXXXXXXXXXXXX
// Encaminha para:
//   https://api.transferegov.gestao.gov.br/transferenciasespeciais/proposta
//     ?cnpjProponente=eq.{cnpj}
//     &situacaoTransferencia=eq.AGUARDANDO_PLANO_DE_TRABALHO
//     &limit=50
//
// Se nenhuma emenda for encontrada com o filtro de situação, tenta novamente
// sem esse filtro (fallback compatível com o comportamento do HTML cliente).

const TGOV_BASE = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais/proposta';

async function buscar(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`TransfereGov ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  const cnpj = String(req.query.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    return res.status(400).json({ error: 'Parâmetro cnpj inválido (esperado 14 dígitos).' });
  }

  const urlPrimaria = `${TGOV_BASE}?cnpjProponente=eq.${cnpj}&situacaoTransferencia=eq.AGUARDANDO_PLANO_DE_TRABALHO&limit=50`;
  const urlFallback = `${TGOV_BASE}?cnpjProponente=eq.${cnpj}&limit=30`;

  try {
    let data = await buscar(urlPrimaria);
    if (!Array.isArray(data) || data.length === 0) {
      data = await buscar(urlFallback);
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      error: 'Falha ao consultar a API TransfereGov.',
      detail: String(err && err.message ? err.message : err),
    });
  }
}
