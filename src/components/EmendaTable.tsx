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
      <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2.5">
        <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
          <i className="fas fa-list-alt text-gov-blue" />
          Emendas 2026
        </div>
        <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-sm uppercase tracking-wider bg-n-1 text-n-4 border border-n-2 self-start sm:self-auto truncate max-w-full">
          {ente ? ente.nome : "Nenhum ente público selecionado"}
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
            placeholder="Busque por número, parlamentar, município, objeto ou área temática..."
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
          {/* Header (desktop only) */}
          <div className="hidden md:grid grid-cols-[1fr_130px_90px] bg-n-1 px-3.5 py-2 gap-2 border-b border-n-2">
            <span className="text-[11px] font-medium text-n-4 uppercase tracking-wider">
              Objeto da emenda
            </span>
            <span className="text-[11px] font-medium text-n-4 uppercase tracking-wider">
              Parlamentar
            </span>
            <span className="text-[11px] font-medium text-n-4 uppercase tracking-wider text-right">
              Valor
            </span>
          </div>

          {/* Body */}
          <div className="max-h-[300px] md:max-h-[300px] overflow-y-auto scrollbar-thin">
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
                  className={`flex flex-col gap-2 md:grid md:grid-cols-[1fr_130px_90px] px-3.5 py-2.5 md:gap-2 border-t border-n-2 cursor-pointer transition-colors md:items-start first:border-t-0 ${
                    selected?.id === e.id
                      ? "bg-gov-blue-pale border-l-[3px] border-l-gov-blue-dark1"
                      : "hover:bg-n-1"
                  }`}
                >
                  <div className="min-w-0">
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
                  {/* Parlamentar/partido: inline on mobile, column on md+ */}
                  <div className="md:block">
                    <div className="text-xs text-n-5 md:text-xs">
                      <span className="md:hidden text-[10px] uppercase tracking-wider text-n-4 mr-1">Parlamentar:</span>
                      {e.parlamentar}
                      <span className="text-[10.5px] text-n-4 md:hidden"> &middot; {e.partido}</span>
                    </div>
                    <div className="text-[10.5px] text-n-4 mt-0.5 hidden md:block">
                      {e.partido}
                    </div>
                  </div>
                  {/* Valor: inline on mobile (flex row), right-aligned on md+ */}
                  <div className="flex items-center justify-between md:block">
                    <span className="text-[10px] uppercase tracking-wider text-n-4 md:hidden">Valor</span>
                    <div>
                      <div className="text-[13px] font-bold text-gov-blue-dark1 md:text-right font-mono">
                        {formatBRL(e.valor)}
                      </div>
                      <div className="text-[10.5px] text-n-4 md:text-right mt-0.5">
                        {e.prazo}m
                      </div>
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
