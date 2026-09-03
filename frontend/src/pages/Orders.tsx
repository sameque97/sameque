import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import PrintLayer, { usePrintQueue } from "@/components/PrintLayer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { customerReceiptLines, formatBRL, orderNumber } from "@/lib/receipt";
import type { Order, OrderStatus } from "@/lib/types";
import { STATUS_BADGE, STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ value: "todos" | OrderStatus; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_preparo", label: "Em preparo" },
  { value: "pronto", label: "Prontos" },
  { value: "finalizado", label: "Finalizados" },
];

export default function Orders() {
  const { settings } = useSettings();
  const { docs, print } = usePrintQueue();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"todos" | OrderStatus>("todos");

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/orders"),
  });

  const registerPrint = useMutation({
    mutationFn: (id: string) => apiPost<Order>(`/orders/${id}/print`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const orders = (ordersQuery.data ?? []).filter(
    (o) => filter === "todos" || o.status === filter,
  );

  const quickPrint = (order: Order) => {
    print([
      {
        format: settings.default_paper,
        lines: customerReceiptLines(
          order,
          settings,
          settings.default_paper,
          order.print_count > 0,
        ),
      },
    ]);
    registerPrint.mutate(order.id);
    toast.success(`Comanda Nº ${orderNumber(order.number)} reimpressa.`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header shopName={settings.name} />
      <PrintLayer docs={docs} />

      <main className="no-print mx-auto w-full max-w-[1600px] px-5 py-6">
        <h1
          className="font-heading text-[30px] leading-tight font-semibold tracking-tight text-slate-900"
          data-testid="page-title"
        >
          Histórico de pedidos
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Reimprima qualquer comanda com um clique ou abra os detalhes para escolher cliente,
          cozinha e 2ª via.
        </p>

        <div className="mt-5 flex flex-wrap gap-2" data-testid="status-filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              data-testid={`filter-status-${f.value}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
                filter === f.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <p
            className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"
            data-testid="orders-empty"
          >
            {ordersQuery.isLoading
              ? "Carregando pedidos..."
              : ordersQuery.isError
                ? "Histórico indisponível no momento."
                : "Nenhum pedido neste filtro."}
          </p>
        ) : (
          <div
            className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            data-testid="orders-grid"
          >
            {orders.map((order) => (
              <article
                key={order.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-slate-400 hover:shadow-md"
                data-testid={`order-card-${order.number}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-lg font-semibold text-slate-900">
                      Nº {orderNumber(order.number)}
                    </span>
                    <span className="text-sm text-slate-600">{order.customer}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <Badge
                    className={cn("border", STATUS_BADGE[order.status])}
                    data-testid={`order-status-${order.number}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </div>

                <ul className="flex flex-col gap-0.5 text-[13px] text-slate-600">
                  {order.items.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">
                      {item.qty}x {item.name}
                    </li>
                  ))}
                  {order.items.length > 3 ? (
                    <li className="text-slate-400">+{order.items.length - 3} item(ns)</li>
                  ) : null}
                </ul>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-mono text-base font-semibold text-slate-900">
                    {formatBRL(order.total)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickPrint(order)}
                      data-testid={`btn-quick-print-${order.number}`}
                    >
                      <Printer className="size-4" /> Imprimir
                    </Button>
                    <Link
                      to={`/orders/${order.id}`}
                      className={buttonVariants({ variant: "default", size: "sm" })}
                      data-testid={`btn-order-details-${order.number}`}
                    >
                      Detalhes
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
