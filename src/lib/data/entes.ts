import { Ente } from "../types";

export const ENTES: { grupo: string; items: Ente[] }[] = [
  {
    grupo: "Estado",
    items: [
      {
        cod: "ES",
        nome: "Governo do Estado do Esp\u00edrito Santo",
        cnpj: "27.080.518/0001-06",
        ibge: "ES",
        grupo: "Estado",
      },
    ],
  },
  {
    grupo: "Grande Vit\u00f3ria",
    items: [
      { cod: "VIT", nome: "Vit\u00f3ria", cnpj: "27.142.357/0001-23", ibge: "3205309", grupo: "Grande Vit\u00f3ria" },
      { cod: "VIL", nome: "Vila Velha", cnpj: "27.165.695/0001-18", ibge: "3205200", grupo: "Grande Vit\u00f3ria" },
      { cod: "CAR", nome: "Cariacica", cnpj: "27.165.840/0001-90", ibge: "3201308", grupo: "Grande Vit\u00f3ria" },
      { cod: "SER", nome: "Serra", cnpj: "27.174.093/0001-15", ibge: "3205010", grupo: "Grande Vit\u00f3ria" },
      { cod: "GUA", nome: "Guarapari", cnpj: "27.165.585/0001-50", ibge: "3202405", grupo: "Grande Vit\u00f3ria" },
      { cod: "VEN", nome: "Viana", cnpj: "27.165.946/0001-80", ibge: "3205101", grupo: "Grande Vit\u00f3ria" },
    ],
  },
  {
    grupo: "Norte",
    items: [
      { cod: "SAO", nome: "S\u00e3o Mateus", cnpj: "27.165.776/0001-07", ibge: "3204906", grupo: "Norte" },
      { cod: "LIN", nome: "Linhares", cnpj: "27.165.675/0001-11", ibge: "3203304", grupo: "Norte" },
      { cod: "ARA", nome: "Aracruz", cnpj: "27.165.279/0001-08", ibge: "3200607", grupo: "Norte" },
    ],
  },
  {
    grupo: "Sul",
    items: [
      { cod: "CAC", nome: "Cachoeiro de Itapemirim", cnpj: "27.165.378/0001-39", ibge: "3201209", grupo: "Sul" },
      { cod: "ALE", nome: "Alegre", cnpj: "27.165.229/0001-82", ibge: "3200201", grupo: "Sul" },
    ],
  },
  {
    grupo: "Serrana",
    items: [
      { cod: "DOM", nome: "Domingos Martins", cnpj: "27.165.524/0001-27", ibge: "3201803", grupo: "Serrana" },
      { cod: "VNI", nome: "Venda Nova do Imigrante", cnpj: "27.165.916/0001-48", ibge: "3205051", grupo: "Serrana" },
    ],
  },
];

export const ALL_ENTES: Ente[] = ENTES.flatMap((g) => g.items);
