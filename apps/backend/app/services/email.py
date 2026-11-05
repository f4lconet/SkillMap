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
    timeout = 30
    if mode == "ssl":
        smtp = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=timeout, context=context)
    else:
        smtp = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=timeout)
    with smtp:
        if mode == "starttls":
            smtp.starttls(context=context)
        if s.smtp_user and s.smtp_password:
            smtp.login(s.smtp_user, s.smtp_password)
        smtp.send_message(message)



def _render_email_html(
    *,
    title: str,
    body_html: str,
    button_text: str | None = None,
    button_url: str | None = None,
    footer: str = "",
) -> str:
    s = get_settings()

    button = ""
    if button_text and button_url:
        button = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
          <tr>
            <td align="center" bgcolor="#4f46e5" style="border-radius:8px;">
              <a href="{button_url}"
                 style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;
                        font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;
                        border-radius:8px;">
                {button_text}
              </a>
            </td>
          </tr>
        </table>"""

    brand = (
        '<span style="font-size:20px;font-weight:700;color:#4f46e5;'
        'font-family:Arial,Helvetica,sans-serif;">SkillMap</span>'
    )

    footer_html = footer or "Это автоматическое письмо, отвечать на него не нужно."

    return f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#f4f5f7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#ffffff;border-radius:12px;
                      overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #eef0f3;">
              {brand}
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">
                {title}
              </h1>
              <div style="font-size:15px;line-height:1.6;color:#374151;">
                {body_html}
              </div>
              {button}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafbfc;font-size:12px;
                       line-height:1.5;color:#6b7280;">
              {footer_html}
            </td>
          </tr>
        </table>
        <div style="max-width:560px;margin:16px auto 0;font-size:11px;color:#9ca3af;
                    font-family:Arial,Helvetica,sans-serif;text-align:center;">
          © SkillMap · {s.frontend_url}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_password_reset_email(to: str, token: str) -> None:
    settings = get_settings()
    link = f"{settings.frontend_url}/reset-password?token={token}"

    message = EmailMessage()
    message["Subject"] = "Восстановление пароля SkillMap"
    message["From"] = settings.mail_from
    message["To"] = to

    plain = (
        "Вы запросили восстановление пароля в SkillMap.\n\n"
        f"Перейдите по ссылке, чтобы задать новый пароль:\n{link}\n\n"
        f"Ссылка действует {settings.reset_token_minutes} минут. "
        "Если вы не запрашивали сброс, просто проигнорируйте письмо."
    )
    html = _render_email_html(
        title="Восстановление пароля",
        body_html=(
            '<p style="margin:0 0 16px;">Вы запросили восстановление пароля в SkillMap.</p>'
            '<p style="margin:0 0 8px;">Нажмите кнопку ниже, чтобы задать новый пароль:</p>'
        ),
        button_text="Задать новый пароль",
        button_url=link,
        footer=(
            f"Ссылка действует {settings.reset_token_minutes} минут. "
            "Если вы не запрашивали сброс, просто проигнорируйте письмо."
        ),
    )

    message.set_content(plain)
    message.add_alternative(html, subtype="html")

    try:
        await asyncio.to_thread(_send, message)
    except (OSError, smtplib.SMTPException):
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

    plain = (
        "Добро пожаловать в SkillMap!\n\n"
        f"Подтвердите адрес почты по ссылке:\n{link}\n\n"
        f"Ссылка действует {settings.reset_token_minutes} минут. "
        "Если вы не регистрировались, проигнорируйте это письмо."
    )
    html = _render_email_html(
        title="Подтвердите email",
        body_html=(
            '<p style="margin:0 0 16px;">Добро пожаловать в SkillMap!</p>'
            '<p style="margin:0 0 8px;">Подтвердите адрес почты, чтобы завершить регистрацию:</p>'
        ),
        button_text="Подтвердить email",
        button_url=link,
        footer=(
            f"Ссылка действует {settings.reset_token_minutes} минут. "
            "Если вы не регистрировались, проигнорируйте это письмо."
        ),
    )

    message.set_content(plain)
    message.add_alternative(html, subtype="html")

    try:
        await asyncio.to_thread(_send, message)
    except (OSError, smtplib.SMTPException):
        logger.exception("Не удалось отправить письмо подтверждения email")
        if settings.is_development:
            logger.warning("DEV verify link for %s: %s", to, link)