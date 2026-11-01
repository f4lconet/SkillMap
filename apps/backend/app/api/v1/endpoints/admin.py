from fastapi import APIRouter, Depends

from app.api.deps import require_role
from app.models import UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping", dependencies=[Depends(require_role(UserRole.EDITOR))])
async def ping():
    """Временная ручка для проверки прав редактора. Удалите, когда появится админка."""
    return {"detail": "pong"}
