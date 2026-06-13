"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => void 0);
    }
  }, []);

  return null;
}
