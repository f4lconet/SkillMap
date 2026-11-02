from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import UserRead, UserUpdate
from app.services import users as users_service

router = APIRouter(prefix="/me", tags=["profile"])


@router.get("", response_model=UserRead)
async def read_me(user: CurrentUser):
    return user


@router.patch("", response_model=UserRead)
async def update_me(data: UserUpdate, user: CurrentUser, db: DbSession):
    return await users_service.update_profile(db, user, data)
