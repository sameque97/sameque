"""Idempotent seed: catálogo de produtos + dados da lanchonete.

Uso: cd /app/backend && python seed.py
"""
import asyncio

from lib.db import db
from models.pos import Product, Settings

PRODUCTS = [
    ("X-Burger", "Lanches", 15.0, "Pão, hambúrguer 120g, queijo e salada",
     "https://images.unsplash.com/photo-1667329829058-ac191ba4a905?crop=entropy&cs=srgb&fm=jpg&w=600&q=80"),
    ("X-Bacon Duplo", "Lanches", 26.5, "Duas carnes, cheddar e bacon crocante",
     "https://images.unsplash.com/photo-1618538701087-fb7e0312de34?crop=entropy&cs=srgb&fm=jpg&w=600&q=80"),
    ("X-Salada", "Lanches", 18.0, "Hambúrguer, queijo, alface e tomate", ""),
    ("Combo Artesanal", "Combos", 39.9, "Dois lanches artesanais + fritas",
     "https://images.unsplash.com/photo-1610970878459-a0e464d7592b?crop=entropy&cs=srgb&fm=jpg&w=600&q=80"),
    ("Combo Kids", "Combos", 24.0, "Lanche simples, batata pequena e suco", ""),
    ("Batata Frita", "Porções", 12.0, "Porção individual crocante", ""),
    ("Batata com Cheddar", "Porções", 19.0, "Batata frita com cheddar e bacon", ""),
    ("Refrigerante Lata", "Bebidas", 7.0, "Coca-Cola, Guaraná ou Fanta 350ml", ""),
    ("Suco Natural 500ml", "Bebidas", 9.5, "Laranja, limão ou maracujá", ""),
    ("Água Mineral", "Bebidas", 4.0, "Com ou sem gás 500ml", ""),
    ("Milkshake 400ml", "Sobremesas", 16.0, "Chocolate, morango ou baunilha", ""),
    ("Pudim Caseiro", "Sobremesas", 8.5, "Fatia de pudim de leite condensado", ""),
]


async def main() -> None:
    for name, category, price, description, image_url in PRODUCTS:
        exists = await db.products.find_one({"name": name})
        if exists:
            continue
        product = Product(
            name=name,
            category=category,
            price=price,
            description=description,
            image_url=image_url,
        )
        await db.products.insert_one(product.model_dump())

    if not await db.settings.find_one({"_key": "shop"}):
        settings = Settings(
            name="Lanchonete Bom Sabor",
            address="Rua das Palmeiras, 245 - Centro",
            phone="(11) 98765-4321",
        )
        await db.settings.update_one(
            {"_key": "shop"}, {"$set": settings.model_dump()}, upsert=True
        )

    print("seed ok:", await db.products.count_documents({}), "produtos")


if __name__ == "__main__":
    asyncio.run(main())
