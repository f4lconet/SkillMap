from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, HTTPException, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.schemas.auth import (
    EmailVerifyRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services import auth as auth_service
from app.services.email import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"
RESET_REQUESTED = "Если такой email зарегистрирован, мы отправили ссылку для восстановления"


def _set_refresh_cookie(response: Response, raw: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        max_age=settings.refresh_token_days * 24 * 3600,
        httponly=True,
        secure=not settings.is_development,
        samesite="lax",
        path=COOKIE_PATH,
    )


def _token_response(access: str, email_verified: bool = True) -> TokenResponse:
    return TokenResponse(
        access_token=access,
        expires_in=get_settings().access_token_minutes * 60,
        email_verified=email_verified,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    response: Response,
    db: DbSession,
    background_tasks: BackgroundTasks,
):
    user = await auth_service.register_user(db, data)
    raw_verify = await auth_service.create_email_verification_token(db, user)
    background_tasks.add_task(send_verification_email, user.email, raw_verify)
    access, refresh = await auth_service.issue_tokens(db, user)
    _set_refresh_cookie(response, refresh)
    return _token_response(access, email_verified=False)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, response: Response, db: DbSession):
    user = await auth_service.authenticate(db, data.email, data.password)
    access, refresh = await auth_service.issue_tokens(db, user)
    _set_refresh_cookie(response, refresh)
    return _token_response(access, email_verified=user.is_email_verified)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie()] = None,
):
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, auth_service.INVALID_REFRESH)
    access, new_refresh = await auth_service.rotate_refresh_token(db, refresh_token)
    _set_refresh_cookie(response, new_refresh)
    # email_verified при refresh не критичен; фронт смотрит /me
    return _token_response(access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie()] = None,
):
    if refresh_token:
        await auth_service.revoke_refresh_token(db, refresh_token)
    response.delete_cookie(REFRESH_COOKIE, path=COOKIE_PATH)


@router.post("/password-reset/request", response_model=MessageResponse)
async def password_reset_request(
    data: PasswordResetRequest, background_tasks: BackgroundTasks, db: DbSession
):
    result = await auth_service.request_password_reset(db, data.email)
    if result is not None:
        user, raw = result
        background_tasks.add_task(send_password_reset_email, user.email, raw)
    return MessageResponse(detail=RESET_REQUESTED)


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def password_reset_confirm(data: PasswordResetConfirm, db: DbSession):
    await auth_service.confirm_password_reset(db, data.token, data.password)
    return MessageResponse(detail="Пароль изменён, войдите с новым паролем")


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: EmailVerifyRequest, db: DbSession):
    await auth_service.verify_email(db, data.token)
    return MessageResponse(detail="Email подтверждён")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
):
    raw = await auth_service.resend_verification(db, user)
    if raw is None:
        return MessageResponse(detail="Email уже подтверждён")
    background_tasks.add_task(send_verification_email, user.email, raw)
    return MessageResponse(detail="Письмо отправлено повторно")