import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { formatBRL } from "@/lib/receipt";
import type { Product, ProductPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY: ProductPayload = {
  name: "",
  category: "",
  price: 0,
  description: "",
  image_url: "",
  active: true,
};

const parsePrice = (raw: string) => Number(raw.replace(/\./g, "").replace(",", ".")) || 0;

export default function Products() {
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => apiGet<Product[]>("/products?include_inactive=true"),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<string[]>("/categories"),
  });

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductPayload>(EMPTY);
  const [priceText, setPriceText] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return Array.from(map.entries());
  }, [products]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, category: categories[0] ?? "" });
    setPriceText("");
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      image_url: product.image_url,
      active: product.active,
    });
    setPriceText(product.price.toFixed(2).replace(".", ","));
    setOpen(true);
  };

  const saveProduct = useMutation({
    mutationFn: () => {
      const payload: ProductPayload = { ...form, price: parsePrice(priceText) };
      return editing
        ? apiPut<Product>(`/products/${editing.id}`, payload)
        : apiPost<Product>("/products", payload);
    },
    onSuccess: () => {
      refresh();
      setOpen(false);
      toast.success(editing ? "Produto atualizado." : "Produto cadastrado.");
    },
    onError: () => toast.error("Não foi possível salvar o produto."),
  });

  const toggleActive = useMutation({
    mutationFn: (product: Product) =>
      apiPatch<Product>(`/products/${product.id}/active`, { active: !product.active }),
    onSuccess: (product) => {
      refresh();
      toast.success(
        product.active
          ? `${product.name} está disponível no PDV.`
          : `${product.name} foi desativado e saiu do PDV.`,
      );
    },
    onError: () => toast.error("Não foi possível alterar a disponibilidade."),
  });

  const addCategory = useMutation({
    mutationFn: () => apiPost<string[]>("/categories", { name: newCategory }),
    onSuccess: () => {
      refresh();
      setNewCategory("");
      toast.success("Categoria criada.");
    },
    onError: () => toast.error("Não foi possível criar a categoria."),
  });

  const renameCategory = useMutation({
    mutationFn: (payload: { from: string; to: string }) =>
      apiPatch<string[]>(`/categories/${encodeURIComponent(payload.from)}`, {
        name: payload.to,
      }),
    onSuccess: () => {
      refresh();
      setRenaming(null);
      toast.success("Categoria renomeada nos produtos.");
    },
    onError: () => toast.error("Não foi possível renomear a categoria."),
  });

  const removeCategory = useMutation({
    mutationFn: (name: string) => apiDelete<string[]>(`/categories/${encodeURIComponent(name)}`),
    onSuccess: () => {
      refresh();
      toast.success("Categoria removida.");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError && typeof (error.body as { detail?: string })?.detail === "string"
          ? String((error.body as { detail?: string }).detail)
          : "Não foi possível remover a categoria.",
      ),
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header shopName={settings.name} />
      <main className="no-print mx-auto w-full max-w-[1400px] px-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="font-heading text-[30px] leading-tight font-semibold tracking-tight text-slate-900"
              data-testid="page-title"
            >
              Produtos do menu
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre itens, ajuste preços e desative o que estiver em falta — pedidos antigos
              não são afetados.
            </p>
          </div>
          <Button onClick={openCreate} data-testid="btn-new-product">
            <Plus className="size-4" /> Novo produto
          </Button>
        </div>

        {/* -------- Categorias -------- */}
        <section
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          data-testid="categories-panel"
        >
          <h2 className="font-heading flex items-center gap-2 text-base font-semibold text-slate-900">
            <Tag className="size-4" /> Categorias
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pr-1.5 pl-3 text-[13px] text-slate-700"
                data-testid={`category-chip-${c}`}
              >
                {c}
                <button
                  onClick={() => setRenaming({ from: c, to: c })}
                  aria-label={`Renomear ${c}`}
                  className="rounded p-1 text-slate-400 transition-colors duration-150 hover:text-slate-900"
                  data-testid={`btn-rename-category-${c}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => removeCategory.mutate(c)}
                  aria-label={`Remover ${c}`}
                  className="rounded p-1 text-slate-400 transition-colors duration-150 hover:text-red-600"
                  data-testid={`btn-delete-category-${c}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            ))}
            {categories.length === 0 ? (
              <span className="text-sm text-slate-500">Nenhuma categoria ainda.</span>
            ) : null}
          </div>
          <form
            className="mt-4 flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newCategory.trim()) addCategory.mutate();
            }}
          >
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nova categoria (ex.: Açaí)"
              data-testid="input-new-category"
            />
            <Button type="submit" variant="secondary" data-testid="btn-add-category">
              Adicionar
            </Button>
          </form>
        </section>

        {/* -------- Produtos -------- */}
        {products.length === 0 ? (
          <p
            className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"
            data-testid="products-manage-empty"
          >
            {productsQuery.isLoading
              ? "Carregando produtos..."
              : productsQuery.isError
                ? "Cadastro indisponível no momento."
                : "Nenhum produto cadastrado ainda."}
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {grouped.map(([category, items]) => (
              <section
                key={category}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                data-testid={`product-group-${category}`}
              >
                <h2 className="font-heading border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-900">
                  {category}{" "}
                  <span className="text-sm font-normal text-slate-400">({items.length})</span>
                </h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-32">Preço</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-56 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((product) => (
                      <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                        <TableCell>
                          <span className="block font-medium text-slate-900">{product.name}</span>
                          <span className="block text-xs text-slate-500">
                            {product.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell
                          className="font-mono"
                          data-testid={`product-price-${product.id}`}
                        >
                          {formatBRL(product.price)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border",
                              product.active
                                ? "border-green-200 bg-green-100 text-green-800"
                                : "border-slate-200 bg-slate-100 text-slate-500",
                            )}
                            data-testid={`product-status-${product.id}`}
                          >
                            {product.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(product)}
                              data-testid={`btn-edit-product-${product.id}`}
                            >
                              <Pencil className="size-3.5" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant={product.active ? "ghost" : "secondary"}
                              onClick={() => toggleActive.mutate(product)}
                              data-testid={`btn-toggle-product-${product.id}`}
                            >
                              {product.active ? (
                                <>
                                  <EyeOff className="size-3.5" /> Desativar
                                </>
                              ) : (
                                <>
                                  <Eye className="size-3.5" /> Ativar
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* -------- Criar / editar produto -------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {editing ? "Editar produto" : "Novo produto"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveProduct.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-name">Nome</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                data-testid="input-product-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-category">Categoria</Label>
                <Input
                  id="product-category"
                  list="category-options"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  data-testid="input-product-category"
                />
                <datalist id="category-options">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-price">Preço (R$)</Label>
                <Input
                  id="product-price"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  data-testid="input-product-price"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea
                id="product-description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                data-testid="input-product-description"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-image">URL da imagem (opcional)</Label>
              <Input
                id="product-image"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
                data-testid="input-product-image"
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <Checkbox
                checked={form.active}
                onCheckedChange={(c) => setForm((f) => ({ ...f, active: c === true }))}
                data-testid="checkbox-product-active"
              />
              Disponível no PDV
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                data-testid="btn-cancel-product"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveProduct.isPending} data-testid="btn-save-product">
                {saveProduct.isPending ? "Salvando..." : "Salvar produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------- Renomear categoria -------- */}
      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="rename-category-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Renomear categoria</DialogTitle>
          </DialogHeader>
          <Input
            value={renaming?.to ?? ""}
            onChange={(e) =>
              setRenaming((r) => (r ? { ...r, to: e.target.value } : r))
            }
            data-testid="input-rename-category"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => renaming && renameCategory.mutate(renaming)}
              disabled={!renaming?.to.trim() || renameCategory.isPending}
              data-testid="btn-confirm-rename-category"
            >
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
