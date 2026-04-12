"use client";

import { useState, useEffect, useCallback } from "react";
import { PlanoState, Ente, Emenda, MetaData } from "./types";
import { EMENDAS } from "./data/emendas";
import { FINALIDADES } from "./data/finalidades";
import { STORAGE_KEY } from "./utils";

const INITIAL_STATE: PlanoState = {
  view: "sel",
  ente: null,
  emenda: null,
  hist: null,
  finalidade: "",
  area: "",
  acao: "",
  det: "",
  meta: {
    desc: "",
    unidade: "Unidade",
    quantidade: "",
    valor: "",
    natureza: "44905200",
    prazo: "",
  },
  beneficiario: "",
  cnpj: "",
  responsavel: "",
  executor: "",
  banco: "",
  agencia: "",
  contaExist: "nao",
  conselhos: [],
  docs: [],
};

export function usePlano() {
  const [state, setState] = useState<PlanoState>(INITIAL_STATE);
  const [showRestore, setShowRestore] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.emenda) setShowRestore(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage on state changes (skip initial)
  const save = useCallback((s: PlanoState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* ignore */ }
  }, []);

  const update = useCallback(
    (partial: Partial<PlanoState>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        save(next);
        return next;
      });
    },
    [save]
  );

  const updateMeta = useCallback(
    (partial: Partial<MetaData>) => {
      setState((prev) => {
        const next = { ...prev, meta: { ...prev.meta, ...partial } };
        save(next);
        return next;
      });
    },
    [save]
  );

  // Restore from localStorage
  const restaurar = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PlanoState;
      if (!parsed?.emenda) return;
      setState(parsed);
      setShowRestore(false);
    } catch { /* ignore */ }
  }, []);

  // New plan
  const novoPlano = useCallback(() => {
    if (!confirm("Iniciar novo plano? O rascunho ser\u00e1 descartado.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setState(INITIAL_STATE);
    setShowRestore(false);
  }, []);

  // Select ente and fetch historico
  const selectEnte = useCallback(
    async (ente: Ente) => {
      update({ ente });
      try {
        const res = await fetch(
          `/api/historico?ibge=${ente.ibge}&cnpj=${encodeURIComponent(ente.cnpj)}&nome=${encodeURIComponent(ente.nome)}`
        );
        const data = await res.json();
        if (data.planos?.[0]) {
          update({ ente, hist: data.planos[0] });
        }
      } catch { /* ignore */ }
    },
    [update]
  );

  // Select emenda
  const selectEmenda = useCallback(
    (emenda: Emenda) => {
      update({ emenda });
    },
    [update]
  );

  // Generate plan via AI
  const gerarPlano = useCallback(async () => {
    const emenda = state.emenda;
    if (!emenda) return;

    update({ view: "gen" });

    const exemplosMesmoOrgao = EMENDAS.filter(
      (x) => x.orgao === emenda.orgao && x.id !== emenda.id
    )
      .slice(0, 2)
      .map((x) => `- "${x.objeto}" \u2192 finalidade aprovada: ${x.fin}`)
      .join("\n");

    const finOpts = (FINALIDADES[emenda.area] || []).join(", ");

    try {
      const res = await fetch("/api/gerar-plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emenda, exemplosMesmoOrgao, finOpts }),
      });
      const data = await res.json();

      const updates: Partial<PlanoState> = {
        view: "plano",
        finalidade: data.finalidade || emenda.fin,
        area: data.area || emenda.area,
        det: data.detalhamento || "",
        meta: {
          desc: data.meta_desc || "",
          unidade: data.meta_unidade || "Unidade",
          quantidade: data.meta_quantidade || 1,
          valor: emenda.valor,
          natureza: data.meta_natureza || emenda.nat,
          prazo: emenda.prazo,
        },
      };

      // Apply ente info
      if (state.ente) {
        updates.beneficiario = state.ente.nome;
        updates.cnpj = state.ente.cnpj;
      }

      // Apply historico if available
      const hist = state.hist;
      if (hist) {
        if (hist.cnpjBeneficiario) updates.cnpj = hist.cnpjBeneficiario;
        if (hist.nomeExecutor) updates.executor = hist.nomeExecutor;
        if (hist.banco) updates.banco = hist.banco;
        if (hist.agencia) updates.agencia = hist.agencia;
        if (hist.emailConselho) updates.conselhos = [hist.emailConselho];
      }

      update(updates);
    } catch {
      // Fallback
      update({
        view: "plano",
        finalidade: emenda.fin,
        area: emenda.area,
        det: `${emenda.objeto} O presente plano visa detalhar a execu\u00e7\u00e3o da emenda parlamentar no munic\u00edpio de ${emenda.municipio}/ES, em conformidade com a LC 210/2024 e a Portaria Conjunta n\u00ba 15/2025.`,
        meta: {
          desc: emenda.objeto,
          unidade: "Unidade",
          quantidade: 1,
          valor: emenda.valor,
          natureza: emenda.nat,
          prazo: emenda.prazo,
        },
        beneficiario: state.ente?.nome || "",
        cnpj: state.ente?.cnpj || "",
      });
    }
  }, [state.emenda, state.ente, state.hist, update]);

  // Navigation
  const goToExport = useCallback(() => update({ view: "exportar" }), [update]);
  const goToPlano = useCallback(() => update({ view: "plano" }), [update]);
  const goToSelection = useCallback(() => update({ view: "sel" }), [update]);

  // Derived
  const currentStep = state.view === "sel" || state.view === "gen" ? 1 : state.view === "plano" ? 2 : 3;
  const canGoToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return currentStep >= 2;
    if (step === 3) return currentStep >= 3;
    return false;
  };

  return {
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
    save: () => save(state),
  };
}
