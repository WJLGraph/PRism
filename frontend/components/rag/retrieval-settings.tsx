"use client";

import { Check, FileSearch, Layers3, Search } from "lucide-react";

import type { KnowledgeConfig, ModelCatalog, RetrievalMethod } from "@/lib/rag";
import { AppSelect } from "@/components/ui/select";

type Props = {
  value: KnowledgeConfig;
  catalog: ModelCatalog | null;
  onChange: (value: KnowledgeConfig) => void;
  showChunking?: boolean;
};

const methods: { value: RetrievalMethod; label: string; note: string; icon: typeof Search }[] = [
  { value: "vector", label: "向量检索", note: "擅长理解语义相近的表达", icon: Layers3 },
  { value: "fulltext", label: "全文检索", note: "适合专有名词与精确关键词", icon: FileSearch },
  { value: "hybrid", label: "混合检索", note: "融合语义与关键词结果", icon: Search }
];

export function RetrievalSettings({ value, catalog, onChange, showChunking = true }: Props) {
  const update = <K extends keyof KnowledgeConfig,>(key: K, next: KnowledgeConfig[K]) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-8">
      {showChunking ? (
        <section>
          <div className="mono-eyebrow mb-1.5 text-prism">01 / Chunking</div>
          <h3 className="font-display text-base font-semibold tracking-tight2 text-ink">分段设置</h3>
          <p className="mt-1.5 text-xs text-mute">按自然段落切分，过长段落会继续按长度拆开。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-body">
              最大分段长度
              <input
                type="number"
                min={200}
                max={4000}
                value={value.chunk_size}
                onChange={(event) => update("chunk_size", Number(event.target.value))}
                className="mt-1.5 h-10 w-full rounded-lg border border-hair bg-surface px-3 text-sm tabular-nums text-ink outline-none transition-colors focus:border-prism"
              />
            </label>
            <label className="text-xs font-medium text-body">
              分段重叠长度
              <input
                type="number"
                min={0}
                max={1000}
                value={value.chunk_overlap}
                onChange={(event) => update("chunk_overlap", Number(event.target.value))}
                className="mt-1.5 h-10 w-full rounded-lg border border-hair bg-surface px-3 text-sm tabular-nums text-ink outline-none transition-colors focus:border-prism"
              />
            </label>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mono-eyebrow mb-1.5 text-prism">02 / Index</div>
        <h3 className="font-display text-base font-semibold tracking-tight2 text-ink">索引方式</h3>
        <p className="mt-1.5 text-xs text-mute">DeepSeek 官方 API 暂无 Embedding，默认使用 Qwen。</p>
        <label className="mt-4 block text-xs font-medium text-body">
          Embedding 模型
          <AppSelect
            className="mt-1.5 h-10"
            value={`${value.embedding_provider}::${value.embedding_model}`}
            onChange={(next) => {
              const [provider, model] = next.split("::");
              const selected = catalog?.embedding_models.find((item) => item.provider === provider && item.model === model);
              onChange({ ...value, embedding_provider: provider, embedding_model: model, embedding_dimensions: selected?.dimensions ?? value.embedding_dimensions });
            }}
            options={[
              ...(catalog?.embedding_models ?? []).map((model) => ({
                value: `${model.provider}::${model.model}`,
                label: `${model.label}${model.available ? "" : " · 未配置，自动降级"}`
              })),
              ...(!catalog ? [{ value: `${value.embedding_provider}::${value.embedding_model}`, label: value.embedding_model }] : [])
            ]}
          />
        </label>
      </section>

      <section>
        <div className="mono-eyebrow mb-1.5 text-prism">03 / Retrieval</div>
        <h3 className="font-display text-base font-semibold tracking-tight2 text-ink">检索设置</h3>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {methods.map((method) => {
            const Icon = method.icon;
            const selected = value.retrieval_method === method.value;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => update("retrieval_method", method.value)}
                className={`relative min-h-28 rounded-xl border p-3.5 text-left transition-all duration-500 ease-silk ${selected ? "border-prism/60 bg-prism/10 shadow-glow" : "border-hair bg-surface hover:border-prism/30 hover:bg-panel"}`}
              >
                {selected ? <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-prism" /> : null}
                <Icon className={`h-5 w-5 ${selected ? "text-prism" : "text-mute"}`} />
                <span className="mt-3 block text-sm font-semibold text-ink">{method.label}</span>
                <span className="mt-1 block text-xs leading-5 text-mute">{method.note}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-hair pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mono-eyebrow mb-1.5 text-prism">04 / Rerank</div>
            <h3 className="font-display text-base font-semibold tracking-tight2 text-ink">Rerank 模型</h3>
            <p className="mt-1.5 text-xs text-mute">对召回候选重新排序，API 不可用时自动使用本地重排。</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.rerank_enabled}
            onClick={() => update("rerank_enabled", !value.rerank_enabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-500 ease-silk ${value.rerank_enabled ? "bg-prism" : "bg-dim/50"}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-surface shadow-card transition-all duration-500 ease-silk ${value.rerank_enabled ? "left-6" : "left-1"}`} />
          </button>
        </div>
        {value.rerank_enabled ? (
          <AppSelect
            className="mt-3 h-10"
            value={`${value.rerank_provider}::${value.rerank_model}`}
            onChange={(next) => {
              const [provider, model] = next.split("::");
              onChange({ ...value, rerank_provider: provider, rerank_model: model });
            }}
            options={[
              ...(catalog?.rerank_models ?? []).map((model) => ({
                value: `${model.provider}::${model.model}`,
                label: `${model.label}${model.available ? "" : " · 未配置，自动降级"}`
              })),
              ...(!catalog ? [{ value: `${value.rerank_provider}::${value.rerank_model}`, label: value.rerank_model }] : [])
            ]}
          />
        ) : null}
      </section>

      <section className="grid gap-5 border-t border-hair pt-6 sm:grid-cols-2">
        <label className="text-xs font-medium text-body">
          Top K
          <div className="mt-2.5 flex items-center gap-3">
            <input type="range" min={1} max={10} value={value.top_k} onChange={(event) => update("top_k", Number(event.target.value))} className="min-w-0 flex-1 accent-prism" />
            <input type="number" min={1} max={20} value={value.top_k} onChange={(event) => update("top_k", Number(event.target.value))} className="h-9 w-16 rounded-lg border border-hair bg-surface text-center text-sm tabular-nums text-ink outline-none transition-colors focus:border-prism" />
          </div>
        </label>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-body">Score 阈值</span>
            <input type="checkbox" checked={value.score_threshold_enabled} onChange={(event) => update("score_threshold_enabled", event.target.checked)} className="h-4 w-4 accent-prism" />
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <input type="range" min={0} max={1} step={0.01} disabled={!value.score_threshold_enabled} value={value.score_threshold} onChange={(event) => update("score_threshold", Number(event.target.value))} className="min-w-0 flex-1 accent-prism disabled:opacity-40" />
            <span className="w-12 text-right font-mono text-sm tabular-nums text-body">{value.score_threshold.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
