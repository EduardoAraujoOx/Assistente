"use client";

import { Emenda } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

interface EmendaHeaderProps {
  emenda: Emenda;
}

export default function EmendaHeader({ emenda }: EmendaHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-gov-blue-dark2 to-gov-blue-dark1 rounded-lg p-5 mb-[18px] shadow-md border-l-4 border-gov-yellow">
      <div className="float-right text-[11px] bg-white/10 text-white/65 rounded-sm px-2 py-0.5">
        {emenda.plano} &middot; {emenda.prazo} meses
      </div>
      <div className="text-sm font-medium text-white leading-[1.45] mb-2">
        {emenda.objeto}
      </div>
      <div className="text-xs text-white/50 flex gap-3.5 flex-wrap mb-2">
        <span className="flex items-center gap-1">
          <i className="fas fa-user-tie" /> {emenda.parlamentar} ({emenda.partido})
        </span>
        <span className="flex items-center gap-1">
          <i className="fas fa-map-marker-alt" /> {emenda.municipio}/ES
        </span>
        <span className="flex items-center gap-1">
          <i className="fas fa-building" /> {emenda.orgao}
        </span>
      </div>
      <div className="text-[22px] font-bold text-gov-yellow font-mono tracking-tight">
        {formatBRL(emenda.valor)}
      </div>
    </div>
  );
}
