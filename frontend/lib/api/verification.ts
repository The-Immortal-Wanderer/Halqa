import { apiUpload, apiFetch } from "@/lib/api/client";
import type { VerificationRecord } from "@/types";

export const verificationApi = {
  submitDocument: (formData: FormData) =>
    apiUpload<VerificationRecord>("/verification/documents", formData),

  getStatus: () => apiFetch<VerificationRecord>("/verification/status"),
};
