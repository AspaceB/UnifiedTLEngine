"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";

import type { CompositeScore } from "@/types/domain";

interface RadarDatum {
  composite: string;
  score: number;
  band: number;
  upper: number;
  lower: number;
  missing: number;
}

interface Props {
  composites: readonly CompositeScore[];
}

export function CompositeRadar({ composites }: Props) {
  const data: RadarDatum[] = useMemo(() => {
    return composites
      .filter((c): c is CompositeScore & { score: number } => c.score !== null)
      .map((c) => ({
        composite: c.label,
        score: c.score,
        band: c.band,
        upper: Math.min(99, c.score + c.band),
        lower: Math.max(1, c.score - c.band),
        missing: c.missingInputs.length,
      }));
  }, [composites]);

  if (data.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/40 text-center text-sm text-ink-600">
        No composites computable yet — upload at least one report.
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="#e4e4ea" />
          <PolarAngleAxis
            dataKey="composite"
            tick={{ fill: "#4a4a52", fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#8b8b94", fontSize: 10 }}
            tickCount={6}
            stroke="#d8d8de"
          />
          <Radar
            name="Confidence band (upper)"
            dataKey="upper"
            stroke="rgba(37, 99, 235, 0.0)"
            fill="rgba(37, 99, 235, 0.10)"
            fillOpacity={1}
            isAnimationActive
          />
          <Radar
            name="Confidence band (lower)"
            dataKey="lower"
            stroke="rgba(37, 99, 235, 0.0)"
            fill="#ffffff"
            fillOpacity={1}
            isAnimationActive
          />
          <Radar
            name="Composite score"
            dataKey="score"
            stroke="#2563eb"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.25}
            isAnimationActive
          />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RadarTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload as RadarDatum;
  return (
    <div className="rounded-lg border border-ink-200 bg-white/95 px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-ink-900">{datum.composite}</p>
      <p className="text-[11px] text-ink-600">
        Score <span className="font-mono text-ink-900">{datum.score.toFixed(1)}</span>{" "}
        <span className="text-ink-400">±{datum.band.toFixed(1)}</span>
      </p>
      <p className="text-[10px] text-ink-600">
        90% interval {datum.lower.toFixed(1)}–{datum.upper.toFixed(1)}
        {datum.missing > 0 ? ` · ${datum.missing} input(s) missing` : ""}
      </p>
    </div>
  );
}
