"use client";

import type { SettingKey, Settings } from "@/lib/tracking/settings";
import { Button, Input, Switch, useToast } from "@once-ui-system/core";
import { useState, useTransition } from "react";
import { saveSettingsAction, sendTestEmailAction } from "../../actions";
import styles from "../../admin.module.scss";

const TRIGGERS: { key: SettingKey; title: string; description: string }[] = [
  {
    key: "trigger_new_visitor",
    title: "New Instagram visitor",
    description: "Sent right away when someone opens your site from Instagram for the first time.",
  },
  {
    key: "trigger_returning_visitor",
    title: "Returning Instagram visitor",
    description:
      "Sent when the same person comes back, with the number of visits and the last one.",
  },
  {
    key: "trigger_high_interest",
    title: "High interest",
    description:
      "Sent once per visit when someone views several pages, stays a while, or opens a pricing page.",
  },
  {
    key: "trigger_form_abandoned",
    title: "Contact form started but not sent",
    description: "Sent when the visit ends and the form was started but never submitted.",
  },
  {
    key: "trigger_form_submitted",
    title: "Hot lead details",
    description:
      "Adds source, location, device and viewed pages to the “New lead” email. That email itself is always sent.",
  },
  {
    key: "trigger_session_summary",
    title: "Visit summary",
    description: "Sent when a visit ends, with every page, time spent, scroll depth and click.",
  },
  {
    key: "trigger_daily_digest",
    title: "Daily digest",
    description: "Sent at 08:00 Copenhagen time with yesterday’s Instagram visitors.",
  },
];

export function SettingsForm({
  initial,
  defaultEmail,
}: { initial: Settings; defaultEmail: string }) {
  const [values, setValues] = useState<Settings>(initial);
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();
  const { addToast } = useToast();

  const set = (key: SettingKey, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const field = (key: SettingKey) => ({
    id: key,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
  });

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startSaving(async () => {
      const result = await saveSettingsAction(values);
      addToast({ variant: result.ok ? "success" : "danger", message: result.message });
    });
  };

  const sendTest = () =>
    startTesting(async () => {
      const result = await sendTestEmailAction();
      addToast({ variant: result.ok ? "success" : "danger", message: result.message });
    });

  return (
    <form onSubmit={save} className={styles.formStack}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.cardTitle}>Email alerts</h2>
            <p className={styles.cardDesc}>Only visitors who come from Instagram cause emails.</p>
          </div>
        </div>
        <div className={styles.cardBody}>
          {TRIGGERS.map((t) => (
            <div key={t.key} className={styles.switchRow}>
              <div className={styles.switchText}>
                <span className={styles.switchTitle}>{t.title}</span>
                <span className={styles.switchDesc}>{t.description}</span>
              </div>
              <Switch
                isChecked={values[t.key] === "true"}
                onToggle={() => set(t.key, values[t.key] === "true" ? "false" : "true")}
                ariaLabel={t.title}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.cardTitle}>Thresholds</h2>
            <p className={styles.cardDesc}>
              When a visit counts as “high interest”, and email limits.
            </p>
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formGrid}>
            <Input
              {...field("high_interest_pages")}
              type="number"
              min={1}
              max={50}
              label="High interest: pages viewed"
              description="A visit with this many pages or more"
            />
            <Input
              {...field("high_interest_seconds")}
              type="number"
              min={10}
              max={3600}
              label="High interest: seconds on site"
              description="120 seconds is 2 minutes"
            />
            <div className={styles.full}>
              <Input
                {...field("pricing_paths")}
                label="Pricing pages"
                description="Opening one of these pages counts as high interest. Separate with commas, for example /price, /web-design"
              />
            </div>
            <Input
              {...field("arrival_rate_limit_minutes")}
              type="number"
              min={0}
              max={1440}
              label="Minutes between arrival emails"
              description="At most one new or returning visitor email per person in this time"
            />
            <Input
              {...field("max_emails_per_hour")}
              type="number"
              min={1}
              max={500}
              label="Most alert emails per hour"
              description="A safety limit so you are never flooded. Leads and the daily digest are always sent."
            />
            <div className={styles.full}>
              <Input
                {...field("session_timeout_minutes")}
                type="number"
                min={5}
                max={120}
                label="Minutes of no activity that end a visit"
                description="The visit summary is sent when the visitor closes the page, or after this many minutes without activity"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.cardTitle}>Delivery and data</h2>
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formGrid}>
            <Input
              {...field("alert_email_to")}
              type="email"
              label="Notification email address"
              description={`Leave empty to use ${defaultEmail}`}
            />
            <Input
              {...field("retention_days")}
              type="number"
              min={7}
              max={730}
              label="Days to keep tracking data"
              description="Older visits are deleted every day. Your privacy page shows this number."
            />
          </div>
        </div>
      </section>

      <div className={styles.formFoot}>
        <Button type="submit" variant="primary" size="m" loading={saving} disabled={saving}>
          Save settings
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="m"
          onClick={sendTest}
          loading={testing}
          disabled={testing}
        >
          Send test email
        </Button>
      </div>
    </form>
  );
}
