"use client";

import { ENTES } from "@/lib/data/entes";
import { Ente } from "@/lib/types";

interface EnteSelectorProps {
  selected: Ente | null;
  onChange: (ente: Ente) => void;
}

export default function EnteSelector({ selected, onChange }: EnteSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [cod, nome, cnpj, ibge] = val.split("|");
    onChange({ cod, nome, cnpj, ibge, grupo: "" });
  };

  const currentValue = selected
    ? `${selected.cod}|${selected.nome}|${selected.cnpj}|${selected.ibge}`
    : "";

  return (
    <div className="bg-white border border-n-2 rounded-lg p-3 md:p-4 mb-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <i className="fas fa-building text-gov-blue-dark1 text-base shrink-0" />
        <label htmlFor="sel-ente" className="text-[13px] font-semibold text-n-6 whitespace-nowrap">
          Ente público beneficiário:
        </label>
      </div>
      <select
        id="sel-ente"
        value={currentValue}
        onChange={handleChange}
        className="w-full flex-1 px-2.5 py-2 border border-n-3 rounded text-[13px] font-sans bg-white text-n-5 focus:outline-none focus:border-gov-blue-dark1 focus:ring-2 focus:ring-gov-blue-dark1/15 min-w-0"
      >
        <option value="">Selecione o município ou o estado</option>
        {ENTES.map((grupo) => (
          <optgroup key={grupo.grupo} label={grupo.grupo}>
            {grupo.items.map((ente) => (
              <option
                key={ente.cod}
                value={`${ente.cod}|${ente.nome}|${ente.cnpj}|${ente.ibge}`}
              >
                {ente.nome}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
