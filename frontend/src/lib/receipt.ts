import type { Order, PaperFormat, Settings } from "@/lib/types";
import { PAYMENT_LABELS, STATUS_LABELS } from "@/lib/types";

export type ReceiptKind = "customer" | "kitchen";

export interface PaperSpec {
  chars: number;
  /** Corpo em mm calculado para `chars` colunas caberem no papel (avanço ~0.62em com letter-spacing). */
  fontSize: string;
  lineHeight: string;
}

export const PAPER_SPECS: Record<PaperFormat, PaperSpec> = {
  "58mm": { chars: 32, fontSize: "2.6mm", lineHeight: "1.3" },
  "80mm": { chars: 44, fontSize: "2.45mm", lineHeight: "1.35" },
  a4: { chars: 72, fontSize: "3.8mm", lineHeight: "1.45" },
};

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const orderNumber = (n: number) => String(n).padStart(5, "0");

const center = (text: string, chars: number) => {
  const clean = text.slice(0, chars);
  const pad = Math.max(0, Math.floor((chars - clean.length) / 2));
  return " ".repeat(pad) + clean;
};

/** "2x X-Burger ........ R$ 30,00" — resultado tem exatamente `chars` colunas. */
const leader = (left: string, right: string, chars: number, filler = ".") => {
  const available = chars - right.length - 2;
  const l = left.length > available ? left.slice(0, Math.max(0, available)) : left;
  const dots = Math.max(1, chars - l.length - right.length - 2);
  return `${l} ${filler.repeat(dots)} ${right}`.slice(0, chars);
};

const rule = (chars: number, char = "-") => char.repeat(chars);

/** Quebra um texto longo em várias linhas respeitando a largura do papel. */
const wrap = (text: string, chars: number, indent = ""): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = indent;
  for (const word of words) {
    if (current.trim() && current.length + word.length + 1 > chars) {
      lines.push(current);
      current = indent + word;
    } else {
      current = current.trim() ? `${current} ${word}` : indent + word;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
};

const dateParts = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
};

export function customerReceiptLines(
  order: Order,
  settings: Settings,
  format: PaperFormat,
  secondCopy = false,
): string[] {
  const { chars } = PAPER_SPECS[format];
  const { date, time } = dateParts(order.created_at);
  const out: string[] = [];

  out.push(center(settings.name.toUpperCase(), chars));
  if (settings.address) out.push(...wrap(settings.address, chars).map((l) => center(l, chars)));
  if (settings.phone) out.push(center(`Tel: ${settings.phone}`, chars));
  out.push(rule(chars, "="));
  out.push(center(`COMANDA Nº ${orderNumber(order.number)}`, chars));
  if (secondCopy) out.push(center("*** 2ª VIA ***", chars));
  out.push(rule(chars, "="));
  out.push(`Data: ${date}`);
  out.push(`Hora: ${time}`);
  out.push(`Cliente: ${order.customer}`);
  out.push(rule(chars));
  out.push(center("ITENS DO PEDIDO", chars));
  out.push("");

  for (const item of order.items) {
    out.push(leader(`${item.qty}x ${item.name}`, formatBRL(item.unit_price * item.qty), chars));
    for (const note of item.notes) out.push(...wrap(`- ${note}`, chars, "   "));
  }

  out.push("");
  if (order.order_notes.length) {
    out.push(rule(chars));
    out.push("Observações:");
    for (const note of order.order_notes) out.push(...wrap(`- ${note}`, chars, " "));
    out.push("");
  }

  out.push(rule(chars));
  out.push(leader("Subtotal:", formatBRL(order.subtotal), chars));
  out.push(leader("Desconto:", formatBRL(order.discount), chars));
  out.push(leader("TOTAL:", formatBRL(order.total), chars));
  out.push(rule(chars, "="));
  out.push(`Pagamento: ${PAYMENT_LABELS[order.payment_method]}`);
  out.push("");
  out.push(`STATUS: ${STATUS_LABELS[order.status].toUpperCase()}`);
  out.push(rule(chars));
  out.push(center(settings.footer_message, chars));
  return out;
}

export function kitchenReceiptLines(
  order: Order,
  settings: Settings,
  format: PaperFormat,
  secondCopy = false,
): string[] {
  const { chars } = PAPER_SPECS[format];
  const { time } = dateParts(order.created_at);
  const out: string[] = [];

  out.push(center(settings.name.toUpperCase(), chars));
  out.push(rule(chars, "="));
  out.push(center(`PEDIDO Nº ${orderNumber(order.number)}`, chars));
  if (secondCopy) out.push(center("*** 2ª VIA ***", chars));
  out.push(rule(chars, "="));
  out.push(`Cliente: ${order.customer}`);
  out.push(`Horário: ${time}`);
  out.push(rule(chars));
  out.push("");

  for (const item of order.items) {
    out.push(`${item.qty}x ${item.name.toUpperCase()}`);
    for (const note of item.notes) out.push(...wrap(`>> ${note}`, chars, "   "));
    out.push("");
  }

  if (order.order_notes.length) {
    out.push(rule(chars));
    out.push("OBSERVAÇÕES GERAIS:");
    for (const note of order.order_notes) out.push(...wrap(`>> ${note}`, chars, " "));
    out.push("");
  }

  out.push(rule(chars, "="));
  out.push(center("-- VIA DA COZINHA --", chars));
  return out;
}

export function receiptLines(
  kind: ReceiptKind,
  order: Order,
  settings: Settings,
  format: PaperFormat,
  secondCopy = false,
): string[] {
  return kind === "kitchen"
    ? kitchenReceiptLines(order, settings, format, secondCopy)
    : customerReceiptLines(order, settings, format, secondCopy);
}
