"use client";

import { useState, useEffect } from "react";
import { verificationApi } from "@/lib/api/verification";
import type { VerificationRecord } from "@/types";

export function useVerification() {
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await verificationApi.getStatus();
      if (data) setRecord(data);
      setLoading(false);
    };

    fetchStatus();
  }, []);

  const submitDocument = async (formData: FormData) => {
    const { data, error } = await verificationApi.submitDocument(formData);
    if (data) setRecord(data);
    return { data, error };
  };

  return { record, loading, submitDocument };
}
