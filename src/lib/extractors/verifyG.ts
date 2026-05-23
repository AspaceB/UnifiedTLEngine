import type { RawReport } from "@/types/domain";
import { ExtractionError, type ParseStrategy } from "./types";
import {
  camelCase,
  extractCapturedAt,
  extractIdentity,
  extractRegion,
  generateReportId,
} from "./shared";

// Verify G+ is a cognitive ability battery whose subtests report on a
// percentile (rank) scale. Typical lines:
//   "Logical Reasoning        78th percentile"
//   "Numerical Reasoning  pct  82"
//   "Verbal Reasoning: 65%"
const VERIFY_KNOWN: readonly string[] = [
  "deductive reasoning",
  "inductive reasoning",
  "logical reasoning",
  "abstract reasoning",
  "numerical reasoning",
  "verbal reasoning",
  "mechanical reasoning",
  "spatial reasoning",
  "calculation",
  "interpretation",
];

const PCT_LINE = /^([A-Za-z][A-Za-z \-']{2,40})\s+(?:pct\s*|percentile\s*|%\s*)?(\d{1,3})(?:st|nd|rd|th)?(?:\s*(?:percentile|%|pct))?\s*$/gim;
const PCT_INLINE = /([A-Za-z][A-Za-z \-']{2,40})\s*[:=\-]\s*(\d{1,3})(?:st|nd|rd|th)?\s*(?:percentile|%|pct)/gi;

export class VerifyGExtractor implements ParseStrategy {
  readonly source = "VerifyG" as const;

  canParse(text: string): boolean {
    if (/Verify\s*G\+?/i.test(text)) return true;
    if (/SHL\s*Verify/i.test(text)) return true;
    if (/cognitive ability/i.test(text) && /percentile/i.test(text)) return true;
    return false;
  }

  parse(text: string): RawReport {
    const raw: Record<string, number> = {};

    for (const re of [PCT_LINE, PCT_INLINE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const label = m[1].trim().toLowerCase();
        const value = Number(m[2]);
        if (!Number.isFinite(value) || value < 1 || value > 99) continue;
        if (!VERIFY_KNOWN.some((k) => label.includes(k))) continue;
        const key = camelCase(label);
        raw[key] = value;
      }
    }

    if (Object.keys(raw).length === 0) {
      throw new ExtractionError("VerifyG", "No Verify G+ cognitive percentiles detected");
    }

    return {
      reportId: generateReportId("vg"),
      source: "VerifyG",
      region: extractRegion(text),
      capturedAt: extractCapturedAt(text),
      identity: extractIdentity(text),
      raw,
      scale: "PERCENTILE",
    };
  }
}
