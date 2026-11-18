import { createRouter, createWebHistory } from "vue-router";
import { getToken } from "@/lib/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/login", name: "login", component: () => import("@/pages/LoginPage.vue"), meta: { title: "登录" } },
    { path: "/", name: "home", component: () => import("@/pages/HomePage.vue"), meta: { title: "工作台" } },
    { path: "/repos", name: "repos", component: () => import("@/pages/ReposPage.vue"), meta: { title: "仓库管理" } },
    { path: "/issues", name: "issues", component: () => import("@/pages/IssuesPage.vue"), meta: { title: "Issue 分析" } },
    { path: "/pull-requests", name: "pull-requests", component: () => import("@/pages/PullRequestsPage.vue"), meta: { title: "PR 审查" } },
    { path: "/ci", name: "ci", component: () => import("@/pages/CiPage.vue"), meta: { title: "CI 排障" } },
    { path: "/workflow-runs", name: "workflow-runs", component: () => import("@/pages/WorkflowRunsPage.vue"), meta: { title: "运行记录" } },
    { path: "/chat", name: "chat", component: () => import("@/pages/ChatPage.vue"), meta: { title: "Agent 对话" } },
    { path: "/knowledge", name: "knowledge", component: () => import("@/pages/KnowledgePage.vue"), meta: { title: "项目知识" } },
    { path: "/knowledge/:id", name: "knowledge-detail", component: () => import("@/pages/KnowledgeDetailPage.vue"), meta: { title: "知识详情" } },
    { path: "/rag", name: "rag", component: () => import("@/pages/RagPage.vue"), meta: { title: "RAG 工作室" } },
    { path: "/code-graph", name: "code-graph", component: () => import("@/pages/CodeGraphPage.vue"), meta: { title: "代码图谱" } },
    { path: "/evals", name: "evals", component: () => import("@/pages/EvalsPage.vue"), meta: { title: "质量评测" } },
    { path: "/reports", name: "reports", component: () => import("@/pages/ReportsPage.vue"), meta: { title: "周报" } },
    { path: "/action-drafts", name: "action-drafts", component: () => import("@/pages/ActionDraftsPage.vue"), meta: { title: "操作草稿" } },
    { path: "/workspaces", name: "workspaces", component: () => import("@/pages/WorkspacesPage.vue"), meta: { title: "报告中心" } },
    { path: "/agents", name: "agents", component: () => import("@/pages/AgentsPage.vue"), meta: { title: "A2A Agents" } },
    { path: "/:pathMatch(.*)*", redirect: "/" }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  document.title = `${to.meta.title ?? "PRism"} · PRism`;
  if (to.path !== "/login" && !getToken()) {
    return { path: "/login" };
  }
  return true;
});

export default router;
