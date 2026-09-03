// Espelho manual dos modelos Pydantic em backend/models/pos.py — manter em sincronia.
export type OrderStatus = "novo" | "em_preparo" | "pronto" | "finalizado" | "cancelado";
export type PaymentMethod = "pix" | "dinheiro" | "debito" | "credito";
export type PaperFormat = "58mm" | "80mm" | "a4";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  active: boolean;
}

export interface ProductPayload {
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  active: boolean;
}

export interface OrderItem {
  product_id: string;
  name: string;
  unit_price: number;
  qty: number;
  notes: string[];
}

export interface Order {
  id: string;
  number: number;
  customer: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  order_notes: string[];
  print_count: number;
  created_at: string;
}

export interface OrderCreate {
  customer: string;
  items: OrderItem[];
  discount: number;
  payment_method: PaymentMethod;
  order_notes: string[];
}

export interface Settings {
  name: string;
  address: string;
  phone: string;
  footer_message: string;
  default_paper: PaperFormat;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  novo: "Novo",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
};

export const PAPER_LABELS: Record<PaperFormat, string> = {
  "58mm": "Térmica 58 mm",
  "80mm": "Térmica 80 mm",
  a4: "Convencional A4",
};

export const STATUS_BADGE: Record<OrderStatus, string> = {
  novo: "bg-slate-100 text-slate-700 border-slate-200",
  em_preparo: "bg-amber-100 text-amber-800 border-amber-200",
  pronto: "bg-green-100 text-green-800 border-green-200",
  finalizado: "bg-slate-100 text-slate-500 border-slate-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};
