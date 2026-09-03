from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from models.pos import Order, OrderCreate, OrderStatusUpdate, normalize_order

router = APIRouter(tags=["orders"])


async def _next_number() -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": "order_number"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True,
    )
    return int(doc["value"]) if doc else 1


@router.post("/orders", response_model=Order, status_code=201)
async def create_order(payload: OrderCreate):
    subtotal = round(sum(i.unit_price * i.qty for i in payload.items), 2)
    discount = round(max(payload.discount, 0.0), 2)
    if discount > subtotal:
        raise HTTPException(status_code=400, detail="desconto maior que o subtotal")
    order = Order(
        number=await _next_number(),
        customer=payload.customer.strip() or "Consumidor",
        items=payload.items,
        subtotal=subtotal,
        discount=discount,
        total=round(subtotal - discount, 2),
        payment_method=payload.payment_method,
        order_notes=[n for n in payload.order_notes if n.strip()],
    )
    await db.orders.insert_one(order.model_dump())
    return order


@router.get("/orders", response_model=List[Order])
async def list_orders(status: Optional[str] = Query(default=None)):
    query = {"status": status} if status else {}
    docs = await db.orders.find(query).sort("number", -1).to_list(300)
    return [normalize_order(d) for d in docs]


@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="pedido não encontrado")
    return normalize_order(doc)


@router.patch("/orders/{order_id}/status", response_model=Order)
async def update_status(order_id: str, payload: OrderStatusUpdate):
    doc = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": {"status": payload.status}},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="pedido não encontrado")
    return normalize_order(doc)


@router.post("/orders/{order_id}/print", response_model=Order)
async def register_print(order_id: str):
    """Registra uma via impressa — a partir da 2ª, a comanda sai marcada como 2ª via."""
    doc = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$inc": {"print_count": 1}},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="pedido não encontrado")
    return normalize_order(doc)
