import type { PaperFormat } from "@/lib/types";
import { PAPER_SPECS } from "@/lib/receipt";

/** Pré-visualização em tela do papel térmico (mesmo conteúdo enviado à impressora). */
export default function ReceiptPreview({
  lines,
  format,
  testId = "receipt-preview",
}: {
  lines: string[];
  format: PaperFormat;
  testId?: string;
}) {
  const spec = PAPER_SPECS[format];
  return (
    <div className="flex overflow-x-auto rounded-xl bg-slate-900/90 p-5">
      <pre
        data-testid={testId}
        className="receipt-paper animate-in fade-in zoom-in-95 mx-auto duration-200"
        style={{ width: "max-content", fontSize: spec.fontSize, lineHeight: spec.lineHeight }}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}
