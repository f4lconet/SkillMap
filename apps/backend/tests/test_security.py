import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.security import (
    ALGORITHM,
    TokenError,
    create_access_token,
    decode_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("Strong123")
    assert hashed != "Strong123"
    assert verify_password(hashed, "Strong123")
    assert not verify_password(hashed, "wrong")
    assert not verify_password("not-a-hash", "Strong123")


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    payload = decode_access_token(create_access_token(user_id, "student"))
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "student"


def test_expired_token_rejected():
    payload = {
        "sub": str(uuid.uuid4()),
        "type": "access",
        "exp": datetime.now(UTC) - timedelta(minutes=1),
    }
    token = jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_wrong_type_and_garbage_rejected():
    payload = {
        "sub": str(uuid.uuid4()),
        "type": "refresh",
        "exp": datetime.now(UTC) + timedelta(minutes=5),
    }
    token = jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)
    with pytest.raises(TokenError):
        decode_access_token(token)
    with pytest.raises(TokenError):
        decode_access_token("garbage")


def test_opaque_token_hash_matches():
    raw, hashed = generate_opaque_token()
    assert hash_token(raw) == hashed
    assert raw != hashed
