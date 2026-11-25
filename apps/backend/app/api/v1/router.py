from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    imports,
    professions,
    share,
    skills,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(professions.router)
api_router.include_router(skills.router)
api_router.include_router(imports.router)
api_router.include_router(admin.router)
api_router.include_router(share.me_router)
api_router.include_router(share.export_router)
api_router.include_router(share.public_router)
