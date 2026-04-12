import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { campo, emenda, area, orgao, finOpts } = await req.json();

  let prompt: string;
  if (campo === "finalidade") {
    prompt = `Objeto: "${emenda.objeto}" (\u00e1rea: ${area}, \u00f3rg\u00e3o: ${orgao}). Escolha a finalidade mais compat\u00edvel: ${finOpts}. Retorne APENAS o nome exato.`;
  } else {
    prompt = `Detalhamento do objeto de execu\u00e7\u00e3o para o Transferegov. Objeto: "${emenda.objeto}". Munic\u00edpio: ${emenda.municipio}/ES. Valor: R$ ${emenda.valor.toLocaleString("pt-BR")}. T\u00e9cnico, 3-5 linhas, verbos no infinitivo. Apenas o texto.`;
  }

  const maxTokens = campo === "finalidade" ? 80 : 500;

  // Try Gemini first
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json({ texto: text.trim() });
      }
    } catch {
      // Fall through
    }
  }

  // Anthropic fallback
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text =
          data.content?.find((c: { type: string }) => c.type === "text")
            ?.text || "";
        return NextResponse.json({ texto: text.trim() });
      }
    } catch {
      // Fall through
    }
  }

  // Static fallback
  if (campo === "finalidade") {
    return NextResponse.json({ texto: emenda.fin || "" });
  }
  return NextResponse.json({
    texto: `${emenda.objeto} O presente plano visa detalhar a execu\u00e7\u00e3o da emenda parlamentar no munic\u00edpio de ${emenda.municipio}/ES.`,
  });
}
