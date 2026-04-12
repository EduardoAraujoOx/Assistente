import { NextRequest, NextResponse } from "next/server";
import { HIST_MOCK } from "@/lib/data/historico";
import { fetchPlanosAprovados } from "@/lib/transferegov";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ibge = searchParams.get("ibge") || "";
  const cnpj = searchParams.get("cnpj") || "";
  const nome = searchParams.get("nome") || "";

  try {
    const planos = await fetchPlanosAprovados({ ibge });
    if (planos.length > 0) {
      return NextResponse.json({ planos, fonte: "api" });
    }
  } catch {
    // API indisponível: seguir para fallback local.
  }

  const mockData = HIST_MOCK[ibge];
  if (mockData && mockData.length > 0) {
    return NextResponse.json({
      planos: mockData.map((h) => ({
        cnpjBeneficiario: h.cnpjBeneficiario || cnpj,
        nomeExecutor: h.nomeExecutor || nome,
        banco: h.banco,
        agencia: h.agencia,
        emailConselho: h.emailConselho,
      })),
      fonte: "mock",
    });
  }

  return NextResponse.json({
    planos: [
      {
        cnpjBeneficiario: cnpj,
        nomeExecutor: "",
        banco: "",
        agencia: "",
        emailConselho: "",
      },
    ],
    fonte: "fallback",
  });
}
