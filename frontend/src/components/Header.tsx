import { Link, useLocation } from "react-router-dom";
import { ChefHat, ClipboardList, Settings as SettingsIcon, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "PDV", icon: ShoppingCart, testId: "nav-pdv" },
  { to: "/orders", label: "Pedidos", icon: ClipboardList, testId: "nav-orders" },
  { to: "/products", label: "Produtos", icon: UtensilsCrossed, testId: "nav-products" },
  { to: "/settings", label: "Configurações", icon: SettingsIcon, testId: "nav-settings" },
];

export default function Header({ shopName }: { shopName?: string }) {
  const { pathname } = useLocation();
  return (
    <header
      className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md"
      data-testid="app-header"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5" data-testid="brand-link">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ChefHat className="size-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span
              className="font-heading text-[15px] font-semibold tracking-tight text-slate-900"
              data-testid="shop-name"
            >
              {shopName || "Lanchonete"}
            </span>
            <span className="text-[11px] tracking-[0.12em] text-slate-500 uppercase">
              Comandas &amp; Impressão
            </span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon, testId }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                data-testid={testId}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
