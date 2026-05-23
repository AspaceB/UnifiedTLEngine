// /src/types/domain.ts
export type Region = "EU" | "US" | "APAC";
export type SourceSystem = "OPQ32" | "VerifyG" | "AMCAT";

// --- Identity travels separately from scores (different per silo) ---
export interface SourceIdentity {
  name: string;
  email?: string;
  dob?: string;            // ISO; strong probabilistic signal
  nationalIdHash?: string; // deterministic key when present
}

// --- Raw, source-shaped extract ---
export interface RawReport {
  reportId: string;
  source: SourceSystem;
  region: Region;
  capturedAt: string;      // ISO — drives recency
  identity: SourceIdentity;
  raw: Record<string, number>;     // e.g. { influence: 8 } STEN, or { coding: 91 } pct
  scale: "STEN" | "PERCENTILE";
}

// --- After normalization: every construct on ONE metric ---
export interface NormalizedConstruct {
  construct: string;       // "influence" | "logicalReasoning" | ...
  percentile: number;      // 1..99  — the common metric
  z: number;               // for transparency / drift checks
  source: SourceSystem;
  reliabilityAlpha: number;// instrument Cronbach's alpha
  capturedAt: string;
}

// --- Per-composite output with provenance + uncertainty ---
export interface CompositeScore {
  key: string;             // "architecturalForesight"
  label: string;
  score: number | null;    // null when inputs insufficient
  band: number;            // ± half-width of the 90% interval
  criterion: string;       // what it predicts
  validity: number;        // observed r vs criterion
  contributingWeights: { construct: string; weight: number }[];
  missingInputs: string[]; // renormalized over present weights
}

// --- The unified record ---
export interface UnifiedTalentProfile {
  profileId: string;
  region: Region;                 // residency anchor
  constructs: NormalizedConstruct[];
  composites: CompositeScore[];
  confidence: ConfidenceBreakdown;
  provenance: ProvenanceEntry[];  // every contributing report + transform
  decisionUse: "ADVISORY_ONLY";   // enforced; never auto-decision
}

export interface ConfidenceBreakdown {
  total: number;        // 0..100
  coverage: number;     // sources present / expected
  reliability: number;  // mean instrument alpha
  recency: number;      // exponential decay on capture age
  agreement: number;    // concordance across overlapping constructs
}

export interface ProvenanceEntry {
  reportId: string; source: SourceSystem; capturedAt: string;
  transforms: string[];           // ["sten->z","z->percentile"]
  identityMatch: { method: "deterministic" | "probabilistic"; score: number };
}
