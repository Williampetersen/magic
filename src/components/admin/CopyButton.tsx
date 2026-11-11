"use client";

import styles from "@/app/admin/admin.module.scss";
import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and non-secure pages
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" className={`${styles.btn} ${styles.btnSmall}`} onClick={copy}>
      {copied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}
