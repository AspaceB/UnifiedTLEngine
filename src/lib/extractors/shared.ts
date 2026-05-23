import type { Region, SourceIdentity } from "@/types/domain";

const EMAIL_RE = /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i;
const DOB_RE = /\b(?:DOB|Date of Birth|Born)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.\s][A-Za-z0-9]{1,9}[\/\-\.\s][0-9]{2,4})/i;
const NAME_RE = /\b(?:Candidate|Name|Participant)\s*[:\-]\s*([A-Z][A-Za-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+){0,3})/;
const NATID_RE = /\b(?:National ID|Nat\.?\s*ID|PAN|SSN|ID Hash)\s*[:\-]?\s*([A-Z0-9*]{6,})/i;
const CAPTURED_RE = /\b(?:Assessment Date|Captured|Report Date|Date)\s*[:\-]?\s*([0-9]{4}[\-\/][0-9]{2}[\-\/][0-9]{2})/i;
const REGION_RE = /\b(EU|US|APAC)\b/;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

export function extractIdentity(text: string): SourceIdentity {
  const name = NAME_RE.exec(text)?.[1]?.trim() ?? "Unknown Candidate";
  const email = EMAIL_RE.exec(text)?.[1]?.toLowerCase();
  const dobRaw = DOB_RE.exec(text)?.[1];
  const nationalIdHash = NATID_RE.exec(text)?.[1];
  const dob = dobRaw ? normalizeDate(dobRaw) : undefined;

  const identity: SourceIdentity = { name };
  if (email) identity.email = email;
  if (dob) identity.dob = dob;
  if (nationalIdHash) identity.nationalIdHash = nationalIdHash;
  return identity;
}

export function extractCapturedAt(text: string): string {
  const direct = CAPTURED_RE.exec(text)?.[1];
  if (direct) {
    const iso = normalizeDate(direct);
    if (iso) return iso;
  }
  return new Date().toISOString();
}

export function extractRegion(text: string, fallback: Region = "US"): Region {
  const hit = REGION_RE.exec(text)?.[1];
  if (hit === "EU" || hit === "US" || hit === "APAC") return hit;
  return fallback;
}

export function generateReportId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix.toLowerCase()}-${Date.now().toString(36)}-${rnd}`;
}

function normalizeDate(input: string): string | undefined {
  const trimmed = input.trim();
  const isoMatch = /^([0-9]{4})[\-\/]([0-9]{1,2})[\-\/]([0-9]{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dmyMatch = /^([0-9]{1,2})[\-\/\.\s]([A-Za-z0-9]{1,9})[\-\/\.\s]([0-9]{2,4})$/.exec(trimmed);
  if (dmyMatch) {
    const [, dStr, mStr, yStr] = dmyMatch;
    const day = Number(dStr);
    const monthIdx = /^\d+$/.test(mStr) ? Number(mStr) - 1 : MONTHS[mStr.toLowerCase().slice(0, 4)] ?? MONTHS[mStr.toLowerCase().slice(0, 3)];
    if (monthIdx === undefined || Number.isNaN(monthIdx)) return undefined;
    const yearNum = Number(yStr);
    const year = yearNum < 100 ? 2000 + yearNum : yearNum;
    const iso = new Date(Date.UTC(year, monthIdx, day));
    if (Number.isNaN(iso.getTime())) return undefined;
    return iso.toISOString().slice(0, 10);
  }
  return undefined;
}

export function camelCase(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}
