import { HistoricoData } from "../types";

export const HIST_MOCK: Record<string, HistoricoData[]> = {
  "3205309": [
    {
      cnpjBeneficiario: "27.142.357/0001-23",
      nomeExecutor: "Secretaria Municipal de Sa\u00fade de Vit\u00f3ria",
      banco: "CEF",
      agencia: "CEF-3055",
      emailConselho: "cms@vitoria.es.gov.br",
    },
  ],
  "3205200": [
    {
      cnpjBeneficiario: "27.165.695/0001-18",
      nomeExecutor:
        "Secretaria Municipal de Educa\u00e7\u00e3o de Vila Velha",
      banco: "BB",
      agencia: "BB-3801",
      emailConselho: "cme@vilavelha.es.gov.br",
    },
  ],
  "3201308": [
    {
      cnpjBeneficiario: "27.165.840/0001-90",
      nomeExecutor:
        "Secretaria Municipal de Infraestrutura de Cariacica",
      banco: "CEF",
      agencia: "CEF-3055",
      emailConselho: "cmpu@cariacica.es.gov.br",
    },
  ],
  "3205010": [
    {
      cnpjBeneficiario: "27.174.093/0001-15",
      nomeExecutor: "Secretaria Municipal de Obras de Serra",
      banco: "CEF",
      agencia: "CEF-3055",
      emailConselho: "cidades@serra.es.gov.br",
    },
  ],
  "3204906": [
    {
      cnpjBeneficiario: "27.165.776/0001-07",
      nomeExecutor:
        "Secretaria Municipal de Assist\u00eancia Social de S\u00e3o Mateus",
      banco: "BB",
      agencia: "BB-3801",
      emailConselho: "cmas@saomateus.es.gov.br",
    },
  ],
};

export const AGENCIAS: Record<string, { val: string; lbl: string }[]> = {
  CEF: [{ val: "CEF-3055", lbl: "Ag. 3055-0 \u2014 Vit\u00f3ria (Setor P\u00fablico ES)" }],
  BB: [{ val: "BB-3801", lbl: "Ag. 3801-7 \u2014 Vit\u00f3ria (Governo Estadual ES)" }],
};
