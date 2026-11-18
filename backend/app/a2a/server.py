"""A2A Starlette 应用构建，挂载到 FastAPI 的 /a2a 前缀下。"""

from a2a.server.apps import A2AStarletteApplication
from a2a.server.events import InMemoryQueueManager
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from starlette.applications import Starlette

from app.a2a.card import build_agent_card
from app.a2a.skills import PRismAgentExecutor


def build_a2a_app() -> Starlette:
    handler = DefaultRequestHandler(
        agent_executor=PRismAgentExecutor(),
        task_store=InMemoryTaskStore(),
        queue_manager=InMemoryQueueManager(),
    )
    return A2AStarletteApplication(agent_card=build_agent_card(), http_handler=handler).build()
