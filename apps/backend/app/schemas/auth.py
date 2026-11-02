import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, StringConstraints


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _check_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Пароль должен содержать не менее 8 символов")
    if len(value) > 128:
        raise ValueError("Пароль слишком длинный (максимум 128 символов)")
    if not re.search(r"[^\W\d_]", value):
        raise ValueError("Пароль должен содержать хотя бы одну букву")
    if not re.search(r"\d", value):
        raise ValueError("Пароль должен содержать хотя бы одну цифру")
    return value


NormalizedEmail = Annotated[EmailStr, AfterValidator(_normalize_email)]
NewPassword = Annotated[str, AfterValidator(_check_password)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class RegisterRequest(BaseModel):
    email: NormalizedEmail
    name: Name
    password: NewPassword


class LoginRequest(BaseModel):
    email: NormalizedEmail
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    email_verified: bool = True


class PasswordResetRequest(BaseModel):
    email: NormalizedEmail


class PasswordResetConfirm(BaseModel):
    token: Annotated[str, StringConstraints(min_length=10, max_length=200)]
    password: NewPassword


class EmailVerifyRequest(BaseModel):
    token: Annotated[str, StringConstraints(min_length=10, max_length=200)]


class MessageResponse(BaseModel):
    detail: str