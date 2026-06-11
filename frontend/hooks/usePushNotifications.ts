"use client";

import { useState, useEffect } from "react";
import { env } from "@/lib/env";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Check for existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setSubscription(sub);
        setLoading(false);
      });
    });
  }, []);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      setSubscription(sub);
      return sub;
    }

    return null;
  };

  return { permission, subscription, loading, requestPermission };
}
