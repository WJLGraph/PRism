"""把 PRism ChatAgent 包装成 A2A AgentExecutor。

外部 A2A 调用方通过 message/send | message/stream 访问本 Agent；
可在消息 metadata 里携带 repo_id 以启用仓库上下文与完整工具表。
"""

import uuid
from typing import Any

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import Part, TaskState, TextPart, UnsupportedOperationError
from a2a.utils.errors import ServerError
from a2a.utils.message import new_agent_text_message
from sqlalchemy.orm import Session

from app.a2a import sse_adapter
from app.db.models import Repository
from app.db.session import SessionLocal
from app.services.agents.chat_agent import ChatAgent
from app.services.conversations import ensure_conversation


def _part_text(message: Any) -> str:
    parts = getattr(message, "parts", None) or []
    texts: list[str] = []
    for part in parts:
        root = getattr(part, "root", part)
        text = getattr(root, "text", None)
        if text:
            texts.append(str(text))
    return "\n".join(texts).strip()


def _metadata_of(context: RequestContext) -> dict[str, Any]:
    metadata = getattr(context, "metadata", None)
    if isinstance(metadata, dict):
        return metadata
    message = getattr(context, "message", None)
    if message is not None and isinstance(getattr(message, "metadata", None), dict):
        return message.metadata
    return {}


def build_agent_context(db: Session, metadata: dict[str, Any]) -> dict[str, Any]:
    """根据 metadata.repo_id 构建最小可用上下文；无仓库时 ChatAgent 走兜底回答。"""
    context: dict[str, Any] = {"tools": {}}
    repo_id = str(metadata.get("repo_id") or "").strip()
    if not repo_id:
        return context
    try:
        repo = db.get(Repository, uuid.UUID(repo_id))
    except ValueError:
        repo = None
    if repo is None:
        return context
    conversation = ensure_conversation(db, repo.id, None)
    context.update(
        {
            "repo_id": str(repo.id),
            "conversation_id": str(conversation.id),
            "a2a_source": True,
        }
    )
    # 延迟导入避免 routes.chat 在模块加载期的循环依赖。
    from app.api.routes.chat import _build_conversation_tools

    context["tools"] = _build_conversation_tools(repo, conversation, db)
    return context


class PRismAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        db = SessionLocal()
        try:
            message = _part_text(context.message)
            if not message:
                await updater.submit()
                await updater.failed(updater.new_agent_message([Part(root=TextPart(text="消息内容为空。"))]))
                return
            agent_context = build_agent_context(db, _metadata_of(context))
            await updater.submit()
            await updater.start_work()
            async for event in ChatAgent().run_stream({"message": message}, agent_context):
                kind = event.get("event")
                if kind == "delta":
                    note = sse_adapter.delta_note(event)
                    if note:
                        await updater.update_status(TaskState.working, message=new_agent_text_message(note))
                elif kind == "tool_use":
                    await updater.update_status(
                        TaskState.working,
                        message=new_agent_text_message(sse_adapter.tool_use_note(event)),
                    )
                elif kind == "final":
                    await updater.add_artifact(
                        parts=sse_adapter.artifact_parts(event),
                        name="prism-analysis-result",
                        metadata=sse_adapter.artifact_metadata(event),
                    )
                    await updater.complete()
                    return
            await updater.complete()
        except Exception as exc:
            await updater.failed(updater.new_agent_message([Part(root=TextPart(text=f"Agent 执行失败：{exc}"))]))
        finally:
            db.close()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise ServerError(error=UnsupportedOperationError())
