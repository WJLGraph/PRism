"""注册 a2a.discover_agents / a2a.invoke_agent 两个工具进 ChatAgent 工具表。"""

from typing import Any

from app.a2a.client import (
    A2AClientError,
    discover_all_agents,
    extract_answer_text,
    send_message,
    trusted_agent_endpoints,
)
from app.core.config import settings


def a2a_tool_entries(repo: Any, conversation: Any, db: Any) -> dict[str, Any]:
    """返回可合并进 _build_conversation_tools 的 a2a 工具项；开关关闭时为空。"""
    if not settings.a2a_enabled:
        return {}

    async def discover_agents(input_data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        agents = await discover_all_agents()
        if not agents:
            answer = "尚未配置任何远端 A2A Agent（A2A_TRUSTED_AGENTS 为空）。"
        else:
            lines = []
            for agent in agents:
                if agent.get("error"):
                    lines.append(f"- {agent.get('endpoint')}：发现失败（{agent['error']}）")
                else:
                    skills = "、".join(str(skill.get("name") or skill.get("id")) for skill in agent.get("skills") or [])
                    lines.append(
                        f"- {agent.get('endpoint')}：{agent.get('name')} v{agent.get('version')}（技能：{skills or '无'}）"
                    )
            answer = "已发现的 A2A Agent：\n" + "\n".join(lines)
        return {
            "route": "a2a_discover_agents",
            "tool_calls": [{"tool_name": "a2a.discover_agents", "arguments": {}, "status": "success"}],
            "answer": answer,
            "citations": [],
        }

    async def invoke_agent(input_data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        endpoint = str(input_data.get("endpoint") or "").strip().rstrip("/")
        message = str(input_data.get("message") or input_data.get("query") or "").strip()
        if not endpoint:
            endpoints = trusted_agent_endpoints()
            if not endpoints:
                raise A2AClientError("A2A_TRUSTED_AGENTS 为空，请先配置远端 Agent 端点。")
            if len(endpoints) > 1:
                raise A2AClientError(f"配置了多个远端 Agent，请指定 endpoint 参数：{endpoints}")
            endpoint = endpoints[0]
        if not message:
            raise ValueError("message 为必填项")
        metadata = input_data.get("metadata") if isinstance(input_data.get("metadata"), dict) else None
        result = await send_message(endpoint, message, metadata)
        answer = extract_answer_text(result) or "远端 Agent 未返回文本。"
        return {
            "route": "a2a_invoke_agent",
            "tool_calls": [{"tool_name": "a2a.invoke_agent", "arguments": {"endpoint": endpoint, "message": message}, "status": "success"}],
            "answer": answer,
            "citations": [{"type": "a2a_agent", "id": endpoint, "title": endpoint}],
        }

    return {
        "a2a.discover_agents": discover_agents,
        "a2a.invoke_agent": invoke_agent,
    }
