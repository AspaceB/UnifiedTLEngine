import type {
  ConfidenceBreakdown,
  NormalizedConstruct,
  SourceSystem,
} from "@/types/domain";
import { mean } from "./stats";

const EXPECTED_SOURCES: readonly SourceSystem[] = ["OPQ32", "VerifyG", "AMCAT"];

/**
 * §6.5 — confidence index.
 *   coverage    = sourcesPresent / sourcesExpected
 *   reliability = mean(instrument alpha across present sources)
 *   recency     = mean( exp(-ageMonths / 24) )      // ~16.6-mo half-life
 *   agreement   = concordance across overlapping constructs
 *   confidence  = 100·(0.35·coverage + 0.25·reliability
 *                      + 0.20·recency  + 0.20·agreement)
 */
export function computeConfidence(
  constructs: readonly NormalizedConstruct[],
  now: Date = new Date(),
): ConfidenceBreakdown {
  if (constructs.length === 0) {
    return { total: 0, coverage: 0, reliability: 0, recency: 0, agreement: 0 };
  }

  const sourcesPresent = new Set(constructs.map((c) => c.source));
  const coverage = sourcesPresent.size / EXPECTED_SOURCES.length;

  const reliability = mean(constructs.map((c) => c.reliabilityAlpha));

  const recency = mean(
    constructs.map((c) => {
      const ageMs = now.getTime() - new Date(c.capturedAt).getTime();
      const ageMonths = Math.max(0, ageMs / (1000 * 60 * 60 * 24 * 30.4375));
      return Math.exp(-ageMonths / 24);
    }),
  );

  const agreement = computeAgreement(constructs);

  const total =
    100 *
    (0.35 * coverage +
      0.25 * reliability +
      0.20 * recency +
      0.20 * agreement);

  return {
    total: Math.round(total * 10) / 10,
    coverage: round3(coverage),
    reliability: round3(reliability),
    recency: round3(recency),
    agreement: round3(agreement),
  };
}

/**
 * Concordance across overlapping constructs: for any construct measured by
 * more than one source we look at the spread of the percentile readings and
 * collapse them to a 0..1 agreement score (1 = identical, 0 = maximally
 * disagreeing). When no construct overlaps across sources we fall back to
 * the within-source coherence (low variance ⇒ high agreement).
 */
function computeAgreement(constructs: readonly NormalizedConstruct[]): number {
  const groups = new Map<string, NormalizedConstruct[]>();
  for (const c of constructs) {
    const arr = groups.get(c.construct) ?? [];
    arr.push(c);
    groups.set(c.construct, arr);
  }

  const overlaps = [...groups.values()].filter((g) => {
    const sources = new Set(g.map((c) => c.source));
    return sources.size > 1;
  });

  if (overlaps.length === 0) {
    // Fall back to within-set coherence: 1 - normalized stddev of percentiles.
    const values = constructs.map((c) => c.percentile);
    return 1 - normalizedStdDev(values);
  }

  const scores = overlaps.map((group) => {
    const values = group.map((c) => c.percentile);
    return 1 - normalizedStdDev(values);
  });
  return mean(scores);
}

function normalizedStdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) ** 2));
  const sd = Math.sqrt(variance);
  // Max plausible sd on a 1..99 range is ~49; normalize to 0..1.
  return Math.min(1, sd / 49);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
