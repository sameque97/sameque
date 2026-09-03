import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Settings } from "@/lib/types";

export const FALLBACK_SETTINGS: Settings = {
  name: "Lanchonete",
  address: "",
  phone: "",
  footer_message: "Obrigado pela preferência!",
  default_paper: "80mm",
};

/** Nunca bloqueia a tela: se o backend falhar, devolve o fallback estático. */
export function useSettings() {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings"),
  });
  return { settings: query.data ?? FALLBACK_SETTINGS, query };
}
