from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.pos import (
    ActiveUpdate,
    CategoryPayload,
    Product,
    ProductCreate,
    ProductUpdate,
)

router = APIRouter(tags=["products"])


@router.get("/products", response_model=List[Product])
async def list_products(include_inactive: bool = False):
    """PDV consome o padrão (só ativos); a tela de cadastro pede include_inactive=true."""
    query = {} if include_inactive else {"active": True}
    docs = await db.products.find(query).to_list(500)
    products = [Product(**d) for d in docs]
    products.sort(key=lambda p: (p.category, p.name))
    return products


@router.post("/products", response_model=Product, status_code=201)
async def create_product(payload: ProductCreate):
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="preço inválido")
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    await db.categories.update_one(
        {"name": product.category}, {"$set": {"name": product.category}}, upsert=True
    )
    return product


@router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductUpdate):
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="preço inválido")
    doc = await db.products.find_one_and_update(
        {"id": product_id},
        {"$set": payload.model_dump()},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="produto não encontrado")
    await db.categories.update_one(
        {"name": payload.category}, {"$set": {"name": payload.category}}, upsert=True
    )
    return Product(**doc)


@router.patch("/products/{product_id}/active", response_model=Product)
async def set_product_active(product_id: str, payload: ActiveUpdate):
    doc = await db.products.find_one_and_update(
        {"id": product_id},
        {"$set": {"active": payload.active}},
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="produto não encontrado")
    return Product(**doc)


# --------------------------- Categorias ---------------------------


@router.get("/categories", response_model=List[str])
async def list_categories():
    stored = {d["name"] for d in await db.categories.find().to_list(200)}
    used = set(await db.products.distinct("category"))
    return sorted(stored | used)


@router.post("/categories", response_model=List[str], status_code=201)
async def create_category(payload: CategoryPayload):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="nome obrigatório")
    await db.categories.update_one({"name": name}, {"$set": {"name": name}}, upsert=True)
    return await list_categories()


@router.patch("/categories/{name}", response_model=List[str])
async def rename_category(name: str, payload: CategoryPayload):
    new_name = payload.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="nome obrigatório")
    existing = await db.categories.find_one({"name": name})
    used = await db.products.count_documents({"category": name})
    if not existing and used == 0:
        raise HTTPException(status_code=404, detail="categoria não encontrada")
    await db.categories.delete_one({"name": name})
    await db.categories.update_one(
        {"name": new_name}, {"$set": {"name": new_name}}, upsert=True
    )
    await db.products.update_many({"category": name}, {"$set": {"category": new_name}})
    return await list_categories()


@router.delete("/categories/{name}", response_model=List[str])
async def delete_category(name: str):
    used = await db.products.count_documents({"category": name})
    if used:
        raise HTTPException(
            status_code=400, detail=f"categoria em uso por {used} produto(s)"
        )
    result = await db.categories.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="categoria não encontrada")
    return await list_categories()
