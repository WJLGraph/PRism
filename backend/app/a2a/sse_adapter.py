"""run_stream 事件(delta/tool_use/final) -> A2A 任务更新/Artifact 的映射适配器。

单文件适配层：不改变 ChatAgent 事件语义，只做协议转换。
"""

from typing import Any

from a2a.types import Part, TextPart


def delta_note(event: dict[str, Any]) -> str:
    data = event.get("data") or {}
    return str(data.get("content") or "")


def tool_use_note(event: dict[str, Any]) -> str:
    data = event.get("data") or {}
    tool_name = str(data.get("tool_name") or data.get("tool") or "unknown")
    arguments = data.get("arguments") or data.get("input") or {}
    return f"调用工具：{tool_name} {arguments}"


def artifact_parts(event: dict[str, Any]) -> list[Part]:
    data = event.get("data") or {}
    parts: list[Part] = [Part(root=TextPart(text=str(data.get("answer") or "")))]
    citations = data.get("citations") or []
    if citations:
        lines = []
        for item in citations:
            if isinstance(item, dict):
                title = str(item.get("title") or item.get("id") or "")
                kind = str(item.get("type") or "reference")
                lines.append(f"- [{kind}] {title}")
            else:
                lines.append(f"- {item}")
        if lines:
            parts.append(Part(root=TextPart(text="引用来源：\n" + "\n".join(lines))))
    return parts


def artifact_metadata(event: dict[str, Any]) -> dict[str, Any]:
    data = event.get("data") or {}
    metadata: dict[str, Any] = {
        "route": data.get("route"),
        "run_id": data.get("run_id"),
    }
    citations = data.get("citations") or []
    if citations:
        metadata["citations"] = citations
    completion = data.get("completion")
    if completion:
        metadata["completion"] = completion
    return metadata
