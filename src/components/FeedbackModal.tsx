"use client";

import { useState } from "react";

interface FeedbackModalProps {
  ente: string;
  emenda: string;
  onClose: () => void;
}

const labels = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];

export default function FeedbackModal({ ente, emenda, onClose }: FeedbackModalProps) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    if (!nota) {
      alert("Selecione uma nota antes de enviar.");
      return;
    }
    setEnviando(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nota,
          comentario,
          ente,
          emenda,
          ts: new Date().toISOString(),
        }),
      });
      alert(`Obrigado pela avalia\u00e7\u00e3o (${nota}/5)!`);
      onClose();
    } catch {
      alert("Erro ao enviar feedback.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gov-blue-dark2/50 flex items-center justify-center z-[200] backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg p-[26px] w-[400px] shadow-lg">
        <h3 className="text-base font-medium text-gov-blue-dark2 mb-1.5">
          Avalie o TransfereGov Assistente
        </h3>
        <p className="text-[13px] text-n-4 mb-4 leading-relaxed">
          Sua avalia\u00e7\u00e3o ajuda a melhorar a ferramenta para todos os gestores do ES.
        </p>

        <div className="flex gap-1.5 mb-[7px]">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setNota(n)}
              className={`text-[28px] leading-none bg-none border-none cursor-pointer transition-colors ${
                n <= nota ? "text-gov-yellow" : "text-n-3"
              }`}
            >
              &#9733;
            </button>
          ))}
        </div>
        <div className="text-xs text-n-4 mb-3 min-h-[18px] font-medium">
          {labels[nota] || "Clique para avaliar"}
        </div>

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="O que funcionou bem? O que poderia melhorar?"
          rows={3}
          className="w-full px-3 py-2 text-[13px] border border-n-3 rounded font-sans leading-relaxed resize-vertical focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
        />

        <div className="flex gap-2 justify-end mt-3">
          <button
            onClick={onClose}
            className="bg-transparent text-gov-blue border border-gov-blue px-3 py-[5px] rounded text-xs font-medium hover:bg-gov-blue-pale"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={enviando}
            className="bg-gov-blue text-white border-none px-3 py-[5px] rounded text-xs font-medium flex items-center gap-1.5 hover:bg-gov-blue-dark1 disabled:opacity-50"
          >
            <i className="fas fa-paper-plane" />
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
