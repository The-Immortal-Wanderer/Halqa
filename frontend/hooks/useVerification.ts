"use client";

import { useState, useEffect } from "react";
import { verificationApi } from "@/lib/api/verification";
import type { VerificationStatusData, VerificationSubmitResponse } from "@/types";

export function useVerification() {
  const [statusData, setStatusData] = useState<VerificationStatusData | null>(null);
  const [lastSubmit, setLastSubmit] = useState<VerificationSubmitResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await verificationApi.getStatus();
      if (data) setStatusData(data);
      setLoading(false);
    };

    fetchStatus();
  }, []);

  const submitDocument = async (formData: FormData) => {
    const { data, error } = await verificationApi.submitDocument(formData);
    if (data) setLastSubmit(data);
    return { data, error };
  };

  return { statusData, lastSubmit, loading, submitDocument };
}
