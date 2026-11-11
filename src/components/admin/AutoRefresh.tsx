"use client";

import styles from "@/app/admin/admin.module.scss";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Reloads the page data on a timer. The screen keeps its content while it loads. */
export function AutoRefresh({ seconds = 30, label }: { seconds?: number; label?: string }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  return (
    <span className={styles.live}>
      <span className={styles.liveDot} aria-hidden />
      {label ?? `Live · updates every ${seconds}s`}
    </span>
  );
}
