"use client";

import { Gauge, Layers, Clock, Sparkles } from "lucide-react";

import type { CompositeScore, ConfidenceBreakdown } from "@/types/domain";

interface Props {
  confidence: ConfidenceBreakdown;
  composites: readonly CompositeScore[];
}

export function ConfidencePanel({ confidence, composites }: Props) {
  const anyScored = composites.some((c) => c.score !== null);
  const factors = [
    { key: "coverage", label: "Coverage", value: confidence.coverage, weight: 0.35, icon: Layers },
    { key: "reliability", label: "Reliability (α)", value: confidence.reliability, weight: 0.25, icon: Sparkles },
    { key: "recency", label: "Recency", value: confidence.recency, weight: 0.20, icon: Clock },
    { key: "agreement", label: "Agreement", value: confidence.agreement, weight: 0.20, icon: Gauge },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-ink-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Confidence</h3>
          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-700">
            0–100
          </span>
        </div>
        <p className="mt-2 font-mono text-4xl font-semibold text-ink-900">
          {confidence.total.toFixed(1)}
        </p>
        <p className="mt-1 text-[11px] text-ink-600">
          Weighted blend of coverage, reliability, recency, agreement.
        </p>
        <div className="mt-4 space-y-2">
          {factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-[11px] text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <f.icon size={11} />
                  {f.label}
                </span>
                <span className="font-mono text-ink-900">
                  {(f.value * 100).toFixed(0)}
                  <span className="ml-1 text-[9px] text-ink-400">·{(f.weight * 100).toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-accent-500 transition-[width]"
                  style={{ width: `${Math.max(0, Math.min(1, f.value)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Composites</h3>
          {anyScored ? (
            <span className="text-[10px] text-ink-600">
              score · ±band · validity r · missing
            </span>
          ) : null}
        </div>
        {anyScored ? (
          <ul className="divide-y divide-ink-100">
            {composites.map((c) => (
              <li key={c.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink-900">{c.label}</p>
                  <p className="truncate text-[10px] text-ink-600">{c.criterion}</p>
                </div>
                <span className="font-mono text-xs text-ink-900">
                  {c.score === null ? "—" : c.score.toFixed(1)}
                </span>
                <span className="font-mono text-[11px] text-ink-600">
                  {c.score === null ? "" : `±${c.band.toFixed(1)}`}
                </span>
                <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-mono text-ink-600">
                  r={c.validity.toFixed(2)}
                  {c.score !== null && c.missingInputs.length > 0
                    ? ` · ${c.missingInputs.length} miss`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/40 text-center">
            <p className="text-xs font-medium text-ink-800">Awaiting reports</p>
            <p className="mt-1 max-w-[280px] text-[11px] text-ink-600">
              Drop a PDF in any source on the left to populate the inference engine. The 6 composite
              definitions ship with the build; their scores appear here once inputs arrive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
