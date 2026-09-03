from fastapi import APIRouter

from lib.db import db
from models.pos import Settings, SettingsUpdate

router = APIRouter(tags=["settings"])

_KEY = {"_key": "shop"}


@router.get("/settings", response_model=Settings)
async def get_settings():
    doc = await db.settings.find_one(_KEY)
    if not doc:
        return Settings()
    doc.pop("_id", None)
    doc.pop("_key", None)
    return Settings(**doc)


@router.put("/settings", response_model=Settings)
async def update_settings(payload: SettingsUpdate):
    settings = Settings(**payload.model_dump())
    await db.settings.update_one(_KEY, {"$set": settings.model_dump()}, upsert=True)
    return settings
