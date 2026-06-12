import { apiUpload, apiFetch } from "@/lib/api/client";
import type {
  VerificationSubmitResponse,
  VerificationStatusData,
  UpgradeTierResponse,
} from "@/types";

export const verificationApi = {
  submitDocument: (formData: FormData) =>
    apiUpload<VerificationSubmitResponse>(
      "/api/v1/verification/submit",
      formData,
    ),

  getStatus: () =>
    apiFetch<VerificationStatusData>("/api/v1/verification/status"),

  upgradeTier: () =>
    apiFetch<UpgradeTierResponse>("/api/v1/verification/upgrade-tier", {
      method: "PATCH",
    }),
};
