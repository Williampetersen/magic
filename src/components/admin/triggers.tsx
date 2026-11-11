import type { IconType } from "react-icons";
import {
  LuChartBar,
  LuCircleCheck,
  LuCircleMinus,
  LuCircleX,
  LuClipboardList,
  LuClock,
  LuExternalLink,
  LuFlame,
  LuMail,
  LuMousePointerClick,
  LuPenLine,
  LuPhone,
  LuRepeat,
  LuSend,
  LuTarget,
  LuUserPlus,
} from "react-icons/lu";
import { Badge } from "./ui";

export const TRIGGERS: Record<string, { label: string; icon: IconType }> = {
  new_visitor: { label: "New visitor", icon: LuUserPlus },
  returning_visitor: { label: "Returning visitor", icon: LuRepeat },
  high_interest: { label: "High interest", icon: LuFlame },
  form_abandoned: { label: "Form abandoned", icon: LuPenLine },
  form_submitted: { label: "New lead", icon: LuCircleCheck },
  session_summary: { label: "Visit summary", icon: LuClipboardList },
  daily_digest: { label: "Daily digest", icon: LuChartBar },
  test: { label: "Test email", icon: LuSend },
};

export function TriggerBadge({ type }: { type: string }) {
  const trigger = TRIGGERS[type];
  const Icon = trigger?.icon ?? LuMail;
  return <Badge icon={<Icon aria-hidden />}>{trigger?.label ?? type}</Badge>;
}

export function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  if (status === "sent") {
    return (
      <Badge tone="good" icon={<LuCircleCheck aria-hidden />}>
        Sent
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge tone="bad" icon={<LuCircleX aria-hidden />} title={error || undefined}>
        Failed
      </Badge>
    );
  }
  if (status === "skipped") {
    return (
      <Badge tone="warn" icon={<LuCircleMinus aria-hidden />} title={error || undefined}>
        Not sent
      </Badge>
    );
  }
  return <Badge icon={<LuClock aria-hidden />}>Sending</Badge>;
}

export const EVENT_ICONS: Record<string, IconType> = {
  click_cta: LuMousePointerClick,
  click_link: LuMousePointerClick,
  click_pricing_plan: LuTarget,
  click_email: LuMail,
  click_phone: LuPhone,
  click_social: LuExternalLink,
  outbound_link: LuExternalLink,
  form_start: LuPenLine,
  form_submit: LuCircleCheck,
};
