import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    DUMMY_HASH,
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
)
from app.models import (
    EmailVerificationToken,
    PasswordResetToken,
    RefreshToken,
    User,
    UserRole,
)
from app.models.base import utcnow
from app.schemas.auth import RegisterRequest

INVALID_CREDENTIALS = "Неверный email или пароль"
INVALID_REFRESH = "Сессия недействительна, войдите снова"
INVALID_RESET = "Ссылка недействительна или устарела"
INVALID_VERIFY = "Ссылка подтверждения недействительна или устарела"


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail)


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    exists = await db.scalar(select(User.id).where(User.email == data.email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже есть")
    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        role=UserRole.STUDENT,
        is_email_verified=False,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Пользователь с таким email уже есть"
        ) from None
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    stored_hash = user.password_hash if user and user.password_hash else DUMMY_HASH
    password_ok = verify_password(stored_hash, password)
    if not user or not user.password_hash or not password_ok or not user.is_active:
        raise _unauthorized(INVALID_CREDENTIALS)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        await db.commit()
    return user


async def issue_tokens(db: AsyncSession, user: User) -> tuple[str, str]:
    """Возвращает (access, сырой refresh) и сохраняет хеш refresh в базе."""
    settings = get_settings()
    raw, token_hash = generate_opaque_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    await db.commit()
    return create_access_token(user.id, user.role.value), raw


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


async def rotate_refresh_token(db: AsyncSession, raw: str) -> tuple[str, str]:
    token = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw))
    )
    if token is None:
        raise _unauthorized(INVALID_REFRESH)
    if token.revoked_at is not None:
        await revoke_all_refresh_tokens(db, token.user_id)
        await db.commit()
        raise _unauthorized(INVALID_REFRESH)
    if _aware(token.expires_at) <= utcnow():
        raise _unauthorized(INVALID_REFRESH)
    user = await db.get(User, token.user_id)
    if user is None or not user.is_active:
        raise _unauthorized(INVALID_REFRESH)
    token.revoked_at = utcnow()
    return await issue_tokens(db, user)


async def revoke_refresh_token(db: AsyncSession, raw: str) -> None:
    token = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw))
    )
    if token is not None and token.revoked_at is None:
        token.revoked_at = utcnow()
        await db.commit()


async def request_password_reset(db: AsyncSession, email: str) -> tuple[User, str] | None:
    user = await db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if user is None:
        return None
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=utcnow())
    )
    raw, token_hash = generate_opaque_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=utcnow() + timedelta(minutes=get_settings().reset_token_minutes),
        )
    )
    await db.commit()
    return user, raw


async def confirm_password_reset(db: AsyncSession, raw: str, new_password: str) -> None:
    token = await db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(raw))
    )
    if token is None or token.used_at is not None or _aware(token.expires_at) <= utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, INVALID_RESET)
    user = await db.get(User, token.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, INVALID_RESET)
    user.password_hash = hash_password(new_password)
    token.used_at = utcnow()
    await revoke_all_refresh_tokens(db, user.id)
    await db.commit()


async def create_email_verification_token(db: AsyncSession, user: User) -> str:
    """Инвалидирует старые токены и возвращает сырой токен для письма."""
    await db.execute(
        update(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used_at.is_(None),
        )
        .values(used_at=utcnow())
    )
    raw, token_hash = generate_opaque_token()
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=utcnow() + timedelta(minutes=get_settings().reset_token_minutes),
        )
    )
    await db.commit()
    return raw


async def verify_email(db: AsyncSession, raw: str) -> User:
    token = await db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == hash_token(raw)
        )
    )
    if token is None or token.used_at is not None or _aware(token.expires_at) <= utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, INVALID_VERIFY)
    user = await db.get(User, token.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, INVALID_VERIFY)
    token.used_at = utcnow()
    user.is_email_verified = True
    await db.commit()
    await db.refresh(user)
    return user


async def resend_verification(db: AsyncSession, user: User) -> str | None:
    """Сырой токен или None, если email уже подтверждён."""
    if user.is_email_verified:
        return None
    return await create_email_verification_token(db, user)