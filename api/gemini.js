// Proxy serverless para Gemini — mantém GEMINI_API_KEY fora do browser.
//
// POST /api/gemini
// Body: { prompt: string, temperature?: number, maxTokens?: number }
// Response: { text: string }

// Tentativa de modelos em ordem de preferência (fallback automático)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
];
const TIMEOUT_MS = 30000;

async function tryModel(model, apiKey, body, signal) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(body),
  });
  const detail = r.ok ? null : await r.text().catch(() => '');
  return { ok: r.ok, status: r.status, detail, json: r.ok ? await r.json() : null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no ambiente.' });
  }

  const { prompt, temperature = 0.25, maxTokens = 1500 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" obrigatório.' });
  }

  const geminiBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let lastError = '';
    for (const model of GEMINI_MODELS) {
      const result = await tryModel(model, apiKey, geminiBody, controller.signal);
      if (result.ok) {
        const text = result.json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return res.status(200).json({ text, model });
      }
      lastError = `${model}: ${result.status} ${result.detail?.slice(0, 150) ?? ''}`;
      // Só tenta próximo modelo em erros de disponibilidade (404) ou quota do modelo (429 com "no longer")
      const gone = result.status === 404 || (result.status === 429 && result.detail?.includes('no longer'));
      if (!gone) break;
    }
    return res.status(502).json({ error: 'Nenhum modelo Gemini disponível.', detail: lastError });
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao chamar Gemini.', detail: String(err?.message ?? err) });
  } finally {
    clearTimeout(timer);
  }
}
