"use client";

import { Button } from "@once-ui-system/core";

export function CookieSettingsButton() {
  return (
    <Button
      size="s"
      variant="secondary"
      onClick={() => window.dispatchEvent(new Event("tw:open-consent"))}
    >
      Change my cookie choice
    </Button>
  );
}
