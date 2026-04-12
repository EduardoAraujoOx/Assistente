import { NextRequest, NextResponse } from "next/server";
import { HIST_MOCK } from "@/lib/data/historico";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ibge = searchParams.get("ibge") || "";
  const cnpj = searchParams.get("cnpj") || "";
  const nome = searchParams.get("nome") || "";

  // Try real TransfereGov API first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const apiUrl = new URL(
      "https://api.transferegov.gestao.gov.br/transferenciasespeciais/v1/plano-acao"
    );
    apiUrl.searchParams.set("uf", "ES");
    if (ibge) apiUrl.searchParams.set("codigoIbge", ibge);
    apiUrl.searchParams.set("situacaoPlanoAcao", "APROVADO");
    apiUrl.searchParams.set("page", "0");
    apiUrl.searchParams.set("size", "5");

    const res = await fetch(apiUrl.toString(), {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const planos = data?.content || data?.data || data;
      if (Array.isArray(planos) && planos.length > 0) {
        return NextResponse.json({ planos, fonte: "api" });
      }
    }
  } catch {
    // API unavailable — use mock
  }

  // Fallback to mock data
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
