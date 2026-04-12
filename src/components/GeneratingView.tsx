"use client";

import { useEffect, useState } from "react";

const messages = [
  ["Analisando objeto da emenda...", "Consultando refer\u00eancias aprovadas pelo \u00f3rg\u00e3o setorial"],
  ["Identificando finalidade e \u00e1rea tem\u00e1tica...", "Cruzando com lista oficial de finalidades 2026"],
  ["Gerando detalhamento e meta...", "Calibrando com padr\u00f5es aprovados pelo TCU"],
];

export default function GeneratingView() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setMsgIdx((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-medium text-gov-blue-dark2 tracking-tight mb-1">
          Gerando plano...
        </h2>
        <div className="h-0.5 bg-gov-blue w-9 rounded mb-3" />
      </div>

      <div className="bg-white border border-n-2 rounded-lg p-14 text-center shadow-sm">
        <div className="w-11 h-11 border-[3px] border-n-2 border-t-gov-blue rounded-full animate-spin mx-auto mb-[18px]" />
        <div className="text-[15px] font-medium text-gov-blue-dark2 mb-1.5">
          {messages[msgIdx][0]}
        </div>
        <div className="text-[13px] text-n-4">
          {messages[msgIdx][1]}
        </div>
      </div>
    </div>
  );
}
