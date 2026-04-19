// Proxy serverless — Knowledge Base de planos aprovados.
//
// GET /api/historico?q=texto+do+objeto&ano=2025&top=3
//
// Lê data/kb-{ano}.json (gerado por scripts/build-kb.mjs),
// calcula similaridade textual simples e retorna os top-N planos
// mais próximos do objeto informado.

import { readFileSync } from 'fs';
import { join }         from 'path';

const STOP_PT = new Set([
  'de','da','do','das','dos','para','em','com','a','o','e','por',
  'na','no','nas','nos','um','uma','ao','à','as','os','que','se',
  'os','no','ou','mais','como','sua','seu','ser','foi','são',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .split(/\W+/)
    .filter(w => w.length > 3 && !STOP_PT.has(w));
}

// Cosine simplificado sobre bag-of-words
function similarity(a, b) {
  const ta = tokenize(a);
  const tb = new Set(tokenize(b));
  if (!ta.length || !tb.size) return 0;
  const inter = ta.filter(w => tb.has(w)).length;
  return inter / Math.sqrt(ta.length * tb.size);
}

function loadKb(ano) {
  const path = join(process.cwd(), 'data', `kb-${ano}.json`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  const q    = String(req.query.q    || '').trim();
  const top  = Math.min(Number(req.query.top || 3), 10);
  const ano  = Number(req.query.ano || 2025);
  const cnpj = String(req.query.cnpj || '').replace(/\D/g, '');

  if (!q) return res.status(400).json({ error: 'Parâmetro "q" obrigatório.' });

  // Tenta o ano solicitado; se não houver KB, tenta o anterior
  const kb = loadKb(ano) ?? loadKb(ano - 1);
  if (!kb || !kb.length) {
    return res.status(200).json({ fonte: null, resultados: [] });
  }

  const scored = kb
    .map(plano => {
      const sim = similarity(q, plano.objetoExecutor || plano.objetoParlamentar || '');
      // Boost para planos do mesmo beneficiário (município ou estado)
      const sameCnpj = cnpj && (plano.cnpjBeneficiario || '').replace(/\D/g,'') === cnpj;
      return { ...plano, _score: sim * (sameCnpj ? 1.5 : 1) };
    })
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, top)
    .map(({ _score, ...rest }) => rest);

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({
    fonte:      `kb-${ano}.json`,
    resultados: scored,
  });
}
