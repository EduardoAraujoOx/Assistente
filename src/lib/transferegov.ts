export interface PlanoAcaoHistorico {
  cnpjBeneficiario?: string;
  nomeExecutor?: string;
  banco?: string;
  agencia?: string;
  emailConselho?: string;
}

interface FetchPlanosParams {
  ibge?: string;
  uf?: string;
  page?: number;
  size?: number;
  situacao?: string;
}

const API_BASE =
  process.env.TRANSFEREGOV_API_URL ||
  "https://api.transferegov.gestao.gov.br/transferenciasespeciais";

export async function fetchPlanosAprovados({
  ibge,
  uf = "ES",
  page = 0,
  size = 5,
  situacao = "APROVADO",
}: FetchPlanosParams): Promise<PlanoAcaoHistorico[]> {
  const url = new URL(`${API_BASE}/v1/plano-acao`);
  url.searchParams.set("uf", uf);
  url.searchParams.set("situacaoPlanoAcao", situacao);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));
  if (ibge) url.searchParams.set("codigoIbge", ibge);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (process.env.TRANSFEREGOV_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.TRANSFEREGOV_API_TOKEN}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Transferegov API HTTP ${response.status}`);
    }

    const data = await response.json();
    const lista = data?.content || data?.data || data;
    if (!Array.isArray(lista)) return [];

    return lista.map((item: Record<string, unknown>) => ({
      cnpjBeneficiario: asString(item.cnpjBeneficiario) || asString(item.cnpj),
      nomeExecutor:
        asString(item.nomeExecutor) ||
        asString(item.executor) ||
        asString(item.nomeEnte),
      banco: asString(item.banco),
      agencia: asString(item.agencia),
      emailConselho:
        asString(item.emailConselho) || asString(item.emailControleSocial),
    }));
  } finally {
    clearTimeout(timeout);
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
