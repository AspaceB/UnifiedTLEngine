import type {
  CompositeScore,
  NormalizedConstruct,
} from "@/types/domain";

export interface CompositeDefinition {
  readonly key: string;
  readonly label: string;
  readonly criterion: string;
  readonly validity: number; // observed r vs criterion
  readonly weights: ReadonlyArray<{ construct: string; weight: number }>;
}

// §6.4 — composite framework. Weights are illustrative regression coefficients;
// in production they are refit per norm group against criterion data.
export const COMPOSITES: readonly CompositeDefinition[] = [
  {
    key: "architecturalForesight",
    label: "Architectural Foresight",
    criterion: "Supervisor-rated design quality (12-mo)",
    validity: 0.42,
    weights: [
      { construct: "abstractReasoning", weight: 0.45 },
      { construct: "structure", weight: 0.30 },
      { construct: "logicalReasoning", weight: 0.25 },
    ],
  },
  {
    key: "executionResilience",
    label: "Execution Resilience",
    criterion: "On-time delivery & defect rate (12-mo)",
    validity: 0.38,
    weights: [
      { construct: "conscientious", weight: 0.30 },
      { construct: "relaxed", weight: 0.20 },
      { construct: "detailConscious", weight: 0.25 },
      { construct: "coding", weight: 0.25 },
    ],
  },
  {
    key: "stakeholderInfluence",
    label: "Stakeholder Influence",
    criterion: "360° peer influence rating",
    validity: 0.36,
    weights: [
      { construct: "persuasive", weight: 0.40 },
      { construct: "outgoing", weight: 0.20 },
      { construct: "sociallyConfident", weight: 0.25 },
      { construct: "verbalReasoning", weight: 0.15 },
    ],
  },
  {
    key: "analyticalProblemSolving",
    label: "Analytical Problem Solving",
    criterion: "Live coding & case-study performance",
    validity: 0.51,
    weights: [
      { construct: "logicalReasoning", weight: 0.30 },
      { construct: "numericalReasoning", weight: 0.25 },
      { construct: "dataStructures", weight: 0.25 },
      { construct: "algorithms", weight: 0.20 },
    ],
  },
  {
    key: "adaptiveLearning",
    label: "Adaptive Learning",
    criterion: "Time-to-productivity on new stack",
    validity: 0.33,
    weights: [
      { construct: "innovative", weight: 0.25 },
      { construct: "varietySeeking", weight: 0.20 },
      { construct: "adaptable", weight: 0.25 },
      { construct: "inductiveReasoning", weight: 0.30 },
    ],
  },
  {
    key: "deliveryOwnership",
    label: "Delivery Ownership",
    criterion: "Manager-rated accountability",
    validity: 0.40,
    weights: [
      { construct: "achieving", weight: 0.30 },
      { construct: "decisive", weight: 0.25 },
      { construct: "conscientious", weight: 0.20 },
      { construct: "systemDesign", weight: 0.25 },
    ],
  },
];

/**
 * Compute one composite from a set of normalized constructs.
 *
 * §6.4: "Computation runs on the common percentile scale and renormalizes over
 * present weights when an input is missing, recording the gap in missingInputs
 * and widening the band."
 *
 * The half-width of the 90% interval is built from two sources of uncertainty:
 *   1. instrument SE on the present inputs (lower α ⇒ wider band)
 *   2. the share of the weight that is missing (more missing ⇒ wider band)
 */
export function computeComposite(
  def: CompositeDefinition,
  constructs: readonly NormalizedConstruct[],
): CompositeScore {
  const byKey = new Map<string, NormalizedConstruct>();
  for (const c of constructs) {
    // Keep the most recent measurement per construct.
    const prior = byKey.get(c.construct);
    if (!prior || new Date(c.capturedAt) > new Date(prior.capturedAt)) {
      byKey.set(c.construct, c);
    }
  }

  const present: Array<{ construct: string; weight: number; value: number; alpha: number }> = [];
  const missing: string[] = [];
  let missingWeight = 0;
  let presentWeight = 0;

  for (const w of def.weights) {
    const hit = byKey.get(w.construct);
    if (hit) {
      present.push({ construct: w.construct, weight: w.weight, value: hit.percentile, alpha: hit.reliabilityAlpha });
      presentWeight += w.weight;
    } else {
      missing.push(w.construct);
      missingWeight += w.weight;
    }
  }

  if (present.length === 0 || presentWeight === 0) {
    return {
      key: def.key,
      label: def.label,
      score: null,
      band: 0,
      criterion: def.criterion,
      validity: def.validity,
      contributingWeights: def.weights.map((w) => ({ construct: w.construct, weight: w.weight })),
      missingInputs: missing,
    };
  }

  // Renormalize present weights to sum to 1.
  let weightedSum = 0;
  let alphaSum = 0;
  for (const p of present) {
    const w = p.weight / presentWeight;
    weightedSum += w * p.value;
    alphaSum += w * p.alpha;
  }
  const score = Math.round(weightedSum * 10) / 10;

  // 90% half-width: 1.645 × σ. σ derives from average instrument SE
  // (sd ≈ 28.87 on a 1..99 uniform-ish percentile distribution) scaled by
  // sqrt(1 - α), plus an inflation factor for the missing share.
  const meanAlpha = alphaSum;
  const instrumentSigma = 28.87 * Math.sqrt(Math.max(0, 1 - meanAlpha));
  const missingShare = missingWeight; // weights sum to 1 by construction
  const missingInflation = 1 + 1.5 * missingShare; // each missing input widens
  const band = Math.round(1.645 * instrumentSigma * missingInflation * 10) / 10;

  return {
    key: def.key,
    label: def.label,
    score,
    band,
    criterion: def.criterion,
    validity: def.validity,
    contributingWeights: def.weights.map((w) => ({ construct: w.construct, weight: w.weight })),
    missingInputs: missing,
  };
}

export function computeAllComposites(
  constructs: readonly NormalizedConstruct[],
): CompositeScore[] {
  return COMPOSITES.map((c) => computeComposite(c, constructs));
}
