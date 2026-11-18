"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { Card, PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { AppSelect } from "@/components/ui/select";

type WeeklyReportResponse = {
  report_markdown: string;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return date;
  }, [today]);

  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState("");
  const [startDate, setStartDate] = useState(toDateInput(weekStart));
  const [endDate, setEndDate] = useState(toDateInput(today));
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<Repository[]>("/api/repos")
      .then((items) => {
        setRepos(items);
        setRepoId(items[0]?.id || "");
      })
      .catch(() => setRepos([]));
  }, []);

  async function generateReport() {
    if (!repoId) return;
    setLoading(true);
    try {
      const data = await apiPost<WeeklyReportResponse>("/api/reports/weekly", {
        repo_id: repoId,
        start_date: startDate,
        end_date: endDate
      });
      setReport(data.report_markdown);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageTitle title="研发周报生成" description="按时间范围统计 Issues、PRs、Merged PRs、Open PRs 和失败 CI，生成适合发给团队负责人的 Markdown 周报。" />

      <div className="animate-fade-up grid gap-5 lg:grid-cols-[360px_1fr] lg:h-[calc(100vh-13.5rem)]">
        <Card>
          <div className="grid gap-5">
            <label className="text-sm font-medium text-body">
              仓库
              <AppSelect
                className="mt-2 w-full"
                value={repoId}
                onChange={setRepoId}
                options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
              />
            </label>

            <label className="text-sm font-medium text-body">
              开始日期
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-hair bg-surface-2/60 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-prism/40"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="text-sm font-medium text-body">
              结束日期
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-hair bg-surface-2/60 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-prism/40"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <PrimaryButton onClick={generateReport} disabled={!repoId || loading}>
              {loading ? "生成中..." : "生成周报"}
            </PrimaryButton>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">Markdown 周报</h2>
          <div className="spectrum-rule mt-2.5 w-10" />
          {report ? (
            <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-7 text-ink">{report}</pre>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-10 text-center">
              <FileText size={22} strokeWidth={1.6} className="text-dim" />
              <div className="text-sm font-medium text-body">周报将在这里生成</div>
              <div className="max-w-[260px] text-xs leading-5 text-mute">选择仓库和时间范围，生成适合发给团队负责人的 Markdown 周报。</div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
