"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-xs font-medium px-2.5 py-1 rounded border transition-all shrink-0 ${
        copied
          ? "bg-green-50 text-gov-green border-gov-green"
          : "bg-white text-gov-blue border-gov-blue hover:bg-gov-blue-pale"
      } ${className}`}
    >
      {copied ? (
        <>
          <i className="fas fa-check mr-1" /> Copiado!
        </>
      ) : (
        <>
          <i className="fas fa-copy mr-1" /> Copiar
        </>
      )}
    </button>
  );
}
