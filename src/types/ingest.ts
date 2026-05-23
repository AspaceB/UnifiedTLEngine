import type {
  CompositeScore,
  ConfidenceBreakdown,
  NormalizedConstruct,
  RawReport,
  SourceSystem,
} from "./domain";

export interface IngestResponse {
  source: SourceSystem;
  rawReport: RawReport;
  constructs: NormalizedConstruct[];
  composites: CompositeScore[];
  confidence: ConfidenceBreakdown;
}

export interface IngestErrorResponse {
  error: string;
  source?: SourceSystem;
}
