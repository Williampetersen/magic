"use client";

import { type ReactNode, useEffect } from "react";

/** Submit button that asks "are you sure?" first. Use inside a <form>. */
export function ConfirmSubmit({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Scrolls one visit into view when the page was opened for that visit. */
export function ScrollIntoView({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [targetId]);
  return null;
}
