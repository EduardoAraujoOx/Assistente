"use client";

interface WizardStepsProps {
  currentStep: number;
}

const steps = [
  { num: 1, label: "Selecionar emenda" },
  { num: 2, label: "Revisar plano" },
  { num: 3, label: "Exportar" },
];

export default function WizardSteps({ currentStep }: WizardStepsProps) {
  return (
    <div className="bg-white border-b border-n-2 px-3 sm:px-6 flex items-center gap-0 no-print md:hidden overflow-x-auto whitespace-nowrap">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.num;
        const isDone = currentStep > s.num;

        return (
          <div key={s.num} className="flex items-center">
            {idx > 0 && (
              <i className="fas fa-chevron-right text-n-3 text-xs mx-2" />
            )}
            <div
              className={`flex items-center gap-2.5 py-3.5 pr-4 text-[13px] border-b-[3px] transition-all ${
                isActive
                  ? "text-gov-blue border-gov-blue font-medium"
                  : isDone
                  ? "text-gov-green border-transparent"
                  : "text-n-4 border-transparent"
              }`}
            >
              <div
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold border-[1.5px] ${
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
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
