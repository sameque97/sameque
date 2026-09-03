"""Pydantic v2 models for the lanchonete PDV. Mirrored by frontend/src/lib/types.ts."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Literal

from pydantic import BaseModel, Field

OrderStatus = Literal["novo", "em_preparo", "pronto", "finalizado", "cancelado"]
PaymentMethod = Literal["pix", "dinheiro", "debito", "credito"]
PaperFormat = Literal["58mm", "80mm", "a4"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


class Product(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str
    category: str
    price: float
    description: str = ""
    image_url: str = ""
    active: bool = True


class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    description: str = ""
    image_url: str = ""


class OrderItem(BaseModel):
    product_id: str
    name: str
    unit_price: float
    qty: int = Field(ge=1)
    # Adicionais e modificações pedidas pelo cliente ("sem cebola", "com bacon", ...)
    notes: List[str] = Field(default_factory=list)


class Order(BaseModel):
    id: str = Field(default_factory=_uid)
    number: int
    customer: str
    items: List[OrderItem]
    subtotal: float
    discount: float = 0.0
    total: float
    payment_method: PaymentMethod
    status: OrderStatus = "novo"
    order_notes: List[str] = Field(default_factory=list)
    print_count: int = 0
    created_at: datetime = Field(default_factory=_now)


class OrderCreate(BaseModel):
    customer: str = "Consumidor"
    items: List[OrderItem] = Field(min_length=1)
    discount: float = 0.0
    payment_method: PaymentMethod = "dinheiro"
    order_notes: List[str] = Field(default_factory=list)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class Settings(BaseModel):
    name: str = "Lanchonete XYZ"
    address: str = ""
    phone: str = ""
    footer_message: str = "Obrigado pela preferência!"
    default_paper: PaperFormat = "80mm"


class SettingsUpdate(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    footer_message: str = "Obrigado pela preferência!"
    default_paper: PaperFormat = "80mm"


def normalize_order(doc: dict) -> Order:
    """Motor hands back naive datetimes; re-anchor them to UTC before validating."""
    created = doc.get("created_at")
    if isinstance(created, datetime) and created.tzinfo is None:
        doc = {**doc, "created_at": created.replace(tzinfo=timezone.utc)}
    return Order(**doc)
