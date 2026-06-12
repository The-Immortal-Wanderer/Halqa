"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import {
  ShieldCheck,
  FileText,
  UploadSimple,
  File,
  X,
  CaretDown,
} from "@phosphor-icons/react";
import { verificationApi } from "@/lib/api/verification";

export const dynamic = "force-dynamic";

const DOCUMENT_TYPES = [
  { value: "utility_bill", label: "Utility bill (LESCO, IESCO, SNGPL, KESC)" },
  { value: "rental_agreement", label: "Rental agreement + any ID showing this address" },
  { value: "society_card", label: "Housing society membership card" },
] as const;

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  const canSubmit = selectedType !== null && file !== null && !submitting;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        setError("File must be under 10 MB.");
        return;
      }
      setFile(f);
      setError(null);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!selectedType || !file) return;
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", selectedType);

      const res = await verificationApi.submitDocument(formData);

      if (res.error) {
        setError(res.error.message);
        return;
      }

      router.push("/verify/pending");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fileNameDisplay = file
    ? file.name.length > 24
      ? file.name.slice(0, 24) + "…"
      : file.name
    : null;

  return (
    <main className="min-h-screen bg-halqa-sand">
      <OnboardingHeader
        title="Verify your address"
        showBack
        onBack={() => router.push("/onboarding/verify")}
      />

      <div className="px-4 pt-6 pb-8">
        <p className="text-sm text-halqa-ink-mid mb-5">
          Select the document type and upload a clear photo or scan to verify
          your address.
        </p>

        {/* Document type selector */}
        <div className="space-y-2 mb-5">
          {DOCUMENT_TYPES.map((dt) => {
            const isSelected = selectedType === dt.value;
            return (
              <button
                key={dt.value}
                type="button"
                onClick={() => setSelectedType(dt.value)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left transition-all",
                  isSelected
                    ? "border-l-[3px] border-l-halqa-teal bg-halqa-teal-light border-halqa-teal/30"
                    : "border-halqa-sand-mid bg-white",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isSelected ? "bg-halqa-teal" : "bg-halqa-teal-light",
                  )}
                >
                  {isSelected ? (
                    <ShieldCheck size={18} className="text-white" />
                  ) : (
                    <FileText size={18} className="text-halqa-teal" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-halqa-teal-dark" : "text-halqa-ink",
                    )}
                  >
                    {dt.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Upload zone */}
        {file ? (
          <div className="flex items-center gap-3 rounded-lg border border-halqa-sand-mid bg-halqa-sand-mid px-4 py-3 mb-5">
            <File size={16} className="shrink-0 text-halqa-ink-mid" />
            <p className="flex-1 truncate text-sm text-halqa-ink">
              {fileNameDisplay}
            </p>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="shrink-0 text-halqa-ink-light hover:text-halqa-danger"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-halqa-sand-dark bg-white transition-colors hover:border-halqa-teal mb-5"
            style={{ height: "180px" }}
          >
            <UploadSimple size={32} className="text-halqa-ink-light" />
            <p className="mt-3 text-sm text-halqa-ink">
              Tap to upload your document
            </p>
            <p className="mt-1 text-xs text-halqa-ink-light">
              JPG, PNG, or PDF — max 5MB
            </p>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Why disclosure */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setDisclosureOpen(!disclosureOpen)}
            className="flex items-center gap-1 text-xs text-halqa-teal"
          >
            <CaretDown
              size={12}
              className={cn(
                "transition-transform",
                disclosureOpen && "rotate-180",
              )}
            />
            Why do we need this?
          </button>
          {disclosureOpen && (
            <p className="mt-2 text-xs text-halqa-ink-mid leading-relaxed">
              We verify that you actually live in this neighborhood. Your
              document is reviewed once and not stored after verification is
              complete.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-md bg-halqa-danger-bg px-3 py-2 text-sm text-halqa-danger">
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-md bg-halqa-teal px-4 py-3 text-sm font-semibold text-white hover:bg-halqa-teal-dark disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? "Submitting..." : "Submit for verification"}
        </button>
      </div>
    </main>
  );
}
