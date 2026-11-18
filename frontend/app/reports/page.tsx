"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { PageTitle, PrimaryButton } from "@/components/ui/card";
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
      <PageTitle
        eyebrow="05 / Weekly report"
        title="研发周报生成"
        description="按时间范围统计 Issues、PRs、Merged PRs、Open PRs 和失败 CI，生成适合发给团队负责人的 Markdown 周报。"
      />

      <div className="page-grid grid-cols-[380px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="page-kicker">Configure / 01</div>
          <h2 className="page-section-title">报告参数</h2>
          <p className="page-section-note">选择仓库与时间范围，系统按当前真实数据聚合统计口径。</p>

          <label className="page-form-field mt-7">
            <span>仓库</span>
            <AppSelect
              value={repoId}
              onChange={setRepoId}
              options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
            />
          </label>

          <label className="page-form-field mt-5">
            <span>开始日期</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>

          <label className="page-form-field mt-5">
            <span>结束日期</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>

          <PrimaryButton className="mt-7" onClick={generateReport} disabled={!repoId || loading}>
            {loading ? "生成中..." : "生成周报"}
          </PrimaryButton>
        </section>

        <section className="page-column">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Output / 02</div>
              <h2 className="page-section-title">Markdown 周报</h2>
            </div>
            <span className="font-mono text-xs text-mute">{report ? `${startDate} → ${endDate}` : "等待生成"}</span>
          </div>

          {report ? (
            <pre className="mt-6 overflow-x-auto whitespace-pre-wrap border border-hair bg-canvas p-5 font-mono text-xs leading-7 text-ink">
              {report}
            </pre>
          ) : (
            <div className="page-empty mt-6">
              <div>
                <FileText size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                <div className="mt-2 text-sm font-medium text-body">周报将在这里生成</div>
                <div className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-mute">选择仓库和时间范围，生成适合发给团队负责人的 Markdown 周报。</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
