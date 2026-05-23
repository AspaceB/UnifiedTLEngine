"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";

import type { SourceSystem } from "@/types/domain";

type SourceState =
  | { status: "idle" }
  | { status: "processing"; fileName: string }
  | { status: "ready"; fileName: string; constructs: unknown[]; composites: unknown[] }
  | { status: "error"; fileName: string; message: string };

interface Meta {
  title: string;
  subtitle: string;
  hint: string;
  accent: string;
}

interface Props {
  source: SourceSystem;
  meta: Meta;
  state: SourceState;
  onFile: (file: File) => void;
  onReset: () => void;
}

export function SourceDropzone({ source, meta, state, onFile, onReset }: Props) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) return;
      const file = accepted[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    disabled: state.status === "processing",
  });

  const borderClass = isDragReject
    ? "border-red-400 bg-red-50/60"
    : isDragActive
      ? "border-accent-500 bg-accent-50/60"
      : state.status === "error"
        ? "border-red-300"
        : state.status === "ready"
          ? "border-emerald-300"
          : "border-ink-200";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${borderClass} bg-white/80 p-5 shadow-sm backdrop-blur transition-colors`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${meta.accent}`} />
      <div className="relative">
        <header className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">{meta.title}</h3>
            <p className="text-[11px] text-ink-600">{meta.subtitle}</p>
          </div>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-ink-600 ring-1 ring-ink-200">
            {source}
          </span>
        </header>

        {state.status === "idle" || state.status === "error" ? (
          <div
            {...getRootProps()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white/60 p-6 text-center transition hover:border-accent-500 hover:bg-accent-50/40"
          >
            <input {...getInputProps()} />
            <UploadCloud size={20} className="mb-2 text-ink-400" />
            <p className="text-xs font-medium text-ink-800">
              {isDragActive ? "Drop the PDF…" : "Drop a PDF or click to browse"}
            </p>
            <p className="mt-1 text-[10px] text-ink-600">.pdf · one file</p>
            <p className="mt-2 max-w-[260px] text-[10px] leading-snug text-ink-400">
              {meta.hint}
            </p>
          </div>
        ) : null}

        {state.status === "processing" ? (
          <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white/60 p-4">
            <Loader2 size={18} className="animate-spin text-accent-600" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-800">{state.fileName}</p>
              <p className="text-[10px] text-ink-600">Extracting & normalising…</p>
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink-800">{state.fileName}</p>
                <p className="text-[10px] text-emerald-700">
                  {state.constructs.length} constructs normalised · feeding inference
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="ml-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-ink-600 ring-1 ring-ink-200 hover:bg-white"
            >
              <X size={12} /> Clear
            </button>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
            <div className="min-w-0 text-[11px] leading-snug text-red-700">
              <p className="font-medium">Could not process {state.fileName}</p>
              <p className="mt-1 whitespace-pre-wrap break-words opacity-80">{state.message}</p>
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-600">
            <FileText size={12} />
            <span>Provenance recorded · {source} · advisory only</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
