import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // If Supabase is configured, save there
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/feedbacks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          nota: payload.nota,
          comentario: payload.comentario,
          ente: payload.ente,
          emenda: payload.emenda,
          created_at: payload.ts,
        }),
      });
    } catch (err) {
      console.error("Supabase feedback error:", err);
    }
  } else {
    console.log("Feedback recebido:", JSON.stringify(payload));
  }

  return NextResponse.json({ ok: true });
}
