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
    <div className="bg-white border border-n-2 rounded-lg p-4 mb-3.5 flex items-center gap-3.5 shadow-sm">
      <i className="fas fa-building text-gov-blue text-base shrink-0" />
      <label htmlFor="sel-ente" className="text-[13px] font-medium text-n-5 whitespace-nowrap">
        Ente p\u00fablico:
      </label>
      <select
        id="sel-ente"
        value={currentValue}
        onChange={handleChange}
        className="flex-1 px-2.5 py-2 border border-n-3 rounded text-[13px] font-sans bg-white text-n-5 focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
      >
        <option value="">&mdash; Selecione o munic\u00edpio ou estado &mdash;</option>
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
