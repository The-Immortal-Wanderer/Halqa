"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DeepLinkHandler = (path: string) => void;

export function useDeepLink(handler?: DeepLinkHandler) {
  const router = useRouter();

  useEffect(() => {
    // Listen for deep link navigation from service worker
    const handleDeepLink = (event: CustomEvent) => {
      const path: string = event.detail?.path || "/";
      if (handler) {
        handler(path);
      } else {
        router.push(path);
      }
    };

    window.addEventListener(
      "halqa-deep-link",
      handleDeepLink as EventListener,
    );

    return () => {
      window.removeEventListener(
        "halqa-deep-link",
        handleDeepLink as EventListener,
      );
    };
  }, [handler, router]);
}
