import { NextResponse } from "next/server";

import { detectAndParse, ExtractionError, getStrategy } from "@/lib/extractors";
import {
  computeAllComposites,
  computeConfidence,
  normalizeReport,
} from "@/lib/inference";
import type { SourceSystem } from "@/types/domain";
import type { IngestErrorResponse, IngestResponse } from "@/types/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set<SourceSystem>(["OPQ32", "VerifyG", "AMCAT"]);

function isSourceSystem(value: string | null): value is SourceSystem {
  return !!value && VALID_SOURCES.has(value as SourceSystem);
}

export async function POST(request: Request): Promise<NextResponse<IngestResponse | IngestErrorResponse>> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const hintRaw = formData.get("source");
  const hint = typeof hintRaw === "string" && isSourceSystem(hintRaw) ? hintRaw : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }

  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    // Dynamic import: pdf-parse references a sample PDF at module-load time
    // when its `module.parent` is null, which breaks at build time.
    type PdfParseFn = (
      buf: Buffer,
    ) => Promise<{ text: string; numpages: number; info: unknown }>;
    const mod = (await import("pdf-parse/lib/pdf-parse.js")) as unknown as
      | PdfParseFn
      | { default: PdfParseFn };
    const pdfParse: PdfParseFn = typeof mod === "function" ? mod : mod.default;
    const parsed = await pdfParse(buf);
    text = parsed.text ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF parse failed";
    return NextResponse.json({ error: `PDF parse failed: ${message}` }, { status: 422 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "No extractable text in PDF" }, { status: 422 });
  }

  let rawReport;
  try {
    rawReport = hint ? getStrategy(hint).parse(text) : detectAndParse(text);
  } catch (err) {
    if (err instanceof ExtractionError) {
      return NextResponse.json(
        { error: err.message, source: err.source === "unknown" ? undefined : err.source },
        { status: 422 },
      );
    }
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const constructs = normalizeReport(rawReport);
  const composites = computeAllComposites(constructs);
  const confidence = computeConfidence(constructs);

  const payload: IngestResponse = {
    source: rawReport.source,
    rawReport,
    constructs,
    composites,
    confidence,
  };

  return NextResponse.json(payload, { status: 200 });
}
