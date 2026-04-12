"use client";

import { formatBRL } from "@/lib/utils";

interface FinancialBarProps {
  allocated: number;
  total: number;
}

export default function FinancialBar({ allocated, total }: FinancialBarProps) {
  const pct = total > 0 ? Math.min((allocated / total) * 100, 100) : 0;
  const diff = total - allocated;
  const isExact = Math.abs(diff) <= 0.01;
  const isOver = diff < -0.01;
  const isEmpty = allocated === 0;

  const barColor = isEmpty
    ? "bg-n-3"
    : isExact
    ? "bg-gov-green"
    : isOver
    ? "bg-gov-red"
    : "bg-gov-blue";

  return (
    <div className="mb-3.5">
      <div className="flex justify-between text-xs font-medium text-n-4 mb-1.5">
        <span>{formatBRL(allocated)} alocados</span>
        <span>de {formatBRL(total)}</span>
      </div>
      <div className="h-1.5 bg-n-1 rounded-full overflow-hidden border border-n-2">
        <div
          className={`h-full rounded-full transition-all duration-400 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isEmpty && (
        <div
          className={`text-xs p-[7px_11px] rounded mt-1.5 flex items-center gap-1.5 font-medium ${
            isExact
              ? "bg-green-50 text-gov-green"
              : isOver
              ? "bg-red-50 text-gov-red"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <i
            className={`fas ${
              isExact
                ? "fa-check-circle"
                : isOver
                ? "fa-times-circle"
                : "fa-exclamation-triangle"
            }`}
          />
          {isExact
            ? "Valor totalmente alocado."
            : isOver
            ? `Excesso de ${formatBRL(Math.abs(diff))}. Ajuste o valor da meta.`
            : `Faltam ${formatBRL(diff)} para atingir 100%. O TransfereGov exige aloca\u00e7\u00e3o completa.`}
        </div>
      )}
    </div>
  );
}
