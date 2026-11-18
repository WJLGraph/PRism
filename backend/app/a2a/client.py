"""A2A 客户端：发现远端 Agent Card、发起 message/send | message/stream。

直接使用 JSON-RPC 2.0 over HTTP，不依赖 a2a-sdk 的客户端层，便于锁定协议行为。
"""

import json
import uuid
from typing import Any, AsyncIterator

import httpx

from app.core.config import settings

JSONRPC_VERSION = "2.0"
REQUEST_TIMEOUT_SECONDS = 90.0


class A2AClientError(RuntimeError):
    """远端 A2A Agent 调用失败。"""


def trusted_agent_endpoints() -> list[str]:
    raw = settings.a2a_trusted_agents or ""
    endpoints = []
    for item in raw.split(","):
        endpoint = item.strip().rstrip("/")
        if endpoint and endpoint not in endpoints:
            endpoints.append(endpoint)
    return endpoints


async def discover_agent_card(endpoint: str, client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    url = f"{endpoint.rstrip('/')}/.well-known/agent-card.json"
    try:
        if client is not None:
            response = await client.get(url)
        else:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as own:
                response = await own.get(url)
    except httpx.HTTPError as exc:
        raise A2AClientError(f"无法访问 {url}: {exc}") from exc
    if response.status_code != 200:
        raise A2AClientError(f"{url} 返回 {response.status_code}")
    try:
        return response.json()
    except ValueError as exc:
        raise A2AClientError(f"{url} 返回的不是合法 JSON") from exc


async def discover_all_agents() -> list[dict[str, Any]]:
    """并发发现所有受信端点的 Agent Card，失败项以 error 字段返回。"""
    endpoints = trusted_agent_endpoints()
    if not endpoints:
        return []

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        async def _safe(endpoint: str) -> dict[str, Any]:
            try:
                return {"endpoint": endpoint, **await discover_agent_card(endpoint, client)}
            except A2AClientError as exc:
                return {"endpoint": endpoint, "error": str(exc)}

        import asyncio

        return list(await asyncio.gather(*(_safe(endpoint) for endpoint in endpoints)))


def _rpc_request(method: str, params: dict[str, Any]) -> dict[str, Any]:
    return {
        "jsonrpc": JSONRPC_VERSION,
        "id": uuid.uuid4().hex,
        "method": method,
        "params": params,
    }


def _message_params(text: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    message: dict[str, Any] = {
        "role": "user",
        "parts": [{"kind": "text", "text": text}],
        "messageId": uuid.uuid4().hex,
        "kind": "message",
    }
    if metadata:
        message["metadata"] = metadata
    return {"message": message}


async def send_message(
    endpoint: str,
    text: str,
    metadata: dict[str, Any] | None = None,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """message/send：等待 Agent 执行完成，返回最终 Task / Message。"""
    url = endpoint.rstrip("/") + "/"
    payload = _rpc_request("message/send", _message_params(text, metadata))
    try:
        if client is not None:
            response = await client.post(url, json=payload)
        else:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as own:
                response = await own.post(url, json=payload)
    except httpx.HTTPError as exc:
        raise A2AClientError(f"无法访问 {url}: {exc}") from exc
    if response.status_code != 200:
        raise A2AClientError(f"{url} 返回 {response.status_code}: {response.text[:200]}")
    body = response.json()
    if body.get("error"):
        raise A2AClientError(f"A2A 错误 {body['error'].get('code')}: {body['error'].get('message')}")
    return body.get("result") or {}


async def stream_message(
    endpoint: str,
    text: str,
    metadata: dict[str, Any] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """message/stream：逐条产出 SSE 中的 JSON-RPC result。"""
    url = endpoint.rstrip("/") + "/"
    payload = _rpc_request("message/stream", _message_params(text, metadata))
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        async with client.stream("POST", url, json=payload) as response:
            if response.status_code != 200:
                body = (await response.aread()).decode("utf-8", "replace")
                raise A2AClientError(f"{url} 返回 {response.status_code}: {body[:200]}")
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk.replace("\r\n", "\n")
                while "\n\n" in buffer:
                    block, buffer = buffer.split("\n\n", 1)
                    data_lines = [
                        line[6:] for line in block.splitlines() if line.startswith("data: ")
                    ]
                    if not data_lines:
                        continue
                    try:
                        event = json.loads("\n".join(data_lines))
                    except ValueError:
                        continue
                    if event.get("error"):
                        raise A2AClientError(f"A2A 错误 {event['error'].get('code')}: {event['error'].get('message')}")
                    if event.get("result") is not None:
                        yield event["result"]


def extract_answer_text(result: dict[str, Any]) -> str:
    """从 Task / Message 结果里提取回答文本。"""
    kind = result.get("kind")
    if kind == "message":
        return _extract_message_text(result)
    artifacts = result.get("artifacts") or []
    texts: list[str] = []
    for artifact in artifacts:
        for part in artifact.get("parts") or []:
            text = (part.get("text") if isinstance(part, dict) else None) or ""
            if text:
                texts.append(text)
    if not texts:
        message = result.get("status", {}).get("message")
        if isinstance(message, dict):
            embedded = _extract_message_text(message)
            if embedded:
                texts.append(embedded)
    return "\n\n".join(texts).strip()


def _extract_message_text(message: dict[str, Any]) -> str:
    texts = []
    for part in message.get("parts") or []:
        if isinstance(part, dict):
            text = part.get("text")
            if text:
                texts.append(str(text))
    return "\n".join(texts).strip()
