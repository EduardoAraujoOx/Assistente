export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCNPJ(raw: string): string {
  const v = raw.replace(/\D/g, "").slice(0, 14);
  if (v.length > 12)
    return v.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/,
      "$1.$2.$3/$4-$5"
    );
  if (v.length > 8)
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, "$1.$2.$3/$4");
  if (v.length > 5)
    return v.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, "$1.$2.$3");
  if (v.length > 2) return v.replace(/^(\d{2})(\d{1,3}).*/, "$1.$2");
  return v;
}

export const NATUREZAS: Record<string, string> = {
  "44905200": "449052 \u2014 Equip. e material permanente",
  "44905100": "449051 \u2014 Obras e instala\u00e7\u00f5es",
  "33903000": "339030 \u2014 Material de consumo",
  "33904000": "339040 \u2014 Servi\u00e7os de terceiros \u2014 PJ",
};

export const UNIDADES = [
  "Unidade",
  "Metro",
  "Metro quadrado",
  "Metro linear",
  "Servi\u00e7o",
  "Kit",
  "Conjunto",
];

export const STORAGE_KEY = "tga_v7";
