"use client";

import { EMENDAS } from "@/lib/data/emendas";
import { usePlano } from "@/lib/usePlano";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import WizardSteps from "@/components/WizardSteps";
import EnteSelector from "@/components/EnteSelector";
import EmendaTable from "@/components/EmendaTable";
import EmendaHeader from "@/components/EmendaHeader";
import GeneratingView from "@/components/GeneratingView";
import PlanoForm from "@/components/PlanoForm";
import ExportView from "@/components/ExportView";
import FeedbackModal from "@/components/FeedbackModal";

export default function Home() {
  const {
    state,
    update,
    updateMeta,
    showRestore,
    setShowRestore,
    showFeedback,
    setShowFeedback,
    restaurar,
    novoPlano,
    selectEnte,
    selectEmenda,
    gerarPlano,
    goToExport,
    goToPlano,
    goToSelection,
    currentStep,
    canGoToStep,
    save,
  } = usePlano();

  const handleStepClick = (step: number) => {
    if (step === 1) goToSelection();
    else if (step === 2) goToPlano();
    else if (step === 3) goToExport();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onNovoPlano={novoPlano} />

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <Sidebar
          currentStep={currentStep}
          onStepClick={handleStepClick}
          canGoToStep={canGoToStep}
        />

        <main className="flex-1 min-w-0">
          {/* Wizard steps (mobile) */}
          <WizardSteps currentStep={currentStep} />

          <div className="max-w-[760px] mx-auto px-3 sm:px-6 py-5 md:py-7 pb-16">
            {/* Restore bar */}
            {showRestore && (
              <div className="bg-gov-blue-pale border border-blue-200 rounded-lg px-4 py-2.5 mb-5 text-[13px] text-gov-blue-dark1 flex items-center justify-between gap-3 font-medium">
                <span>
                  <i className="fas fa-save mr-1.5" />
                  Rascunho salvo encontrado.
                </span>
                <button
                  onClick={() => { restaurar(); setShowRestore(false); }}
                  className="bg-gov-blue text-white border-none px-3 py-[5px] rounded text-xs font-bold hover:bg-gov-blue-dark1"
                >
                  Restaurar
                </button>
              </div>
            )}

            {/* ═══ VIEW: SELEÇÃO ═══ */}
            {state.view === "sel" && (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl font-medium text-gov-blue-dark2 tracking-tight mb-1">
                    Seleção da emenda parlamentar
                  </h2>
                  <div className="h-0.5 bg-gov-blue w-9 rounded mb-2" />
                  <p className="text-[13px] text-n-4">
                    Escolha o ente público beneficiário e a emenda. O plano de trabalho será pré-preenchido automaticamente.
                  </p>
                </div>

                {/* Instrução */}
                <div className="bg-gov-blue-pale border-l-[3px] border-l-gov-blue rounded-lg px-4 py-3.5 mb-5 flex gap-3.5 items-start">
                  <i className="fas fa-info-circle text-gov-blue text-xl mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-[13px] font-bold text-gov-blue-dark1 mb-1">Fluxo de preenchimento</h4>
                    <p className="text-xs text-n-4 leading-relaxed">
                      Selecione o ente p&uacute;blico, encontre sua emenda na lista e clique em <strong>&ldquo;Gerar plano pré-preenchido&rdquo;</strong>. O sistema sugere automaticamente os campos do Plano de Trabalho com base no objeto definido pelo parlamentar e no histórico de planos aprovados. Você revisa, ajusta e exporta para inserir no Transferegov.
                    </p>
                  </div>
                </div>

                {/* 3 passos */}
                <div className="flex flex-col sm:flex-row gap-0 mb-6 border border-n-2 rounded-lg overflow-hidden">
                  {[
                    { num: 1, title: "Selecione", desc: "Escolha o ente e a emenda" },
                    { num: 2, title: "Revise", desc: "Confira os campos gerados" },
                    { num: 3, title: "Exporte", desc: "Copie os campos para o Transferegov" },
                  ].map((p, i) => (
                    <div
                      key={p.num}
                      className={`flex-1 px-4 py-3 bg-white flex gap-2.5 items-start ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-n-2" : ""}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gov-blue text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {p.num}
                      </div>
                      <div className="text-xs text-n-4 leading-[1.4]">
                        <strong className="text-n-5 font-medium block mb-0.5">{p.title}</strong>
                        {p.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <EnteSelector selected={state.ente} onChange={selectEnte} />

                <EmendaTable
                  emendas={EMENDAS}
                  ente={state.ente}
                  selected={state.emenda}
                  onSelect={selectEmenda}
                />

                <div className="text-right mt-4">
                  <button
                    onClick={gerarPlano}
                    disabled={!state.emenda}
                    className="bg-gov-blue text-white border-none px-5 py-[9px] rounded text-[13px] font-bold inline-flex items-center gap-[7px] hover:bg-gov-blue-dark1 disabled:bg-n-3 disabled:text-n-4 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-magic" /> Gerar plano pré-preenchido
                  </button>
                </div>
              </div>
            )}

            {/* ═══ VIEW: GERANDO ═══ */}
            {state.view === "gen" && <GeneratingView />}

            {/* ═══ VIEW: PLANO ═══ */}
            {state.view === "plano" && state.emenda && (
              <div>
                <EmendaHeader emenda={state.emenda} />
                <PlanoForm
                  state={state}
                  onChange={update}
                  onMetaChange={updateMeta}
                  onExport={goToExport}
                  onBack={goToSelection}
                />
              </div>
            )}

            {/* ═══ VIEW: EXPORTAR ═══ */}
            {state.view === "exportar" && state.emenda && (
              <div>
                <EmendaHeader emenda={state.emenda} />
                <ExportView
                  state={state}
                  onBack={goToPlano}
                  onFeedback={() => setShowFeedback(true)}
                  onSave={save}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gov-blue-dark2 text-white/40 px-3 md:px-6 py-3.5 text-[11px] flex items-center justify-between flex-wrap gap-2 no-print">
        <div>Transferegov Assistente &middot; SEFAZ-ES | Tesouro Estadual &middot; Esp&iacute;rito Santo &middot; 2026</div>
        <div>Plano de Trabalho Pr&eacute;-preenchido &mdash; Transfer&ecirc;ncias Especiais</div>
      </footer>

      {/* Feedback modal */}
      {showFeedback && (
        <FeedbackModal
          ente={state.ente?.nome || "\u2014"}
          emenda={state.emenda?.plano || "\u2014"}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}
