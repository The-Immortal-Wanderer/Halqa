"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, File } from "@phosphor-icons/react";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function UploadZone({
  onUpload,
  accept = "image/*,.pdf",
  maxSizeMB = 10,
  className,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }
    setLoading(true);
    try {
      await onUpload(file);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
        dragging
          ? "border-halqa-teal bg-halqa-teal-light"
          : "border-halqa-sand-dark bg-white",
        className,
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {loading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-halqa-teal border-t-transparent" />
      ) : (
        <>
          <Upload size={32} className="text-halqa-ink-light" />
          <p className="mt-3 text-sm font-medium text-halqa-ink">
            Upload a document
          </p>
          <p className="mt-1 text-xs text-halqa-ink-light">
            Tap to browse or drag a file here
          </p>
        </>
      )}
      {error ? <p className="mt-2 text-xs text-halqa-danger">{error}</p> : null}
    </div>
  );
}
