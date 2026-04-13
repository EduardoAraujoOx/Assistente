"use client";

import { Emenda } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

interface EmendaHeaderProps {
  emenda: Emenda;
}

export default function EmendaHeader({ emenda }: EmendaHeaderProps) {
  return (
    <div className="bg-white border border-n-2 rounded-lg p-4 md:p-5 mb-[18px] shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-n-4 font-semibold mb-2">Referência da emenda</div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-sm font-medium text-n-6 leading-[1.45]">{emenda.objeto}</div>
        <div className="text-[11px] bg-n-1 text-n-4 rounded px-2 py-0.5 border border-n-2 shrink-0">
          {emenda.plano}
        </div>
      </div>

      <div className="text-xs text-n-4 grid sm:grid-cols-2 gap-x-3 gap-y-1.5">
        <span>
          <strong className="text-n-5">Parlamentar:</strong> {emenda.parlamentar} ({emenda.partido})
        </span>
        <span>
          <strong className="text-n-5">Município:</strong> {emenda.municipio}/ES
        </span>
        <span>
          <strong className="text-n-5">Órgão:</strong> {emenda.orgao}
        </span>
        <span>
          <strong className="text-n-5">Prazo:</strong> {emenda.prazo} meses · <strong className="text-n-5">Valor:</strong> {formatBRL(emenda.valor)}
        </span>
      </div>
    </div>
  );
}
