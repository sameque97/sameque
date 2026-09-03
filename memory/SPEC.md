# SPEC — Comandas PDV (lanchonete)

PDV web em pt-BR para lanchonete, focado em **impressão de comandas** térmicas
(58 mm / 80 mm) e A4. Sem autenticação — acesso direto.

## Fluxo principal
Novo Pedido → Selecionar Produtos → Confirmar Pedido → modal com **Imprimir
Comanda / Imprimir e Finalizar / Não imprimir** → Enviar para Preparo → Pedido
Pronto → Finalizar.

## Rotas frontend
- `/` — PDV: catálogo (busca + filtro por categoria), carrinho com qtd,
  observações por item, desconto em R$, forma de pagamento, confirmar pedido e
  modal de impressão pós-confirmação.
- `/orders` — histórico com filtros de status, reimpressão rápida (1 clique).
- `/orders/:id` — detalhes + painel de impressão (Cliente / Cozinha, 58mm/80mm/A4,
  2ª via) + ações de status.
- `/settings` — dados da lanchonete (nome, endereço, telefone, rodapé, papel padrão).

## Impressão
`src/lib/receipt.ts` monta a comanda como linhas monoespaçadas de largura fixa
(32 / 44 / 72 colunas). `components/PrintLayer.tsx` renderiza `#printable-receipt`
fora da tela e dispara `window.print()`; `index.css` contém as regras
`@media print` que ocultam toda a interface (`.no-print`, nav/header/aside).
Comanda do cliente tem valores/pagamento/status; comanda da cozinha não tem
informações financeiras.

## API (todas em /api)
- `GET /products`, `POST /products`
- `POST /orders`, `GET /orders?status=`, `GET /orders/{id}`,
  `PATCH /orders/{id}/status`, `POST /orders/{id}/print` (incrementa print_count)
- `GET /settings`, `PUT /settings`

## Modelo de dados (Mongo, ids uuid4 string)
- `products`: id, name, category, price, description, image_url, active
- `orders`: id, number (sequencial via coleção `counters`), customer, items[
  {product_id, name, unit_price, qty, notes[]} ], subtotal, discount, total,
  payment_method (pix|dinheiro|debito|credito), status
  (novo|em_preparo|pronto|finalizado|cancelado), order_notes[], print_count,
  created_at (UTC aware)
- `settings`: doc único `_key: "shop"`

## Seed
`cd /app/backend && python seed.py` — 12 produtos (Lanches, Combos, Porções,
Bebidas, Sobremesas) + lanchonete "Lanchonete Bom Sabor".

## Credenciais
Nenhuma — app sem login.
