from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, professions, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(professions.router)
api_router.include_router(admin.router)
