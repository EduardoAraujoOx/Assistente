"use client";

interface HeaderProps {
  onNovoPlano: () => void;
}

export default function Header({ onNovoPlano }: HeaderProps) {
  return (
    <>
      {/* Faixa principal */}
      <header className="bg-gov-blue-dark2 h-14 flex items-center px-6 gap-4 sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.2)] no-print">
        <div className="bg-white rounded px-2 py-1 flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-gov-blue-dark2 tracking-wide">
            SEFAZ-ES
          </span>
          <div className="w-px h-3.5 bg-n-3" />
          <span className="text-[11px] font-medium text-n-4">
            Tesouro Estadual
          </span>
        </div>

        <div className="w-px h-7 bg-white/15" />

        <div>
          <div className="text-white text-sm font-medium">
            TransfereGov Assistente
          </div>
          <div className="text-white/45 text-[11px] mt-px">
            Plano de Trabalho Pr\u00e9-preenchido &mdash; Transfer\u00eancias Especiais
          </div>
        </div>

        <div className="flex-1" />

        <span className="bg-white/10 text-white/70 text-[11px] font-medium px-2.5 py-0.5 rounded-sm border border-white/15">
          ES &middot; 2026
        </span>

        <button
          onClick={onNovoPlano}
          className="bg-transparent border border-white/30 text-white/70 px-3 py-1.5 rounded text-xs font-sans flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all"
        >
          <i className="fas fa-plus text-[10px]" />
          Novo plano
        </button>
      </header>

      {/* Faixa breadcrumb */}
      <div className="bg-gov-blue-dark1 px-6 py-2 text-white/60 text-[11px] flex items-center gap-2 no-print">
        <i className="fas fa-home text-[10px]" />
        <span>In\u00edcio</span>
        <i className="fas fa-chevron-right text-[8px] mx-1" />
        <span className="text-white/90">Transfer\u00eancias Especiais 2026</span>
        <i className="fas fa-chevron-right text-[8px] mx-1" />
        <span className="text-white/90">Plano de Trabalho</span>
      </div>
    </>
  );
}
