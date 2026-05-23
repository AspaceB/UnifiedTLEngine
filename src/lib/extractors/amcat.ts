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
  "basic computer literacy",
  "internet ability",
  "inductive reasoning",
  "deductive reasoning",
];

// Score-report variants from myamcat.com smash the table columns when
// extracted via pdf-parse: "English67599.3%" = label "English" + 3-digit
// AMCAT score (range 100–900) + percentile (0–100, optional decimal) + "%".
// We anchor on each known module name and parse the trailing percentile;
// the score itself is discarded — only percentile feeds the inference engine.
const AMCAT_KNOWN_PATTERN = AMCAT_KNOWN
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*"))
  .join("|");
const PCT_SMASHED = new RegExp(
  `(${AMCAT_KNOWN_PATTERN})\\s*\\d{3}\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%`,
  "gi",
);

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

    // Second pass: AMCAT skill modules. Always runs (real reports often carry
    // both AMPI traits AND module percentiles — gating one on the other dropped
    // half the data). We still anchor strictly on known module labels, so the
    // AMPI body prose can't accidentally feed the generic line/inline regexes.
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

    // Third pass: column-smashed score tables (myamcat.com layout where
    // pdf-parse glues "Module · Score · Percentile" into one token).
    PCT_SMASHED.lastIndex = 0;
    let sm: RegExpExecArray | null;
    while ((sm = PCT_SMASHED.exec(text)) !== null) {
      const label = sm[1].replace(/\s+/g, " ").trim().toLowerCase();
      const pctRaw = Number(sm[2]);
      if (!Number.isFinite(pctRaw) || pctRaw < 0 || pctRaw > 100) continue;
      // Round the decimal percentile and clamp to the 1..99 scale the rest of
      // the pipeline expects (100th percentile reports "Internet Ability850100%"
      // are real — don't drop them).
      const value = Math.round(pctRaw);
      const clamped = Math.min(99, Math.max(1, value));
      const key = camelCase(label);
      if (raw[key] === undefined) raw[key] = clamped;
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
