from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.pos import Product, ProductCreate

router = APIRouter(tags=["products"])


@router.get("/products", response_model=List[Product])
async def list_products():
    docs = await db.products.find({"active": True}).to_list(500)
    products = [Product(**d) for d in docs]
    products.sort(key=lambda p: (p.category, p.name))
    return products


@router.post("/products", response_model=Product, status_code=201)
async def create_product(payload: ProductCreate):
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="preço inválido")
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    return product
