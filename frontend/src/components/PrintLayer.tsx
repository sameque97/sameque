import { useEffect, useRef, useState } from "react";
import type { PaperFormat } from "@/lib/types";
import { PAPER_SPECS } from "@/lib/receipt";

export interface PrintDoc {
  lines: string[];
  format: PaperFormat;
}

/**
 * Camada de impressão: fica fora da tela e só se torna visível dentro de @media print
 * (regras em index.css). Chamar `print(docs)` dispara window.print() do dispositivo.
 */
export function usePrintQueue() {
  const [docs, setDocs] = useState<PrintDoc[] | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!docs) return;
    timer.current = window.setTimeout(() => {
      window.print();
      setDocs(null);
    }, 150);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [docs]);

  return { docs, print: setDocs };
}

export default function PrintLayer({ docs }: { docs: PrintDoc[] | null }) {
  if (!docs || docs.length === 0) return null;
  return (
    <div id="printable-receipt" data-testid="printable-receipt">
      {docs.map((doc, i) => {
        const spec = PAPER_SPECS[doc.format];
        return (
          <pre
            key={i}
            className="receipt-doc"
            style={{
              width: "max-content",
              fontSize: spec.fontSize,
              lineHeight: spec.lineHeight,
            }}
          >
            {doc.lines.join("\n")}
          </pre>
        );
      })}
    </div>
  );
}
