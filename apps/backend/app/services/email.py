import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _send(message: EmailMessage) -> None:
    s = get_settings()
    mode = s.smtp_security
    if mode == "auto":
        if s.smtp_port == 465:
            mode = "ssl"
        elif s.smtp_port in (587, 2525):
            mode = "starttls"
        else:
            mode = "none"

    context = ssl.create_default_context()
    if mode == "ssl":
        smtp = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=15, context=context)
    else:
        smtp = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15)
    with smtp:
        if mode == "starttls":
            smtp.starttls(context=context)
        if s.smtp_user and s.smtp_password:
            smtp.login(s.smtp_user, s.smtp_password)
        smtp.send_message(message)


async def send_password_reset_email(to: str, token: str) -> None:
    settings = get_settings()
    link = f"{settings.frontend_url}/reset-password?token={token}"
    message = EmailMessage()
    message["Subject"] = "Восстановление пароля SkillMap"
    message["From"] = settings.mail_from
    message["To"] = to
    message.set_content(
        "Вы запросили восстановление пароля в SkillMap.\n\n"
        f"Перейдите по ссылке, чтобы задать новый пароль:\n{link}\n\n"
        f"Ссылка действует {settings.reset_token_minutes} минут. "
        "Если вы не запрашивали сброс, просто проигнорируйте письмо."
    )
    try:
        await asyncio.to_thread(_send, message)
    except OSError:
        logger.exception("Не удалось отправить письмо для сброса пароля")
        if settings.is_development:
            logger.warning("DEV reset link for %s: %s", to, link)


async def send_verification_email(to: str, token: str) -> None:
    settings = get_settings()
    link = f"{settings.frontend_url}/verify-email?token={token}"
    message = EmailMessage()
    message["Subject"] = "Подтвердите email в SkillMap"
    message["From"] = settings.mail_from
    message["To"] = to
    message.set_content(
        "Добро пожаловать в SkillMap!\n\n"
        f"Подтвердите адрес почты по ссылке:\n{link}\n\n"
        f"Ссылка действует {settings.reset_token_minutes} минут. "
        "Если вы не регистрировались, проигнорируйте это письмо."
    )
    try:
        await asyncio.to_thread(_send, message)
    except OSError:
        logger.exception("Не удалось отправить письмо подтверждения email")
        if settings.is_development:
            logger.warning("DEV verify link for %s: %s", to, link)