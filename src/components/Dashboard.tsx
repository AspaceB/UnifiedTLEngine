"use client";

import { useCallback, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import type {
  CompositeScore,
  NormalizedConstruct,
  SourceSystem,
} from "@/types/domain";
import type { IngestErrorResponse, IngestResponse } from "@/types/ingest";

import { CompositeRadar } from "./CompositeRadar";
import { ConfidencePanel } from "./ConfidencePanel";
import { SourceDropzone } from "./SourceDropzone";
import {
  computeAllComposites,
  computeConfidence,
} from "@/lib/inference";

type SourceState =
  | { status: "idle" }
  | { status: "processing"; fileName: string }
  | {
      status: "ready";
      fileName: string;
      constructs: NormalizedConstruct[];
      composites: CompositeScore[];
    }
  | { status: "error"; fileName: string; message: string };

type SourceMap = Record<SourceSystem, SourceState>;

const INITIAL: SourceMap = {
  OPQ32: { status: "idle" },
  VerifyG: { status: "idle" },
  AMCAT: { status: "idle" },
};

const SOURCE_META: Record<SourceSystem, { title: string; subtitle: string; hint: string; accent: string }> = {
  OPQ32: {
    title: "OPQ32",
    subtitle: "Behavioural personality — STEN 1..10",
    hint: "Profile Report or Personality Report (lists numeric STEN per trait). Universal Competency Report is qualitative-only and not supported.",
    accent: "from-indigo-500/15 to-indigo-500/0",
  },
  VerifyG: {
    title: "Verify G+",
    subtitle: "Cognitive ability — percentile",
    hint: "Verify Interactive / Verify G+ score report with numeric percentile per subtest.",
    accent: "from-emerald-500/15 to-emerald-500/0",
  },
  AMCAT: {
    title: "AMCAT",
    subtitle: "Technical skills — percentile",
    hint: "AMCAT score report with module-level percentiles (Coding, System Design, SQL, etc.).",
    accent: "from-amber-500/15 to-amber-500/0",
  },
};

export function Dashboard() {
  const [sources, setSources] = useState<SourceMap>(INITIAL);

  const handleFile = useCallback(async (source: SourceSystem, file: File) => {
    setSources((prev) => ({ ...prev, [source]: { status: "processing", fileName: file.name } }));

    const fd = new FormData();
    fd.append("file", file);
    fd.append("source", source);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      if (!res.ok) {
        const err = (await res.json()) as IngestErrorResponse;
        setSources((prev) => ({
          ...prev,
          [source]: { status: "error", fileName: file.name, message: err.error ?? "Ingest failed" },
        }));
        return;
      }
      const data = (await res.json()) as IngestResponse;
      setSources((prev) => ({
        ...prev,
        [source]: {
          status: "ready",
          fileName: file.name,
          constructs: data.constructs,
          composites: data.composites,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setSources((prev) => ({
        ...prev,
        [source]: { status: "error", fileName: file.name, message },
      }));
    }
  }, []);

  const handleReset = useCallback((source: SourceSystem) => {
    setSources((prev) => ({ ...prev, [source]: { status: "idle" } }));
  }, []);

  // Aggregate constructs across all "ready" sources and recompute composites
  // + confidence on the merged set. This is the inference recompute step from
  // §6.4 / §6.5 — every source change triggers a fresh radar.
  const aggregated = useMemo(() => {
    const all: NormalizedConstruct[] = [];
    const readySources: SourceSystem[] = [];
    for (const key of Object.keys(sources) as SourceSystem[]) {
      const s = sources[key];
      if (s.status === "ready") {
        all.push(...s.constructs);
        readySources.push(key);
      }
    }
    return {
      constructs: all,
      composites: computeAllComposites(all),
      confidence: computeConfidence(all),
      readySources,
    };
  }, [sources]);

  const hasAny = aggregated.readySources.length > 0;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-600">
            <ShieldCheck size={12} className="text-accent-600" />
            Decision support · advisory only
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
            Unified Talent Intelligence Engine
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            Drop one report per silo. The pipeline extracts, normalises STEN/percentile to a common
            metric, infers validated composites, and surfaces a confidence band — all client-side
            after a single POST to <code className="font-mono text-xs">/api/ingest</code>.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-4">
          {(Object.keys(SOURCE_META) as SourceSystem[]).map((s) => (
            <SourceDropzone
              key={s}
              source={s}
              meta={SOURCE_META[s]}
              state={sources[s]}
              onFile={(file) => handleFile(s, file)}
              onReset={() => handleReset(s)}
            />
          ))}
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-ink-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink-900">Composite radar</h2>
                <p className="text-xs text-ink-600">
                  {hasAny
                    ? `Computed across ${aggregated.readySources.join(" · ")}. Missing inputs widen the band.`
                    : "Upload one or more reports to populate the radar."}
                </p>
              </div>
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-600">
                {aggregated.composites.filter((c) => c.score !== null).length} / {aggregated.composites.length} composites
              </span>
            </div>
            <CompositeRadar composites={aggregated.composites} />
          </div>

          <ConfidencePanel confidence={aggregated.confidence} composites={aggregated.composites} />
        </section>
      </div>
    </main>
  );
}
