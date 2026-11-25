"""Импорт навыков из GitHub и Stepik (Should, неделя 5).

Флоу намеренно двухшаговый: сначала `preview` показывает подсказки с
доказательствами, затем `apply` записывает только те навыки, которые
пользователь отметил. Так импорт не может незаметно переписать прогресс.
"""

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.schemas.importer import (
    GitHubImportRequest,
    ImportApplyRequest,
    ImportApplyResponse,
    ImportPreview,
    StepikImportRequest,
)
from app.services import importers as importers_service

router = APIRouter(prefix="/me/import", tags=["import"])


@router.post(
    "/github/preview",
    response_model=ImportPreview,
    summary="Подсказки навыков по публичному профилю GitHub (без записи)",
)
async def preview_github(
    payload: GitHubImportRequest,
    db: DbSession,
    user: CurrentUser,
) -> ImportPreview:
    signals = await importers_service.fetch_github_signals(payload.login)
    return await importers_service.preview_import(
        db,
        user,
        source="github",
        account=payload.login,
        signals=signals,
        profession_id=payload.profession_id,
    )


@router.post(
    "/stepik/preview",
    response_model=ImportPreview,
    summary="Подсказки навыков по пройденным курсам Stepik (без записи)",
)
async def preview_stepik(
    payload: StepikImportRequest,
    db: DbSession,
    user: CurrentUser,
) -> ImportPreview:
    signals = await importers_service.fetch_stepik_signals(payload.course_ids)
    return await importers_service.preview_import(
        db,
        user,
        source="stepik",
        account=", ".join(str(course_id) for course_id in payload.course_ids),
        signals=signals,
        profession_id=payload.profession_id,
    )


@router.post(
    "/apply",
    response_model=ImportApplyResponse,
    summary="Отметить выбранные навыки как освоенные",
)
async def apply(
    payload: ImportApplyRequest,
    db: DbSession,
    user: CurrentUser,
) -> ImportApplyResponse:
    if not payload.skill_ids:
        raise HTTPException(422, "Не выбрано ни одного навыка")
    return await importers_service.apply_import(db, user, payload)
