export interface Emenda {
  id: string;
  plano: string;
  parlamentar: string;
  partido: string;
  valor: number;
  area: string;
  objeto: string;
  municipio: string;
  prazo: number;
  nat: string;
  orgao: string;
  fin: string;
}

export interface Ente {
  cod: string;
  nome: string;
  cnpj: string;
  ibge: string;
  grupo: string;
}

export interface HistoricoData {
  cnpjBeneficiario: string;
  nomeExecutor: string;
  banco: string;
  agencia: string;
  emailConselho: string;
}

export interface MetaData {
  desc: string;
  unidade: string;
  quantidade: number | string;
  valor: number | string;
  natureza: string;
  prazo: number | string;
}

export interface PlanoState {
  view: "sel" | "gen" | "plano" | "exportar";
  ente: Ente | null;
  emenda: Emenda | null;
  hist: HistoricoData | null;
  finalidade: string;
  area: string;
  acao: string;
  det: string;
  meta: MetaData;
  beneficiario: string;
  cnpj: string;
  responsavel: string;
  executor: string;
  banco: string;
  agencia: string;
  contaExist: string;
  conselhos: string[];
  docs: string[];
}

export interface GerarPlanoResponse {
  finalidade: string;
  area: string;
  detalhamento: string;
  meta_desc: string;
  meta_unidade: string;
  meta_quantidade: number;
  meta_natureza: string;
}

export interface FeedbackPayload {
  nota: number;
  comentario: string;
  ente: string;
  emenda: string;
  ts: string;
}
