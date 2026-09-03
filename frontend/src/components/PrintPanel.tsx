import { useState } from "react";
import { Printer, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReceiptPreview from "@/components/ReceiptPreview";
import type { PrintDoc } from "@/components/PrintLayer";
import { receiptLines } from "@/lib/receipt";
import type { Order, PaperFormat, Settings } from "@/lib/types";
import { PAPER_LABELS } from "@/lib/types";

const FORMATS: PaperFormat[] = ["58mm", "80mm", "a4"];

export default function PrintPanel({
  order,
  settings,
  onPrint,
}: {
  order: Order;
  settings: Settings;
  onPrint: (docs: PrintDoc[]) => void;
}) {
  const [kind, setKind] = useState<"customer" | "kitchen">("customer");
  const [format, setFormat] = useState<PaperFormat>(settings.default_paper);
  const [secondCopy, setSecondCopy] = useState(order.print_count > 0);

  const lines = receiptLines(kind, order, settings, format, secondCopy);

  const doc = (k: "customer" | "kitchen", copy = secondCopy): PrintDoc => ({
    lines: receiptLines(k, order, settings, format, copy),
    format,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <ReceiptPreview lines={lines} format={format} />
      </div>

      <div className="no-print flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label className="text-[11px] tracking-[0.12em] text-slate-500 uppercase">
            Tipo de comanda
          </Label>
          <Tabs
            value={kind}
            onValueChange={(v) => setKind(v as "customer" | "kitchen")}
            data-testid="receipt-kind-tabs"
          >
            <TabsList className="w-full">
              <TabsTrigger value="customer" className="flex-1" data-testid="tab-receipt-customer">
                Cliente
              </TabsTrigger>
              <TabsTrigger value="kitchen" className="flex-1" data-testid="tab-receipt-kitchen">
                Cozinha
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="paper-format"
            className="text-[11px] tracking-[0.12em] text-slate-500 uppercase"
          >
            Largura do papel
          </Label>
          <Select value={format} onValueChange={(v) => setFormat(v as PaperFormat)}>
            <SelectTrigger id="paper-format" data-testid="select-printer-width">
              <SelectValue>{(v) => PAPER_LABELS[v as PaperFormat]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f} value={f} data-testid={`paper-option-${f}`}>
                  {PAPER_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <Checkbox
            checked={secondCopy}
            onCheckedChange={(c) => setSecondCopy(c === true)}
            data-testid="checkbox-second-copy"
          />
          Marcar como 2ª via
        </label>

        <div className="flex flex-col gap-2.5">
          <Button
            className="w-full"
            onClick={() => onPrint([doc(kind)])}
            data-testid="btn-print-receipt"
          >
            <Printer className="size-4" /> Imprimir comanda
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onPrint([doc("customer"), doc("kitchen")])}
            data-testid="btn-print-both"
          >
            Imprimir cliente + cozinha
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onPrint([doc(kind, true)])}
            data-testid="btn-print-duplicate"
          >
            <Copy className="size-4" /> Reimprimir 2ª via
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-slate-500" data-testid="print-count-hint">
          Vias já impressas: {order.print_count}. A impressão usa apenas o layout da comanda —
          menus e botões são ocultados automaticamente.
        </p>
      </div>
    </div>
  );
}
