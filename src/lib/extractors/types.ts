import type { RawReport, SourceSystem } from "@/types/domain";

export interface ParseStrategy<T extends RawReport = RawReport> {
  readonly source: SourceSystem;
  canParse(text: string): boolean;
  parse(text: string): T;
}

export class ExtractionError extends Error {
  readonly source: SourceSystem | "unknown";
  constructor(source: SourceSystem | "unknown", message: string) {
    super(message);
    this.name = "ExtractionError";
    this.source = source;
  }
}
