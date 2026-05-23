import type { RawReport } from "@/types/domain";
import { ExtractionError, type ParseStrategy } from "./types";
import {
  camelCase,
  extractCapturedAt,
  extractIdentity,
  extractRegion,
  generateReportId,
} from "./shared";

// AMCAT scores technical/job-skill modules on a percentile scale.
// Typical lines:
//   "Coding                  91%ile"
//   "System Design       87 percentile"
//   "SQL: 76"
//   "Automata Fix Score (percentile)  82"
const AMCAT_KNOWN: readonly string[] = [
  "coding",
  "automata",
  "automata fix",
  "system design",
  "computer programming",
  "computer science",
  "data structures",
  "algorithms",
  "sql",
  "database",
  "operating systems",
  "networking",
  "software engineering",
  "quantitative ability",
  "logical ability",
  "english",
  "communication",
  "problem solving",
  "debugging",
];

const PCT_LINE = /^([A-Za-z][A-Za-z \-']{2,40})\s+(?:score\s*)?(?:\(?\s*(?:percentile|%ile|pct|%)?\s*\)?\s*)?(\d{1,3})(?:\s*(?:percentile|%ile|pct|%))?\s*$/gim;
const PCT_INLINE = /([A-Za-z][A-Za-z \-']{2,40})\s*[:=\-]\s*(\d{1,3})(?:\s*(?:percentile|%ile|pct|%))?/gi;

// AMPI = Aspiring Minds Personality Inventory: Big-Five percentiles.
// Row format after pdf-parse smashes columns: "ExtraversionMedium65%0.38"
// Mapped to OPQ-compatible construct keys so they feed existing composites.
const AMPI_ROW = /(Extraversion|Conscientiousness|Neuroticism|Openness(?:\s+to\s+Experience)?|Agreeableness)\s*(Low|Medium|High)?\s*(\d{1,3})\s*%\s*(-?\d+(?:\.\d+)?)?/gi;

const AMPI_ALIASES: Readonly<Record<string, readonly string[]>> = {
  extraversion: ["extraversion", "outgoing"],
  conscientiousness: ["conscientiousness", "conscientious"],
  neuroticism: ["neuroticism"],
  "openness to experience": ["opennessToExperience", "innovative"],
  openness: ["openness", "innovative"],
  agreeableness: ["agreeableness", "caring"],
};

export class AMCATExtractor implements ParseStrategy {
  readonly source = "AMCAT" as const;

  canParse(text: string): boolean {
    if (/AMCAT/i.test(text)) return true;
    if (/\bAMPI\b/i.test(text)) return true;
    if (/Aspiring Minds/i.test(text)) return true;
    if (/employability/i.test(text) && /percentile/i.test(text)) return true;
    return false;
  }

  parse(text: string): RawReport {
    const raw: Record<string, number> = {};
    // Normalize whitespace so multi-line wraps like "Openness to\nExperience"
    // become matchable on a single regex pass.
    const normalized = text.replace(/[\t  ]+/g, " ").replace(/\s*\n\s*/g, "\n");

    // First pass: AMPI Big-Five rows (personality percentiles).
    const isAmpi = /\bAMPI\b/i.test(text) || /Aspiring Minds Personality Inventory/i.test(text);
    if (isAmpi) {
      const joined = normalized.replace(/\n/g, " ");
      AMPI_ROW.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = AMPI_ROW.exec(joined)) !== null) {
        const traitName = m[1].toLowerCase().replace(/\s+/g, " ").trim();
        const value = Number(m[3]);
        if (!Number.isFinite(value) || value < 1 || value > 99) continue;
        const aliases = AMPI_ALIASES[traitName] ?? [camelCase(traitName)];
        for (const alias of aliases) {
          if (raw[alias] === undefined) raw[alias] = value;
        }
      }
    }

    // Second pass: AMCAT skill modules (only if we haven't already filled from AMPI,
    // since AMPI text contains body paragraphs that can trick the generic regex).
    if (Object.keys(raw).length === 0) {
      for (const re of [PCT_LINE, PCT_INLINE]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const label = m[1].trim().toLowerCase();
          const value = Number(m[2]);
          if (!Number.isFinite(value) || value < 1 || value > 99) continue;
          if (!AMCAT_KNOWN.some((k) => label.includes(k))) continue;
          const key = camelCase(label);
          if (raw[key] === undefined) raw[key] = value;
        }
      }
    }

    if (Object.keys(raw).length === 0) {
      throw new ExtractionError(
        "AMCAT",
        "No AMCAT skill percentiles or AMPI Big-Five traits detected. Supported variants: AMCAT score report (module percentiles like Coding/SQL/System Design) or AMPI report (Big-Five personality percentiles).",
      );
    }

    return {
      reportId: generateReportId("amc"),
      source: "AMCAT",
      region: extractRegion(text),
      capturedAt: extractCapturedAt(text),
      identity: extractIdentity(text),
      raw,
      scale: "PERCENTILE",
    };
  }
}
