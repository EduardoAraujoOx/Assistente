import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { emenda, exemplosMesmoOrgao, finOpts } = await req.json();

  const prompt = `Voc\u00ea \u00e9 especialista em planos de trabalho de transfer\u00eancias especiais (LC 210/2024, Portaria Conjunta n\u00ba 15/2025, IN TCU 93/2024).

FONTE PRIM\u00c1RIA \u2014 Objeto definido pelo parlamentar via SIOP (\u00e2ncora de tudo):
"${emenda.objeto}"

FONTE SECUND\u00c1RIA \u2014 Objetos aprovados pelo mesmo \u00f3rg\u00e3o setorial (${emenda.orgao}):
${exemplosMesmoOrgao || "Sem exemplos dispon\u00edveis."}

DADOS: \u00c1rea: ${emenda.area} | Valor: R$ ${emenda.valor.toLocaleString("pt-BR")} | Munic\u00edpio: ${emenda.municipio}/ES | Natureza: ${emenda.nat} | Prazo: ${emenda.prazo} meses

FINALIDADES DISPON\u00cdVEIS: ${finOpts}

INSTRU\u00c7\u00d5ES:
1. O detalhamento deve detalhar o objeto prim\u00e1rio \u2014 nunca contradiz\u00ea-lo.
2. Escolha a finalidade considerando os exemplos aprovados do mesmo \u00f3rg\u00e3o.
3. A meta deve ser mensur\u00e1vel e coerente com o objeto.

Retorne APENAS JSON v\u00e1lido (sem markdown):
{"finalidade":"<da lista>","area":"<\u00e1rea confirmada>","detalhamento":"<3-5 linhas, t\u00e9cnico, verbos no infinitivo>","meta_desc":"<2-3 linhas mensur\u00e1veis>","meta_unidade":"<Unidade|Metro|Metro quadrado|Metro linear|Servi\u00e7o|Kit|Conjunto>","meta_quantidade":<inteiro>,"meta_natureza":"<44905200|44905100|33903000|33904000>"}`;

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
            generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json(parsed);
      }
    } catch {
      // Fall through to Anthropic fallback
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
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text =
          data.content?.find((c: { type: string }) => c.type === "text")
            ?.text || "{}";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json(parsed);
      }
    } catch {
      // Fall through to static fallback
    }
  }

  // Static fallback
  return NextResponse.json({
    finalidade: emenda.fin,
    area: emenda.area,
    detalhamento: `${emenda.objeto} O presente plano visa detalhar a execu\u00e7\u00e3o da emenda parlamentar no munic\u00edpio de ${emenda.municipio}/ES, em conformidade com a LC 210/2024 e a Portaria Conjunta n\u00ba 15/2025.`,
    meta_desc: emenda.objeto,
    meta_unidade: "Unidade",
    meta_quantidade: 1,
    meta_natureza: emenda.nat,
  });
}
