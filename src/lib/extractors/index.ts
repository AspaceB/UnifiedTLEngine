import type { RawReport, SourceSystem } from "@/types/domain";
import { AMCATExtractor } from "./amcat";
import { OPQ32Extractor } from "./opq32";
import { ExtractionError, type ParseStrategy } from "./types";
import { VerifyGExtractor } from "./verifyG";

const STRATEGIES: readonly ParseStrategy[] = [
  new OPQ32Extractor(),
  new VerifyGExtractor(),
  new AMCATExtractor(),
];

export function getStrategy(source: SourceSystem): ParseStrategy {
  const hit = STRATEGIES.find((s) => s.source === source);
  if (!hit) throw new ExtractionError("unknown", `No strategy for source ${source}`);
  return hit;
}

export function detectAndParse(text: string, hint?: SourceSystem): RawReport {
  if (hint) {
    return getStrategy(hint).parse(text);
  }
  const candidate = STRATEGIES.find((s) => s.canParse(text));
  if (!candidate) {
    throw new ExtractionError("unknown", "Could not identify report source");
  }
  return candidate.parse(text);
}

export { ExtractionError };
export type { ParseStrategy };
