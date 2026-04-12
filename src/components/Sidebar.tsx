"use client";

interface SidebarProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  canGoToStep: (step: number) => boolean;
}

const steps = [
  { num: 1, label: "Selecionar emenda", icon: "fa-list-alt" },
  { num: 2, label: "Revisar plano", icon: "fa-edit" },
  { num: 3, label: "Exportar", icon: "fa-file-export" },
];

export default function Sidebar({
  currentStep,
  onStepClick,
  canGoToStep,
}: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-n-2 sticky top-[calc(3.5rem+2rem)] h-[calc(100vh-3.5rem-2rem)] shrink-0 no-print overflow-y-auto">
      <div className="px-4 pt-6 pb-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-n-4 mb-4">
          Etapas
        </div>
        <nav className="flex flex-col gap-1">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            const isClickable = canGoToStep(s.num);

            return (
              <button
                key={s.num}
                onClick={() => isClickable && onStepClick(s.num)}
                disabled={!isClickable}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all text-[13px] ${
                  isActive
                    ? "bg-gov-blue-pale text-gov-blue font-medium border-l-[3px] border-gov-blue"
                    : isDone
                    ? "text-gov-green hover:bg-green-50 cursor-pointer"
                    : "text-n-4 cursor-default"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border-[1.5px] ${
                    isActive
                      ? "bg-gov-blue text-white border-gov-blue"
                      : isDone
                      ? "bg-gov-green text-white border-gov-green"
                      : "bg-n-1 text-n-4 border-n-3"
                  }`}
                >
                  {isDone ? (
                    <i className="fas fa-check text-[10px]" />
                  ) : (
                    s.num
                  )}
                </div>
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 mt-6 border-t border-n-2 pt-4">
        <div className="text-[10px] text-n-4">
          Transfer\u00eancias Especiais
        </div>
        <div className="text-[10px] text-n-4">
          LC 210/2024
        </div>
      </div>
    </aside>
  );
}
