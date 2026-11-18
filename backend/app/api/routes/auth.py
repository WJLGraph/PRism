"""认证路由：单管理员登录 + HMAC 签名 token 校验。

v1 设计说明：
- 账号来自 .env（PRISM_ADMIN_USERNAME / PRISM_ADMIN_PASSWORD），默认 admin / prism2026
- token 为 HMAC-SHA256 签名的 JSON payload（base64url），复用 token_encryption_key 作为签名密钥
- 不引入新依赖（stdlib hmac/hashlib/base64），后续可平滑升级为多用户 + JWT + 数据库存储
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()

TOKEN_TTL_SECONDS = 7 * 24 * 3600


class LoginRequest(BaseModel):
    username: str
    password: str


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64decode(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _sign(payload: bytes) -> str:
    key = settings.token_encryption_key.encode()
    return _b64encode(hmac.new(key, payload, hashlib.sha256).digest())


def issue_token(username: str) -> str:
    payload = json.dumps(
        {"sub": username, "iat": int(time.time()), "exp": int(time.time()) + TOKEN_TTL_SECONDS},
        separators=(",", ":"),
    ).encode()
    body = _b64encode(payload)
    return f"{body}.{_sign(payload)}"


def verify_token(token: str) -> str:
    try:
        body, signature = token.split(".", 1)
        payload = _b64decode(body)
    except Exception:
        raise HTTPException(status_code=401, detail="登录状态无效，请重新登录")
    expected = _sign(payload)
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="登录状态无效，请重新登录")
    data = json.loads(payload)
    if int(data.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    return str(data.get("sub", ""))


def _bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="缺少登录凭证")
    return header[7:].strip()


@router.post("/login")
async def login(payload: LoginRequest) -> dict[str, str]:
    if payload.username != settings.admin_username or payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="账号或密码错误")
    return {
        "token": issue_token(payload.username),
        "username": payload.username,
        "token_type": "bearer",
    }


@router.get("/me")
async def me(request: Request) -> dict[str, str]:
    username = verify_token(_bearer(request))
    return {"username": username, "role": "owner"}
