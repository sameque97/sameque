import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChefHat, CheckCircle2, Flame, XCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import PrintLayer, { usePrintQueue } from "@/components/PrintLayer";
import type { PrintDoc } from "@/components/PrintLayer";
import PrintPanel from "@/components/PrintPanel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { formatBRL, orderNumber } from "@/lib/receipt";
import type { Order, OrderStatus } from "@/lib/types";
import { PAYMENT_LABELS, STATUS_BADGE, STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const NEXT_ACTIONS: Array<{ status: OrderStatus; label: string; icon: typeof Flame }> = [
  { status: "em_preparo", label: "Enviar para preparo", icon: Flame },
  { status: "pronto", label: "Pedido pronto", icon: ChefHat },
  { status: "finalizado", label: "Finalizar", icon: CheckCircle2 },
  { status: "cancelado", label: "Cancelar", icon: XCircle },
];

export default function OrderDetails() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { docs, print } = usePrintQueue();

  const orderQuery = useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiGet<Order>(`/orders/${id}`),
    enabled: Boolean(id),
  });

  const registerPrint = useMutation({
    mutationFn: () => apiPost<Order>(`/orders/${id}/print`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: OrderStatus) => apiPatch<Order>(`/orders/${id}/status`, { status }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Status atualizado: ${STATUS_LABELS[order.status]}`);
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  const order = orderQuery.data;

  const handlePrint = (printDocs: PrintDoc[]) => {
    print(printDocs);
    registerPrint.mutate();
    toast.success("Comanda enviada para a impressora.");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header shopName={settings.name} />
      <PrintLayer docs={docs} />

      <main className="mx-auto w-full max-w-[1400px] px-5 py-6">
        <Link
          to="/orders"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "no-print -ml-2")}
          data-testid="btn-back-to-orders"
        >
          <ArrowLeft className="size-4" /> Voltar para pedidos
        </Link>

        {!order ? (
          <p
            className="no-print mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"
            data-testid="order-unavailable"
          >
            {orderQuery.isLoading ? "Carregando pedido..." : "Pedido não encontrado."}
          </p>
        ) : (
          <>
            <div className="no-print mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1
                  className="font-heading text-[30px] leading-tight font-semibold tracking-tight text-slate-900"
                  data-testid="order-title"
                >
                  Comanda Nº {orderNumber(order.number)}
                </h1>
                <p className="mt-1 text-sm text-slate-500" data-testid="order-meta">
                  {order.customer} •{" "}
                  {new Date(order.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • {PAYMENT_LABELS[order.payment_method]}
                </p>
              </div>
              <Badge
                className={cn("border", STATUS_BADGE[order.status])}
                data-testid="order-status-badge"
              >
                {STATUS_LABELS[order.status]}
              </Badge>
            </div>

            <div className="no-print mt-5 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <section className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-heading text-base font-semibold text-slate-900">Itens</h2>
                  <ul className="mt-3 flex flex-col gap-2.5" data-testid="order-items">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-800">
                            {item.qty}x {item.name}
                          </span>
                          <span className="font-mono text-slate-900">
                            {formatBRL(item.unit_price * item.qty)}
                          </span>
                        </div>
                        {item.notes.map((note, n) => (
                          <span key={n} className="block pl-4 text-xs text-amber-700">
                            • {note}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>

                  {order.order_notes.length > 0 ? (
                    <div className="mt-4 rounded-lg bg-amber-50 p-3" data-testid="order-notes">
                      <span className="text-[11px] tracking-[0.12em] text-amber-800 uppercase">
                        Observações
                      </span>
                      {order.order_notes.map((note, i) => (
                        <span key={i} className="mt-1 block text-xs text-amber-900">
                          • {note}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-3 font-mono text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatBRL(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Desconto</span>
                      <span>{formatBRL(order.discount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-slate-900">
                      <span>Total</span>
                      <span data-testid="order-total">{formatBRL(order.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-heading text-base font-semibold text-slate-900">
                    Fluxo do pedido
                  </h2>
                  <div className="mt-3 flex flex-col gap-2">
                    {NEXT_ACTIONS.map(({ status, label, icon: Icon }) => (
                      <Button
                        key={status}
                        variant={status === "cancelado" ? "outline" : "secondary"}
                        disabled={order.status === status || changeStatus.isPending}
                        onClick={() => changeStatus.mutate(status)}
                        data-testid={`btn-status-${status}`}
                      >
                        <Icon className="size-4" /> {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-heading text-base font-semibold text-slate-900">
                  🖨️ Imprimir comanda
                </h2>
                <p className="mt-1 mb-4 text-xs text-slate-500">
                  Escolha a via, a largura do papel e imprima. A tela do pedido continua aqui após
                  a impressão.
                </p>
                <PrintPanel order={order} settings={settings} onPrint={handlePrint} />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
