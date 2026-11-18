"""A2A Agent Card 构建。集中隔离 Agent Card 的 spec 命名差异。"""

from a2a.types import AgentCapabilities, AgentCard, AgentSkill

from app.core.config import settings

A2A_PROTOCOL_VERSION = "0.3.0"
A2A_MOUNT_PATH = "/a2a"


def agent_base_url() -> str:
    return (settings.a2a_public_base_url or f"http://127.0.0.1:{settings.api_port}").rstrip("/")


def agent_endpoint_url() -> str:
    return f"{agent_base_url()}{A2A_MOUNT_PATH}"


def build_agent_card() -> AgentCard:
    return AgentCard(
        name=settings.app_name,
        description="PRism 全栈研发协作 Agent：Issue / PR / CI 分析、RAG 检索、安全草稿与工程工作流审查。",
        url=agent_endpoint_url(),
        version="0.1.0",
        protocol_version=A2A_PROTOCOL_VERSION,
        capabilities=AgentCapabilities(streaming=True),
        default_input_modes=["text/plain"],
        default_output_modes=["text/plain"],
        skills=[
            AgentSkill(
                id="prism_chat_agent",
                name="PRism ChatAgent",
                description=(
                    "对话式研发协作 Agent：结合仓库 Issue/PR/CI 数据、RAG 知识库、工作区代码与持久记忆，"
                    "流式给出结构化分析结论，并支持调用远端 A2A Agent。"
                ),
                tags=["chat", "analysis", "rag", "a2a"],
                examples=["分析最近失败的 CI 运行", "总结这个仓库本周的研发进展"],
            ),
            AgentSkill(
                id="prism_workflow_review",
                name="PRism WorkflowOrchestrator",
                description=(
                    "多 Agent 工程工作流：Planner -> 专用 Agent -> Observer -> Synthesis 的闭环，"
                    "用于 PR 就绪度、阻塞项、优先级和跨领域工程决策。"
                ),
                tags=["workflow", "multi-agent", "review"],
                examples=["对这个 PR 做一次工程就绪度审查"],
            ),
        ],
    )
