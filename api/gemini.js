// Proxy serverless para Gemini — mantém GEMINI_API_KEY fora do browser.
//
// POST /api/gemini
// Body: { prompt: string, temperature?: number, maxTokens?: number }
// Response: { text: string }

const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const TIMEOUT_MS   = 30000;

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

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
    `:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: `Gemini retornou ${r.status}`, detail: detail.slice(0, 300) });
    }

    const d  = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao chamar Gemini.', detail: String(err?.message ?? err) });
  } finally {
    clearTimeout(timer);
  }
}
