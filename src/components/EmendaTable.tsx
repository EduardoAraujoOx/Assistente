"use client";

import { useState } from "react";
import { Emenda, Ente } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

interface EmendaTableProps {
  emendas: Emenda[];
  ente: Ente | null;
  selected: Emenda | null;
  onSelect: (emenda: Emenda) => void;
}

export default function EmendaTable({
  emendas,
  ente,
  selected,
  onSelect,
}: EmendaTableProps) {
  const [busca, setBusca] = useState("");

  const filtradas = emendas.filter((e) => {
    // Filter by ente
    if (ente && ente.nome && !ente.nome.includes("Estado")) {
      const mun = ente.nome.toLowerCase();
      const eMun = e.municipio.toLowerCase();
      if (eMun !== mun && !eMun.startsWith(mun.split(" ")[0].toLowerCase())) {
        return false;
      }
    }
    // Filter by search
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return [e.id, e.plano, e.parlamentar, e.municipio, e.area, e.objeto, e.partido]
        .some((f) => f.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="bg-white border border-n-2 rounded-lg shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px] flex items-center justify-between gap-2.5">
        <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
          <i className="fas fa-list-alt text-gov-blue" />
          Emendas 2026
        </div>
        <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-sm uppercase tracking-wider bg-n-1 text-n-4 border border-n-2">
          {ente ? ente.nome : "Nenhum ente selecionado"}
        </span>
      </div>

      <div className="p-[18px]">
        {/* Search */}
        <div className="relative mb-2.5">
          <i className="fas fa-search absolute left-[11px] top-1/2 -translate-y-1/2 text-n-4 text-sm pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Busque por n\u00famero, parlamentar, munic\u00edpio, objeto ou \u00e1rea tem\u00e1tica..."
            className="w-full pl-9 pr-3 py-[9px] border border-n-3 rounded text-[13px] font-sans text-n-5 placeholder:text-n-4 focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            autoComplete="off"
          />
        </div>

        <div className="text-xs text-n-4 mb-2.5">
          {filtradas.length} emenda{filtradas.length !== 1 ? "s" : ""} encontrada
          {filtradas.length !== 1 ? "s" : ""}
          {ente ? ` \u2014 ${ente.nome}` : ""}
        </div>

        {/* Table */}
        <div className="border border-n-2 rounded overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_130px_90px] bg-gov-blue-dark2 px-3.5 py-2 gap-2">
            <span className="text-[11px] font-medium text-white/65 uppercase tracking-wider">
              Objeto da emenda
            </span>
            <span className="text-[11px] font-medium text-white/65 uppercase tracking-wider hidden md:block">
              Parlamentar
            </span>
            <span className="text-[11px] font-medium text-white/65 uppercase tracking-wider text-right">
              Valor
            </span>
          </div>

          {/* Body */}
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            {filtradas.length === 0 ? (
              <div className="p-8 text-center text-n-4 text-[13px]">
                {ente
                  ? "Nenhuma emenda encontrada para este ente."
                  : "Selecione o ente no campo acima para filtrar as emendas."}
              </div>
            ) : (
              filtradas.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSelect(e)}
                  className={`grid grid-cols-[1fr_130px_90px] md:grid-cols-[1fr_130px_90px] px-3.5 py-2.5 gap-2 border-t border-n-2 cursor-pointer transition-colors items-start first:border-t-0 ${
                    selected?.id === e.id
                      ? "bg-gov-blue-pale border-l-[3px] border-l-gov-blue"
                      : "hover:bg-gov-blue-pale/50"
                  }`}
                >
                  <div>
                    <div className="text-[12.5px] font-medium text-n-5 leading-[1.35] mb-1">
                      {e.objeto}
                    </div>
                    <div className="text-[11px] text-n-4 flex gap-[5px] flex-wrap items-center">
                      <span className="text-[10px] px-[5px] py-px rounded-sm font-medium bg-gov-blue-pale text-gov-blue font-mono">
                        {e.plano}
                      </span>
                      <span className="text-[10px] px-[5px] py-px rounded-sm font-medium bg-n-1 text-n-4">
                        {e.area}
                      </span>
                      <span>{e.municipio}/ES</span>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-xs text-n-5">{e.parlamentar}</div>
                    <div className="text-[10.5px] text-n-4 mt-0.5">
                      {e.partido}
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gov-blue text-right font-mono">
                      {formatBRL(e.valor)}
                    </div>
                    <div className="text-[10.5px] text-n-4 text-right mt-0.5">
                      {e.prazo}m
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
