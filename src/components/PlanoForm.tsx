"use client";

import { useState } from "react";
import { PlanoState, MetaData } from "@/lib/types";
import { FINALIDADES, AREAS } from "@/lib/data/finalidades";
import { AGENCIAS } from "@/lib/data/historico";
import { formatCNPJ, NATUREZAS, UNIDADES } from "@/lib/utils";
import FinancialBar from "./FinancialBar";

interface PlanoFormProps {
  state: PlanoState;
  onChange: (updates: Partial<PlanoState>) => void;
  onMetaChange: (updates: Partial<MetaData>) => void;
  onExport: () => void;
  onBack: () => void;
}

function FieldTag({ type, children }: { type: "lock" | "ia" | "hist"; children: React.ReactNode }) {
  const styles = {
    lock: "bg-n-1 text-n-5 border-n-3",
    ia: "bg-gov-blue-pale text-gov-blue-dark1 border-blue-200",
    hist: "bg-n-1 text-gov-green border-green-200",
  };
  const icons = { lock: "fa-lock", ia: "fa-robot", hist: "fa-check-circle" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-wide border mb-1.5 ${styles[type]}`}>
      <i className={`fas ${icons[type]}`} /> {children}
    </span>
  );
}

export default function PlanoForm({ state, onChange, onMetaChange, onExport, onBack }: PlanoFormProps) {
  const [regenFin, setRegenFin] = useState(false);
  const [regenDet, setRegenDet] = useState(false);
  const emenda = state.emenda!;
  const finOptions = FINALIDADES[state.area] || FINALIDADES[emenda.area] || [];
  const agOptions = AGENCIAS[state.banco] || [];

  const regenerar = async (campo: "finalidade" | "detalhamento") => {
    const setLoading = campo === "finalidade" ? setRegenFin : setRegenDet;
    setLoading(true);
    try {
      const res = await fetch("/api/regenerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campo,
          emenda,
          area: state.area,
          orgao: emenda.orgao,
          finOpts: finOptions.join(", "),
        }),
      });
      const data = await res.json();
      if (campo === "finalidade") {
        onChange({ finalidade: data.texto });
      } else {
        onChange({ det: data.texto });
      }
    } catch { /* fallback already handled by API */ }
    setLoading(false);
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h2 className="text-xl font-medium text-gov-blue-dark2 tracking-tight mb-1">
          Plano de Trabalho pré-preenchido
        </h2>
        <div className="h-0.5 bg-gov-blue w-9 rounded mb-2" />
        <p className="text-[13px] text-n-4">
          Revise os campos e ajuste o necessário. Campos marcados com <strong>◆</strong> foram sugeridos automaticamente — valide antes de inserir no Transferegov.
        </p>
      </div>

      {/* Status */}
      <div className="px-4 py-3 rounded-lg text-[13px] mb-[18px] flex items-center gap-2.5 font-medium border-l-[3px] bg-gov-blue-pale text-gov-blue border-l-gov-blue">
        <i className="fas fa-info-circle" /> Campos ◆ foram gerados com base no objeto do parlamentar e em planos aprovados. Confirme antes de salvar no Transferegov.
      </div>

      {/* ═══ CARD 1: DADOS BÁSICOS ═══ */}
      <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden">
        <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px] flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
            <i className="fas fa-info-circle text-gov-blue" /> Dados B&aacute;sicos
          </div>
          <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-sm uppercase tracking-wider bg-n-1 text-n-4 border border-n-2">
            aba &ldquo;Dados B&aacute;sicos&rdquo;
          </span>
        </div>
        <div className="p-[18px]">
          {/* Objeto (somente leitura) */}
          <div className="mb-3.5">
            <label className="block text-xs font-medium text-n-4 mb-1">
              Objeto de execu&ccedil;&atilde;o <span className="text-[10.5px] font-normal text-n-4">(definido pelo parlamentar via SIOP &mdash; somente leitura)</span>
            </label>
            <FieldTag type="lock">SIOP &mdash; somente leitura</FieldTag>
            <div className="bg-n-1 border border-n-2 rounded p-2 text-[13px] text-n-4 leading-relaxed">
              {emenda.objeto}
            </div>
          </div>

          {/* Finalidade + Área */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
            <div>
              <label className="block text-xs font-medium text-n-4 mb-1">
                Finalidade <span className="text-gov-red">*</span>
              </label>
              <FieldTag type="ia">&diams; autom&aacute;tico</FieldTag>
              <select
                value={state.finalidade}
                onChange={(e) => onChange({ finalidade: e.target.value })}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              >
                {finOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                <i className="fas fa-exclamation-triangle text-[11px]" /> Confirme no menu suspenso do Transferegov.
              </div>
              <button
                onClick={() => regenerar("finalidade")}
                disabled={regenFin}
                className="mt-1.5 bg-gov-blue-pale text-gov-blue border border-blue-200 px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 hover:bg-blue-100 disabled:opacity-50"
              >
                <i className={`fas ${regenFin ? "fa-spinner fa-spin" : "fa-redo"}`} /> Regenerar
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-n-4 mb-1">
                &Aacute;rea tem&aacute;tica <span className="text-gov-red">*</span>
              </label>
              <FieldTag type="ia">&diams; autom&aacute;tico</FieldTag>
              <select
                value={state.area}
                onChange={(e) => {
                  const newArea = e.target.value;
                  const newFins = FINALIDADES[newArea] || [];
                  onChange({
                    area: newArea,
                    finalidade: newFins[0] || "",
                  });
                }}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ação orçamentária */}
          <div className="mt-3.5">
            <label className="block text-xs font-medium text-n-4 mb-1">A&ccedil;&atilde;o or&ccedil;ament&aacute;ria</label>
            <input
              type="text"
              value={state.acao}
              onChange={(e) => onChange({ acao: e.target.value })}
              placeholder="Ex: 20B0"
              className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            />
            <div className="text-[11px] text-n-4 mt-1">Confirme o c&oacute;digo com a setorial or&ccedil;ament&aacute;ria do ente.</div>
          </div>
        </div>
      </div>

      {/* ═══ CARD 2: PLANO DE TRABALHO ═══ */}
      <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden">
        <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px] flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
            <i className="fas fa-tasks text-gov-blue" /> Plano de Trabalho
          </div>
          <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-sm uppercase tracking-wider bg-n-1 text-n-4 border border-n-2">
            aba &ldquo;Plano de Trabalho&rdquo;
          </span>
        </div>
        <div className="p-[18px]">
          {/* Detalhamento */}
          <div className="mb-3.5">
            <label className="block text-xs font-medium text-n-4 mb-1">
              Detalhamento do objeto de execu&ccedil;&atilde;o <span className="text-gov-red">*</span>
            </label>
            <FieldTag type="ia">&diams; gerado com base no objeto do parlamentar</FieldTag>
            <textarea
              value={state.det}
              onChange={(e) => onChange({ det: e.target.value })}
              rows={4}
              className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white leading-relaxed resize-y focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            />
            <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
              <i className="fas fa-exclamation-triangle text-[11px]" /> Verifique ader&ecirc;ncia ao objeto antes de inserir no sistema.
            </div>
            <button
              onClick={() => regenerar("detalhamento")}
              disabled={regenDet}
              className="mt-1.5 bg-gov-blue-pale text-gov-blue border border-blue-200 px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 hover:bg-blue-100 disabled:opacity-50"
            >
              <i className={`fas ${regenDet ? "fa-spinner fa-spin" : "fa-redo"}`} /> Regenerar
            </button>
          </div>

          <div className="h-px bg-n-2 my-4" />

          {/* Barra financeira */}
          <FinancialBar
            allocated={parseFloat(String(state.meta.valor)) || 0}
            total={emenda.valor}
          />

          {/* Meta box */}
          <div className="bg-n-1 border border-n-2 rounded-lg p-4 mt-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-medium text-gov-blue-dark1 flex items-center gap-1.5">
                <i className="fas fa-bullseye text-gov-blue" /> Meta 1
              </div>
              <FieldTag type="ia">&diams; autom&aacute;tico</FieldTag>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-n-4 mb-1">Descri&ccedil;&atilde;o da meta <span className="text-gov-red">*</span></label>
              <textarea
                value={state.meta.desc}
                onChange={(e) => onMetaChange({ desc: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white leading-relaxed resize-y focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              />
              <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                <i className="fas fa-exclamation-triangle text-[11px]" /> Verifique mensurabilidade e compatibilidade com o objeto.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11.5px] font-medium text-n-4 mb-1">Unidade</label>
                <select
                  value={state.meta.unidade}
                  onChange={(e) => onMetaChange({ unidade: e.target.value })}
                  className="w-full px-2 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
                >
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-n-4 mb-1">Quantidade</label>
                <input
                  type="number"
                  value={state.meta.quantidade}
                  onChange={(e) => onMetaChange({ quantidade: e.target.value })}
                  className="w-full px-2 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-n-4 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  value={state.meta.valor}
                  onChange={(e) => onMetaChange({ valor: e.target.value })}
                  className="w-full px-2 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
              <div>
                <label className="block text-[11.5px] font-medium text-n-4 mb-1">Natureza de despesa</label>
                <select
                  value={state.meta.natureza}
                  onChange={(e) => onMetaChange({ natureza: e.target.value })}
                  className="w-full px-2 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
                >
                  {Object.entries(NATUREZAS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-n-4 mb-1">Prazo de execu&ccedil;&atilde;o (meses)</label>
                <input
                  type="number"
                  value={state.meta.prazo}
                  onChange={(e) => onMetaChange({ prazo: e.target.value })}
                  className="w-full px-2 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
                />
                <div className="text-[11px] text-n-4 mt-1">N&atilde;o exceder o prazo total da emenda.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CARD 3: EXECUÇÃO DOS RECURSOS ═══ */}
      <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden">
        <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px] flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
            <i className="fas fa-university text-gov-blue" /> Execu&ccedil;&atilde;o dos Recursos
          </div>
          <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-sm uppercase tracking-wider bg-n-1 text-n-4 border border-n-2">Execu&ccedil;&atilde;o</span>
        </div>
        <div className="p-[18px]">
          <div className="mb-3.5">
            <label className="block text-xs font-medium text-n-4 mb-1">Ente público beneficiário <span className="text-gov-red">*</span></label>
            <input
              type="text"
              value={state.beneficiario}
              onChange={(e) => onChange({ beneficiario: e.target.value })}
              className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-n-4 mb-1">CNPJ do benefici&aacute;rio <span className="text-gov-red">*</span></label>
              <input
                type="text"
                value={state.cnpj}
                onChange={(e) => onChange({ cnpj: formatCNPJ(e.target.value) })}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              />
              {state.hist?.cnpjBeneficiario && state.cnpj === state.hist.cnpjBeneficiario && (
                <FieldTag type="hist">Hist&oacute;rico &mdash; confirme</FieldTag>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-n-4 mb-1">Respons&aacute;vel <span className="text-gov-red">*</span></label>
              <input
                type="text"
                value={state.responsavel}
                onChange={(e) => onChange({ responsavel: e.target.value })}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              />
            </div>
          </div>
          <div className="mt-3.5">
            <label className="block text-xs font-medium text-n-4 mb-1">
              Executor <span className="text-[10.5px] font-normal text-n-4">(se diferente do benefici&aacute;rio)</span>
            </label>
            <input
              type="text"
              value={state.executor}
              onChange={(e) => onChange({ executor: e.target.value })}
              className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            />
            {state.hist?.nomeExecutor && state.executor === state.hist.nomeExecutor && (
              <FieldTag type="hist">Hist&oacute;rico &mdash; confirme</FieldTag>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
            <div>
              <label className="block text-xs font-medium text-n-4 mb-1">Banco <span className="text-gov-red">*</span></label>
              <select
                value={state.banco}
                onChange={(e) => {
                  const banco = e.target.value;
                  const ags = AGENCIAS[banco] || [];
                  onChange({ banco, agencia: ags[0]?.val || "" });
                }}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              >
                <option value="">Selecione...</option>
                <option value="CEF">Caixa Econ&ocirc;mica Federal</option>
                <option value="BB">Banco do Brasil</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-n-4 mb-1">Ag&ecirc;ncia <span className="text-gov-red">*</span></label>
              <select
                value={state.agencia}
                onChange={(e) => onChange({ agencia: e.target.value })}
                className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              >
                {agOptions.length === 0 ? (
                  <option value="">Selecione o banco primeiro</option>
                ) : (
                  agOptions.map((a) => <option key={a.val} value={a.val}>{a.lbl}</option>)
                )}
              </select>
            </div>
          </div>
          <div className="mt-3.5">
            <label className="block text-xs font-medium text-n-4 mb-1">Conta bancária exclusiva para esta emenda</label>
            <select
              value={state.contaExist}
              onChange={(e) => onChange({ contaExist: e.target.value })}
              className="w-full px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            >
              <option value="nao">N&atilde;o &mdash; abrir conta exclusiva para esta emenda</option>
              <option value="sim">Sim &mdash; utilizar conta j&aacute; existente do benefici&aacute;rio</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══ CARD 4: CONTROLE SOCIAL ═══ */}
      <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden">
        <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px]">
          <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
            <i className="fas fa-users text-gov-blue" /> Controle Social e Notifica&ccedil;&otilde;es
          </div>
        </div>
        <div className="p-[18px]">
          <p className="text-xs text-n-4 mb-3">O Transferegov notificar&aacute; automaticamente os e-mails abaixo ao enviar o plano de trabalho.</p>

          {[
            { label: "Assembleia Legislativa do ES \u2014 fixo", email: "presidencia@al.es.gov.br" },
            { label: "Tribunal de Contas do ES \u2014 fixo", email: "presidencia@tce.es.gov.br" },
            { label: "Transpar\u00eancia Capixaba \u2014 fixo", email: "transparencia@sefaz.es.gov.br" },
          ].map((f) => (
            <div key={f.email} className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50/60 border border-amber-200 rounded mb-2">
              <i className="fas fa-lock text-amber-600 text-sm mt-0.5 shrink-0" />
              <div className="text-[12.5px] text-n-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">{f.label}</div>
                {f.email}
              </div>
            </div>
          ))}

          <div className="mt-3">
            <label className="block text-xs font-medium text-n-4 mb-1">
              Conselho setorial da &aacute;rea final&iacute;stica <span className="text-[10.5px] font-normal text-n-4">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                id="f-conselho"
                placeholder="Ex: cmas@municipio.es.gov.br"
                className="flex-1 px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
              />
              <button
                onClick={() => {
                  const el = document.getElementById("f-conselho") as HTMLInputElement;
                  const v = el?.value.trim();
                  if (!v) return;
                  onChange({ conselhos: [...state.conselhos, v] });
                  el.value = "";
                }}
                className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-3 py-[5px] rounded text-xs font-medium flex items-center gap-1 hover:bg-gov-blue-pale shrink-0"
              >
                <i className="fas fa-plus" /> Adicionar
              </button>
            </div>
            {state.conselhos.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {state.conselhos.map((c, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 bg-n-1 border border-n-3 rounded-sm px-2 py-0.5 text-xs">
                    {c}
                    <button
                      onClick={() => onChange({ conselhos: state.conselhos.filter((_, j) => j !== i) })}
                      className="bg-none border-none text-n-4 text-[13px] p-0 cursor-pointer leading-none hover:text-gov-red"
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] text-n-4 mt-1">Conselho setorial da &aacute;rea (sa&uacute;de, educa&ccedil;&atilde;o, assist&ecirc;ncia social, etc.)</div>
          </div>
        </div>
      </div>

      {/* ═══ CARD 5: DOCUMENTOS ═══ */}
      <div className="bg-white border border-n-2 rounded-lg mb-4 shadow-sm overflow-hidden">
        <div className="bg-n-1 border-b border-n-2 px-[18px] py-[11px]">
          <div className="text-xs font-bold text-gov-blue-dark1 flex items-center gap-[7px] uppercase tracking-wider">
            <i className="fas fa-paperclip text-gov-blue" /> Documentos a anexar
          </div>
        </div>
        <div className="p-[18px]">
          <div className="flex gap-2">
            <input
              type="text"
              id="f-doc"
              placeholder="Ex: Projeto executivo, ART, or\u00e7amento, laudos t\u00e9cnicos..."
              className="flex-1 px-2.5 py-2 border border-n-3 rounded text-[13px] bg-white focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            />
            <button
              onClick={() => {
                const el = document.getElementById("f-doc") as HTMLInputElement;
                const v = el?.value.trim();
                if (!v) return;
                onChange({ docs: [...state.docs, v] });
                el.value = "";
              }}
              className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-3 py-[5px] rounded text-xs font-medium flex items-center gap-1 hover:bg-gov-blue-pale shrink-0"
            >
              <i className="fas fa-plus" /> Adicionar
            </button>
          </div>
          {state.docs.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {state.docs.map((d, i) => (
                <div key={i} className="inline-flex items-center gap-1.5 bg-n-1 border border-n-3 rounded-sm px-2 py-0.5 text-xs">
                  {d}
                  <button
                    onClick={() => onChange({ docs: state.docs.filter((_, j) => j !== i) })}
                    className="bg-none border-none text-n-4 text-[13px] p-0 cursor-pointer leading-none hover:text-gov-red"
                  >&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex justify-between items-center mt-5 flex-wrap gap-2.5">
        <button onClick={onBack} className="bg-transparent text-gov-blue border-[1.5px] border-gov-blue px-4 py-2 rounded text-[13px] font-medium flex items-center gap-[7px] hover:bg-gov-blue-pale">
          <i className="fas fa-arrow-left" /> Trocar emenda
        </button>
        <button onClick={onExport} className="bg-gov-blue text-white border-none px-5 py-[9px] rounded text-[13px] font-bold flex items-center gap-[7px] hover:bg-gov-blue-dark1">
          Exportar plano <i className="fas fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}
