"use client";

import { Emenda } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

interface EmendaHeaderProps {
  emenda: Emenda;
}

export default function EmendaHeader({ emenda }: EmendaHeaderProps) {
  return (
    <div className="bg-white border border-n-2 rounded-lg p-4 md:p-5 mb-[18px] shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-sm font-medium text-n-6 leading-[1.45]">{emenda.objeto}</div>
        <div className="text-[11px] bg-n-1 text-n-4 rounded px-2 py-0.5 border border-n-2 shrink-0">
          {emenda.plano} · {emenda.prazo} meses
        </div>
      </div>

      <div className="text-xs text-n-4 grid sm:grid-cols-3 gap-x-3 gap-y-1 mb-2.5">
        <span>
          <strong className="text-n-5">Parlamentar:</strong> {emenda.parlamentar} ({emenda.partido})
        </span>
        <span>
          <strong className="text-n-5">Município:</strong> {emenda.municipio}/ES
        </span>
        <span>
          <strong className="text-n-5">Órgão:</strong> {emenda.orgao}
        </span>
      </div>

      <div className="text-[22px] font-bold text-gov-blue-dark1 font-mono tracking-tight">
        {formatBRL(emenda.valor)}
      </div>
    </div>
  );
}
