import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Printer, Search, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import PrintLayer, { usePrintQueue } from "@/components/PrintLayer";
import type { PrintDoc } from "@/components/PrintLayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { customerReceiptLines, formatBRL, kitchenReceiptLines, orderNumber } from "@/lib/receipt";
import type { Order, OrderCreate, PaperFormat, PaymentMethod, Product } from "@/lib/types";
import { PAPER_LABELS, PAYMENT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CartLine {
  product: Product;
  qty: number;
  notes: string;
}

const PAYMENTS: PaymentMethod[] = ["dinheiro", "pix", "debito", "credito"];
const FORMATS: PaperFormat[] = ["58mm", "80mm", "a4"];

const splitNotes = (raw: string) =>
  raw
    .split(/[;\n]/)
    .map((n) => n.trim())
    .filter(Boolean);

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { docs, print } = usePrintQueue();

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiGet<Product[]>("/products"),
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("dinheiro");
  const [orderNotes, setOrderNotes] = useState("");
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [printFormat, setPrintFormat] = useState<PaperFormat>(settings.default_paper);

  const products = productsQuery.data ?? [];
  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );
  const visible = products.filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const subtotal = cart.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const discountValue = Math.min(Math.max(Number(discount.replace(",", ".")) || 0, 0), subtotal);
  const total = subtotal - discountValue;

  const addToCart = (product: Product) =>
    setCart((prev) => {
      const found = prev.find((l) => l.product.id === product.id);
      if (found)
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { product, qty: 1, notes: "" }];
    });

  const changeQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );

  const setNotes = (id: string, notes: string) =>
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, notes } : l)));

  const resetCart = () => {
    setCart([]);
    setCustomer("");
    setDiscount("");
    setOrderNotes("");
    setPayment("dinheiro");
  };

  const confirmOrder = useMutation({
    mutationFn: () => {
      const payload: OrderCreate = {
        customer: customer.trim() || "Consumidor",
        discount: discountValue,
        payment_method: payment,
        order_notes: splitNotes(orderNotes),
        items: cart.map((l) => ({
          product_id: l.product.id,
          name: l.product.name,
          unit_price: l.product.price,
          qty: l.qty,
          notes: splitNotes(l.notes),
        })),
      };
      return apiPost<Order>("/orders", payload);
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setPrintFormat(settings.default_paper);
      setConfirmed(order);
    },
    onError: () => toast.error("Não foi possível confirmar o pedido."),
  });

  const registerPrint = useMutation({
    mutationFn: (id: string) => apiPost<Order>(`/orders/${id}/print`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const sendToKitchen = useMutation({
    mutationFn: (id: string) => apiPatch<Order>(`/orders/${id}/status`, { status: "em_preparo" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const buildDocs = (order: Order, kinds: Array<"customer" | "kitchen">): PrintDoc[] =>
    kinds.map((kind) => ({
      format: printFormat,
      lines:
        kind === "customer"
          ? customerReceiptLines(order, settings, printFormat)
          : kitchenReceiptLines(order, settings, printFormat),
    }));

  const handlePrintOnly = () => {
    if (!confirmed) return;
    print(buildDocs(confirmed, ["customer"]));
    registerPrint.mutate(confirmed.id);
    toast.success(`Comanda Nº ${orderNumber(confirmed.number)} enviada para impressão.`);
  };

  const handlePrintAndFinish = () => {
    if (!confirmed) return;
    print(buildDocs(confirmed, ["customer", "kitchen"]));
    registerPrint.mutate(confirmed.id);
    sendToKitchen.mutate(confirmed.id);
    toast.success("Comandas impressas e pedido enviado para preparo.");
    setConfirmed(null);
    resetCart();
  };

  const handleNoPrint = () => {
    toast.message("Pedido salvo no histórico sem impressão.");
    setConfirmed(null);
    resetCart();
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header shopName={settings.name} />
      <PrintLayer docs={docs} />

      <main className="no-print mx-auto grid w-full max-w-[1600px] grid-cols-12 gap-6 px-5 py-6">
        {/* ---------------- Catálogo ---------------- */}
        <section className="col-span-12 flex flex-col gap-5 lg:col-span-7 xl:col-span-8">
          <div className="flex flex-col gap-1">
            <h1
              className="font-heading text-[30px] leading-tight font-semibold tracking-tight text-slate-900"
              data-testid="page-title"
            >
              Novo pedido
            </h1>
            <p className="text-sm text-slate-500">
              Selecione os produtos, confirme e imprima a comanda em um clique.
            </p>
          </div>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="bg-white pl-9"
              data-testid="input-search-product"
            />
          </div>

          <div className="flex flex-wrap gap-2" data-testid="category-filters">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                data-testid={`filter-category-${c.toLowerCase()}`}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
                  category === c
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {productsQuery.isError ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Catálogo indisponível no momento.
            </p>
          ) : visible.length === 0 ? (
            <p
              className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
              data-testid="products-empty"
            >
              {productsQuery.isLoading ? "Carregando produtos..." : "Nenhum produto encontrado."}
            </p>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="product-grid"
            >
              {visible.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  data-testid={`product-card-${p.id}`}
                  className="group flex overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-150 hover:border-slate-400 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                    <span className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">
                      {p.category}
                    </span>
                    <span className="font-heading truncate text-[15px] font-semibold text-slate-900">
                      {p.name}
                    </span>
                    <span className="line-clamp-2 text-xs text-slate-500">{p.description}</span>
                    <span className="mt-1.5 font-mono text-[15px] font-semibold text-slate-900">
                      {formatBRL(p.price)}
                    </span>
                  </div>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-24 shrink-0 object-cover"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---------------- Carrinho ---------------- */}
        <aside className="col-span-12 lg:col-span-5 xl:col-span-4">
          <div
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-22"
            data-testid="cart-panel"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900">
                Comanda em aberto
              </h2>
              <Badge variant="secondary" data-testid="cart-count">
                {cart.reduce((s, l) => s + l.qty, 0)} itens
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="customer" className="text-xs text-slate-500">
                Cliente / mesa
              </Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Ex.: João ou Mesa 4"
                data-testid="input-customer"
              />
            </div>

            {cart.length === 0 ? (
              <p
                className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500"
                data-testid="cart-empty"
              >
                Toque nos produtos para montar a comanda.
              </p>
            ) : (
              <ul className="flex max-h-[38vh] flex-col gap-3 overflow-y-auto pr-1">
                {cart.map((line) => (
                  <li
                    key={line.product.id}
                    className="rounded-lg border border-slate-200 p-3"
                    data-testid={`cart-line-${line.product.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-1 text-sm font-medium text-slate-900">
                        {line.product.name}
                      </span>
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {formatBRL(line.product.price * line.qty)}
                      </span>
                      <button
                        onClick={() => changeQty(line.product.id, -line.qty)}
                        className="text-slate-400 transition-colors duration-150 hover:text-red-600"
                        aria-label="Remover item"
                        data-testid={`btn-remove-${line.product.id}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() => changeQty(line.product.id, -1)}
                        data-testid={`btn-qty-minus-${line.product.id}`}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span
                        className="w-7 text-center font-mono text-sm"
                        data-testid={`qty-${line.product.id}`}
                      >
                        {line.qty}
                      </span>
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() => changeQty(line.product.id, 1)}
                        data-testid={`btn-qty-plus-${line.product.id}`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Input
                        value={line.notes}
                        onChange={(e) => setNotes(line.product.id, e.target.value)}
                        placeholder="Adicionais / obs: sem cebola; com bacon"
                        className="h-8 flex-1 text-xs"
                        data-testid={`input-item-notes-${line.product.id}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="order-notes" className="text-xs text-slate-500">
                Observações do pedido
              </Label>
              <Textarea
                id="order-notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Uma observação por linha"
                rows={2}
                data-testid="input-order-notes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="discount" className="text-xs text-slate-500">
                  Desconto (R$)
                </Label>
                <Input
                  id="discount"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  data-testid="input-discount"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="payment" className="text-xs text-slate-500">
                  Pagamento
                </Label>
                <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                  <SelectTrigger id="payment" data-testid="select-payment">
                    <SelectValue>{(v) => PAYMENT_LABELS[v as PaymentMethod]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENTS.map((p) => (
                      <SelectItem key={p} value={p} data-testid={`payment-option-${p}`}>
                        {PAYMENT_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 font-mono text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span data-testid="cart-subtotal">{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Desconto</span>
                <span data-testid="cart-discount">{formatBRL(discountValue)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-sans text-xs tracking-[0.12em] text-slate-500 uppercase">
                  Total
                </span>
                <span className="text-2xl font-semibold text-slate-900" data-testid="cart-total">
                  {formatBRL(total)}
                </span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              disabled={cart.length === 0 || confirmOrder.isPending}
              onClick={() => confirmOrder.mutate()}
              data-testid="btn-confirm-order"
            >
              {confirmOrder.isPending ? "Confirmando..." : "Confirmar pedido"}
            </Button>
          </div>
        </aside>
      </main>

      {/* ---------------- Pós-confirmação: opções de impressão ---------------- */}
      <Dialog open={confirmed !== null} onOpenChange={(open) => !open && handleNoPrint()}>
        <DialogContent className="no-print sm:max-w-lg" data-testid="print-options-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Pedido confirmado!</DialogTitle>
            <DialogDescription>
              {confirmed
                ? `Comanda Nº ${orderNumber(confirmed.number)} • ${confirmed.customer} • ${formatBRL(confirmed.total)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dialog-format" className="text-xs text-slate-500">
              Formato de impressão
            </Label>
            <Select value={printFormat} onValueChange={(v) => setPrintFormat(v as PaperFormat)}>
              <SelectTrigger id="dialog-format" data-testid="select-dialog-paper">
                <SelectValue>{(v) => PAPER_LABELS[v as PaperFormat]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f} data-testid={`dialog-paper-option-${f}`}>
                    {PAPER_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button onClick={handlePrintOnly} data-testid="btn-print-order">
              <Printer className="size-4" /> Imprimir comanda
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrintAndFinish}
              data-testid="btn-print-and-finalize"
            >
              <Zap className="size-4" /> Imprimir e finalizar
            </Button>
            <Button variant="ghost" onClick={handleNoPrint} data-testid="btn-no-print">
              <X className="size-4" /> Não imprimir
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!confirmed) return;
                const id = confirmed.id;
                setConfirmed(null);
                resetCart();
                navigate(`/orders/${id}`);
              }}
              data-testid="btn-open-order-details"
            >
              Ver detalhes e mais opções de impressão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
