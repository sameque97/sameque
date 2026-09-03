import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiPut } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import type { PaperFormat, Settings } from "@/lib/types";
import { PAPER_LABELS } from "@/lib/types";

const FORMATS: PaperFormat[] = ["58mm", "80mm", "a4"];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const [form, setForm] = useState<Settings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => apiPut<Settings>("/settings", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Dados da lanchonete salvos.");
    },
    onError: () => toast.error("Não foi possível salvar as configurações."),
  });

  const field = (key: keyof Settings, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header shopName={settings.name} />
      <main className="no-print mx-auto w-full max-w-2xl px-5 py-6">
        <h1
          className="font-heading text-[30px] leading-tight font-semibold tracking-tight text-slate-900"
          data-testid="page-title"
        >
          Configurações
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Estes dados aparecem no cabeçalho de todas as comandas impressas.
        </p>

        <form
          className="mt-6 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="shop-name">Nome da lanchonete</Label>
            <Input
              id="shop-name"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              data-testid="input-shop-name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shop-address">Endereço</Label>
            <Input
              id="shop-address"
              value={form.address}
              onChange={(e) => field("address", e.target.value)}
              placeholder="Rua, número - bairro"
              data-testid="input-shop-address"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shop-phone">Telefone</Label>
            <Input
              id="shop-phone"
              value={form.phone}
              onChange={(e) => field("phone", e.target.value)}
              placeholder="(11) 90000-0000"
              data-testid="input-shop-phone"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shop-footer">Mensagem de rodapé</Label>
            <Input
              id="shop-footer"
              value={form.footer_message}
              onChange={(e) => field("footer_message", e.target.value)}
              data-testid="input-shop-footer"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="default-paper">Impressora padrão</Label>
            <Select
              value={form.default_paper}
              onValueChange={(v) => setForm((f) => ({ ...f, default_paper: v as PaperFormat }))}
            >
              <SelectTrigger id="default-paper" data-testid="select-default-paper">
                <SelectValue>{(v) => PAPER_LABELS[v as PaperFormat]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f} data-testid={`default-paper-option-${f}`}>
                    {PAPER_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={save.isPending} data-testid="btn-save-settings">
            {save.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      </main>
    </div>
  );
}
