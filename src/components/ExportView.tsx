"use client";

import { useState, useEffect } from "react";
import { PlanoState } from "@/lib/types";
import { formatBRL, NATUREZAS } from "@/lib/utils";
import CopyButton from "./CopyButton";

interface ExportViewProps {
  state: PlanoState;
  onBack: () => void;
  onFeedback: () => void;
  onSave: () => void;
}

function FieldRow({ label, value, tag, copyValue }: { label: string; value: string; tag?: "ia" | "lock" | "hist"; copyValue?: string }) {
  const bgStyles = {
    ia: "bg-purple-50/40",
    lock: "bg-n-1",
    hist: "bg-green-50/40",
  };

  return (
    <div className={`flex flex-col md:flex-row md:items-start gap-1 md:gap-3 px-3.5 py-2.5 border-b border-n-1 last:border-b-0 ${tag ? bgStyles[tag] : ""}`}>
      <span className="text-[11px] md:text-xs font-medium text-n-4 md:w-[185px] md:shrink-0 md:pt-0.5 uppercase md:normal-case tracking-wider md:tracking-normal">
        {label}
        {tag === "ia" && <span className="ml-1 text-purple-600">&diams;</span>}
      </span>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span className="text-xs text-n-5 flex-1 leading-relaxed whitespace-pre-wrap break-words">{value || "\u2014"}</span>
        {tag !== "lock" && value && (
          <CopyButton text={copyValue || value} className="no-print shrink-0" />
        )}
      </div>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] ${checked ? "bg-gov-green border-gov-green text-white" : "border-n-3 text-transparent"}`}>
        <i className="fas fa-check" />
      </div>
      <span className={`text-xs ${checked ? "text-n-5" : "text-n-4"}`}>{label}</span>
    </div>
  );
}

export default function ExportView({ state, onBack, onFeedback, onSave }: ExportViewProps) {
  const emenda = state.emenda!;
  const mv = parseFloat(String(state.meta.valor)) || 0;
  const isComplete = Math.abs(mv - emenda.valor) < 1 && !!state.det && !!state.beneficiario && !!state.finalidade && !!state.meta.desc;

  const [checklist, setChecklist] = useState([false, false, false, false]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tga_checklist");
      if (saved) setChecklist(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggleCheck = (idx: number) => {
    const next = [...checklist];
    next[idx] = !next[idx];
    setChecklist(next);
    try { localStorage.setItem("tga_checklist", JSON.stringify(next)); } catch { /* ignore */ }
  };


  const gerarTexto = () => {
    const hoje = new Date().toLocaleDateString("pt-BR");
    let t = `TRANSFEREGOV ASSISTENTE \u2014 PLANO DE TRABALHO PR\u00c9-PREENCHIDO\nSEFAZ-ES | Tesouro Estadual \u00b7 Esp\u00edrito Santo \u00b7 2026\n${"=".repeat(60)}\n\n`;
    t += `EMENDA\nPlano: ${emenda.plano}\nObjeto de execu\u00e7\u00e3o: ${emenda.objeto}\nParlamentar: ${emenda.parlamentar} (${emenda.partido})\nMunic\u00edpio: ${emenda.municipio}/ES \u00b7 \u00d3rg\u00e3o: ${emenda.orgao}\nValor: ${formatBRL(emenda.valor)} \u00b7 Prazo: ${emenda.prazo} meses\n\n`;
    t += `DADOS B\u00c1SICOS\nFinalidade [\u2666 confirme]: ${state.finalidade || "\u2014"}\n\u00c1rea tem\u00e1tica [\u2666 confirme]: ${state.area || "\u2014"}\nA\u00e7\u00e3o or\u00e7ament\u00e1ria: ${state.acao || "(a confirmar)"}\nBenefici\u00e1rio: ${state.beneficiario || "\u2014"} \u2014 CNPJ: ${state.cnpj || "\u2014"}\nRespons\u00e1vel: ${state.responsavel || "\u2014"}${state.executor ? "\nExecutor: " + state.executor : ""}\n\n`;
    t += `PLANO DE TRABALHO\nDetalhamento do objeto [\u2666 confirme]:\n${state.det || "\u2014"}\n\nMETA 1 [\u2666 confirme]:\n${state.meta.desc || "\u2014"}\nUnidade: ${state.meta.unidade} \u00b7 Qtd: ${state.meta.quantidade || "\u2014"} \u00b7 Valor: ${state.meta.valor ? formatBRL(Number(state.meta.valor)) : "\u2014"} \u00b7 Natureza: ${state.meta.natureza || "\u2014"} \u00b7 Prazo: ${state.meta.prazo || "\u2014"} meses\n\nBANCO/AG\u00caNCIA: ${state.banco || "\u2014"} \u00b7 ${state.agencia || "\u2014"}\n\n`;
    t += `NOTIFICA\u00c7\u00d5ES AUTOM\u00c1TICAS\npresidencia@al.es.gov.br (ALES \u2014 fixo)\npresidencia@tce.es.gov.br (TCE-ES \u2014 fixo)\ntransparencia@sefaz.es.gov.br (Transpar\u00eancia Capixaba \u2014 fixo)\n`;
    if (state.conselhos.length) t += state.conselhos.join("\n") + "\n";
    if (state.docs.length) t += `\nDOCUMENTOS\n${state.docs.join("\n")}\n`;
    t += `\n${"=".repeat(60)}\nGerado em ${hoje} \u2014 Transferegov Assistente \u00b7 SEFAZ-ES | Tesouro Estadual\n[\u2666] Campos confirmados automaticamente \u2014 verifique antes de inserir no Transferegov.\n`;
    return t;
  };

  const exportarDoc = () => {
    const blob = new Blob([gerarTexto()], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Transferegov-Assistente-${emenda.plano}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(gerarTexto());
      alert("Texto copiado. Campos [\u2666] foram gerados automaticamente \u2014 confirme antes de inserir no Transferegov.");
    } catch {
      alert("Use o bot\u00e3o de download.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Page header */}
        <div className="mb-5">
          <h2 className="text-xl font-medium text-gov-blue-dark2 tracking-tight mb-1">
            Exportar Plano de Trabalho
          </h2>
          <div className="h-0.5 bg-gov-blue w-9 rounded mb-2" />
          <p className="text-[13px] text-n-4">
            Use o guia abaixo com o Transferegov aberto ao lado. Copie cada campo na ordem indicada.
          </p>
        </div>

        {/* Banner */}
        <div className="bg-gov-blue-dark1 text-white rounded-lg px-5 py-3.5 mb-4 no-print">
          <div className="text-[13px] font-medium mb-1">
            <i className="fas fa-external-link-alt mr-2" />
            Abra o Transferegov em outra aba e copie cada campo abaixo na ordem indicada.
          </div>
          <div className="text-[11px] text-white/60">
            Clique em [Copiar] para copiar o texto exato de cada campo.
          </div>
        </div>

        {/* Status */}
        <div className={`px-4 py-3 rounded-lg text-[13px] mb-4 flex items-center gap-2.5 font-medium border-l-[3px] ${isComplete ? "bg-green-50 text-gov-green border-l-gov-green" : "bg-amber-50 text-amber-700 border-l-amber-500"}`}>
          <i className={`fas ${isComplete ? "fa-check-circle" : "fa-exclamation-triangle"}`} />
          {isComplete
            ? "Plano completo. Pronto para inserir no Transferegov."
            : "Aten\u00e7\u00e3o: verifique campos incompletos antes de inserir no sistema."}
        </div>

        {/* ═══ BLOCO 1: DADOS BÁSICOS ═══ */}
        <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden print-block">
          <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px]">
            <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
              <i className="fas fa-database text-gov-blue" /> 1. Aba &ldquo;Dados B&aacute;sicos&rdquo;
            </div>
          </div>
          <div>
            <FieldRow label="Objeto de execu\u00e7\u00e3o" value="(somente leitura \u2014 vem do SIOP)" tag="lock" />
            <FieldRow label="Finalidade" value={state.finalidade} tag="ia" />
            <FieldRow label="\u00c1rea tem\u00e1tica" value={state.area} tag="ia" />
            <FieldRow label="A\u00e7\u00e3o or\u00e7ament\u00e1ria" value={state.acao || "(confirmar com setorial)"} />
            <FieldRow label="Benefici\u00e1rio" value={state.beneficiario} />
            <FieldRow label="CNPJ" value={state.cnpj} />
          </div>
        </div>

        {/* ═══ BLOCO 2: PLANO DE TRABALHO ═══ */}
        <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden print-block">
          <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px]">
            <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
              <i className="fas fa-clipboard-list text-gov-blue" /> 2. Aba &ldquo;Plano de Trabalho&rdquo;
            </div>
          </div>
          <div>
            <FieldRow label="Detalhamento do objeto" value={state.det} tag="ia" />
            <FieldRow label="Meta 1 \u2014 Descri\u00e7\u00e3o" value={state.meta.desc} tag="ia" />
            <FieldRow label="Meta 1 \u2014 Unidade" value={state.meta.unidade} />
            <FieldRow label="Meta 1 \u2014 Quantidade" value={String(state.meta.quantidade || "\u2014")} />
            <FieldRow label="Meta 1 \u2014 Valor" value={state.meta.valor ? formatBRL(Number(state.meta.valor)) : "\u2014"} copyValue={String(state.meta.valor)} />
            <FieldRow label="Meta 1 \u2014 Natureza" value={NATUREZAS[state.meta.natureza] || state.meta.natureza} copyValue={state.meta.natureza} />
            <FieldRow label="Meta 1 \u2014 Prazo" value={state.meta.prazo ? `${state.meta.prazo} meses` : "\u2014"} copyValue={String(state.meta.prazo)} />
            <FieldRow label="Executor" value={state.executor || state.beneficiario} />
            <FieldRow label="Banco / Ag\u00eancia" value={state.banco && state.agencia ? `${state.banco} \u2014 ${state.agencia}` : "\u2014"} />
          </div>
        </div>

        {/* ═══ BLOCO 3: CONTROLE SOCIAL ═══ */}
        <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden print-block">
          <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px]">
            <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
              <i className="fas fa-users text-gov-blue" /> 3. Controle Social
            </div>
          </div>
          <div>
            <FieldRow label="E-mail ALES" value="presidencia@al.es.gov.br" tag="lock" />
            <FieldRow label="E-mail TCE-ES" value="presidencia@tce.es.gov.br" tag="lock" />
            <FieldRow label="Transpar\u00eancia Capixaba" value="transparencia@sefaz.es.gov.br" tag="lock" />
            {state.conselhos.map((c, i) => (
              <FieldRow key={i} label="Conselho local" value={c} tag="hist" />
            ))}
          </div>
        </div>

        {/* Download / copy buttons */}
        <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden no-print">
          <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px]">
            <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
              <i className="fas fa-download text-gov-blue" /> Exportar
            </div>
          </div>
          <div className="p-[18px] flex flex-wrap gap-2.5">
            <button onClick={exportarDoc} className="bg-gov-blue text-white border-none px-4 py-[9px] rounded text-[13px] font-bold flex items-center gap-[7px] hover:bg-gov-blue-dark1">
              <i className="fas fa-file-word" /> Baixar Word (.doc)
            </button>
            <button onClick={copiarTexto} className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-4 py-2 rounded text-[13px] font-medium flex items-center gap-[7px] hover:bg-gov-blue-pale">
              <i className="fas fa-copy" /> Copiar texto
            </button>
            <button onClick={() => { onSave(); alert("Rascunho salvo."); }} className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-4 py-2 rounded text-[13px] font-medium flex items-center gap-[7px] hover:bg-gov-blue-pale">
              <i className="fas fa-save" /> Salvar rascunho
            </button>
            <button onClick={() => window.print()} className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-4 py-2 rounded text-[13px] font-medium flex items-center gap-[7px] hover:bg-gov-blue-pale">
              <i className="fas fa-print" /> Imprimir PDF
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-5 flex-wrap gap-2.5 no-print">
          <button onClick={onBack} className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-4 py-2 rounded text-[13px] font-medium flex items-center gap-[7px] hover:bg-gov-blue-pale">
            <i className="fas fa-arrow-left" /> Voltar e editar
          </button>
          <button onClick={onFeedback} className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-3 py-[5px] rounded text-xs font-medium flex items-center gap-1.5 hover:bg-gov-blue-pale">
            <i className="fas fa-star" /> Avaliar ferramenta
          </button>
        </div>

        {/* Print header */}
        <div className="print-only mb-4">
          <div className="text-base font-bold">Transferegov Assistente &mdash; SEFAZ-ES</div>
          <div className="text-xs text-n-4">Plano de Trabalho Pr&eacute;-preenchido &mdash; {emenda.plano} &mdash; {emenda.municipio}/ES</div>
          <div className="text-xs text-n-4">{emenda.parlamentar} ({emenda.partido}) &mdash; {formatBRL(emenda.valor)}</div>
        </div>
      </div>

      {/* ═══ MINI CHECKLIST ═══ */}
      <div className="w-full lg:w-52 shrink-0 no-print hidden lg:block">
        <div className="sticky top-28 bg-white border border-n-2 rounded-lg shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-n-4 mb-3">
            Progresso no Transferegov
          </div>
          {[
            "Aba Dados B\u00e1sicos preenchida",
            "Aba Plano de Trabalho preenchida",
            "Controle social adicionado",
            "Plano de Trabalho conclu\u00eddo",
          ].map((label, i) => (
            <button key={i} onClick={() => toggleCheck(i)} className="w-full text-left bg-transparent border-none p-0 cursor-pointer">
              <CheckItem label={label} checked={checklist[i]} />
            </button>
          ))}
          <div className="mt-3 pt-3 border-t border-n-2">
            <div className="text-[10px] text-n-4">
              {checklist.filter(Boolean).length}/4 etapas conclu&iacute;das
            </div>
            <div className="h-1 bg-n-1 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gov-green rounded-full transition-all"
                style={{ width: `${(checklist.filter(Boolean).length / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
