import type { RawReport } from "@/types/domain";
import { ExtractionError, type ParseStrategy } from "./types";
import {
  camelCase,
  extractCapturedAt,
  extractIdentity,
  extractRegion,
  generateReportId,
} from "./shared";

// OPQ32 reports list 32 personality dimensions on the 1–10 STEN scale.
// We accept rows that look like:   "Influence                    8"
// or                                "Persuasive    STEN 7"
// or                                "Influence: 8/10"
const OPQ_KNOWN: readonly string[] = [
  "persuasive",
  "controlling",
  "outspoken",
  "independent-minded",
  "outgoing",
  "affiliative",
  "socially confident",
  "modest",
  "democratic",
  "caring",
  "data rational",
  "evaluative",
  "behavioural",
  "conventional",
  "conceptual",
  "innovative",
  "variety seeking",
  "adaptable",
  "forward thinking",
  "detail conscious",
  "conscientious",
  "rule following",
  "relaxed",
  "worrying",
  "tough minded",
  "optimistic",
  "trusting",
  "emotionally controlled",
  "vigorous",
  "competitive",
  "achieving",
  "decisive",
  "influence",
  "structure",
  "sociability",
  "resilience",
];

const STEN_LINE = /^([A-Za-z][A-Za-z \-']{2,40})\s+(?:STEN\s*)?(\d{1,2})(?:\s*\/\s*10)?\s*$/gm;
const STEN_INLINE = /([A-Za-z][A-Za-z \-']{2,40})\s*[:=\-]\s*(?:STEN\s*)?(\d{1,2})(?:\s*\/\s*10)?/g;

// In Profile-Report layouts the trait name and its STEN value are sometimes
// rendered on separate lines, with a bar-chart row in between. Look ahead a
// few lines for an isolated digit 1..10.
const STEN_LOOKAHEAD = /(?:^|\n)([A-Za-z][A-Za-z \-']{2,40})\s*\n(?:[\s·•●○\-\.\d]{0,80}\n){0,4}\s*(\d{1,2})(?:\s*\/\s*10)?\s*(?:\n|$)/g;

const VARIANT_UCR = /Universal Competency Report/i;
const VARIANT_MGRPLUS = /Manager(?:\s|\+)?Plus Report/i;
const VARIANT_DERAILMENT = /Derailment Report/i;

const QUALITATIVE_VARIANTS: ReadonlyArray<{ test: RegExp; name: string }> = [
  { test: VARIANT_UCR, name: "Universal Competency Report" },
  { test: VARIANT_MGRPLUS, name: "Manager Plus Report" },
  { test: VARIANT_DERAILMENT, name: "Derailment Report" },
];

// Normalise a line for trait-name comparison: lowercase, hyphen → space,
// collapse whitespace. "Independent-Minded" and "INDEPENDENT MINDED" both
// reduce to "independent minded".
function normaliseLine(s: string): string {
  return s.toLowerCase().replace(/[-‐‑‒–—]/g, " ").replace(/\s+/g, " ").trim();
}

// Pair each standalone-digit line with its nearest unpaired known trait
// name within a small line window. Handles both:
//   chart layout: digit→…descriptor lines…→TraitName
//   TC    layout: TraitName→…descriptor lines…→digit
function extractByProximity(text: string): Record<string, number> {
  const lines = text.split(/\r?\n/);
  const STANDALONE_DIGIT = /^\s*(10|[1-9])(?:\s*\/\s*10)?\s*$/;

  const stenAt: Array<{ line: number; value: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = STANDALONE_DIGIT.exec(lines[i]);
    if (m) stenAt.push({ line: i, value: Number(m[1]) });
  }

  const traitAt: Array<{ line: number; key: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const norm = normaliseLine(lines[i]);
    if (!norm) continue;
    for (const known of OPQ_KNOWN) {
      if (norm === known) {
        traitAt.push({ line: i, key: camelCase(known) });
        break;
      }
    }
  }

  // Window of 8 lines covers the typical block height (low descriptor + name +
  // high descriptor across 4–6 lines, with some breathing room).
  const WINDOW = 8;
  const out: Record<string, number> = {};
  const usedTrait = new Set<number>();

  for (const sten of stenAt) {
    let best = -1;
    let bestDist = Infinity;
    for (let t = 0; t < traitAt.length; t++) {
      if (usedTrait.has(t)) continue;
      const dist = Math.abs(traitAt[t].line - sten.line);
      if (dist <= WINDOW && dist < bestDist) {
        bestDist = dist;
        best = t;
      }
    }
    if (best >= 0) {
      const { key } = traitAt[best];
      if (out[key] === undefined) out[key] = sten.value;
      usedTrait.add(best);
    }
  }

  return out;
}

export class OPQ32Extractor implements ParseStrategy {
  readonly source = "OPQ32" as const;

  canParse(text: string): boolean {
    if (/OPQ\s*32/i.test(text)) return true;
    if (/Occupational Personality Questionnaire/i.test(text)) return true;
    if (/\bSTEN\b/i.test(text)) {
      return OPQ_KNOWN.some((k) => new RegExp(`\\b${k}\\b`, "i").test(text));
    }
    return false;
  }

  parse(text: string): RawReport {
    const raw: Record<string, number> = {};

    for (const re of [STEN_LINE, STEN_INLINE, STEN_LOOKAHEAD]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const label = m[1].trim().toLowerCase();
        const value = Number(m[2]);
        if (!Number.isFinite(value) || value < 1 || value > 10) continue;
        if (!OPQ_KNOWN.some((k) => label.includes(k))) continue;
        const key = camelCase(label);
        // Keep the first hit per trait — earlier patterns are stricter.
        if (raw[key] === undefined) raw[key] = value;
      }
    }

    // Fallback: SHL's "Profile" and "Profile Chart" layouts render each trait
    // as a block where the STEN digit sits alone on its own line either just
    // BEFORE the trait name (chart layout) or just AFTER it (TC layout), with
    // 2–6 lines of low/high descriptor text in between. The regex passes
    // above can't see that pairing — they only catch labels glued to digits.
    // Pair each standalone digit to its nearest known trait by line distance.
    const proximityHits = extractByProximity(text);
    for (const [k, v] of Object.entries(proximityHits)) {
      if (raw[k] === undefined) raw[k] = v;
    }

    if (Object.keys(raw).length === 0) {
      const qualitative = QUALITATIVE_VARIANTS.find((v) => v.test.test(text));
      if (qualitative) {
        throw new ExtractionError(
          "OPQ32",
          `This is the OPQ32 ${qualitative.name} — a qualitative variant that contains narrative competency assessments rather than numeric STEN trait scores (the 1–5 strength bars are rendered as graphics that PDF extraction cannot recover). Upload an OPQ32 Profile Report or OPQ32 Personality Report (which list 1–10 STEN values per trait) to feed the inference engine.`,
        );
      }
      throw new ExtractionError(
        "OPQ32",
        "No OPQ32 STEN scores detected. The expected variant lists the 32 traits with a 1–10 STEN value per row (Profile Report / Personality Report). Competency-only variants do not include numeric scores.",
      );
    }

    return {
      reportId: generateReportId("opq"),
      source: "OPQ32",
      region: extractRegion(text),
      capturedAt: extractCapturedAt(text),
      identity: extractIdentity(text),
      raw,
      scale: "STEN",
    };
  }
}
