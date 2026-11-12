"use client";

import { CopyButton } from "@/components/admin/CopyButton";
import { Input } from "@once-ui-system/core";
import { useEffect, useState } from "react";
import styles from "../../admin.module.scss";

const PLACEMENTS = [
  {
    medium: "bio",
    name: "Bio link",
    hint: "Profile → Edit profile → Links",
    color: "var(--series-1)",
    campaign: false,
  },
  {
    medium: "story",
    name: "Story",
    hint: "Add it with the Link sticker",
    color: "var(--series-2)",
    campaign: true,
  },
  {
    medium: "post",
    name: "Post / Reel",
    hint: "Captions, Reels and comments",
    color: "var(--series-3)",
    campaign: true,
  },
  {
    medium: "dm",
    name: "Direct message",
    hint: "Send it in a DM",
    color: "var(--series-4)",
    campaign: true,
  },
];

/** Short address that forwards to the tagged bio link. Set up in next.config.mjs. */
const SHORT_BIO_PATH = "/dk";

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function LinkBuilder({ pages, defaultBase }: { pages: string[]; defaultBase: string }) {
  const [base, setBase] = useState(defaultBase);
  const [path, setPath] = useState("/");
  const [campaign, setCampaign] = useState("");

  // Use the address the dashboard is open on, unless a fixed one was configured.
  useEffect(() => {
    if (!defaultBase) setBase(window.location.origin);
  }, [defaultBase]);

  const slug = slugify(campaign);
  const shortBio = `${base.replace(/\/+$/, "")}${SHORT_BIO_PATH}`;

  const build = (medium: string, withCampaign: boolean) => {
    try {
      const url = new URL(path.startsWith("/") ? path : `/${path}`, base || "https://example.com");
      url.searchParams.set("utm_source", "instagram");
      url.searchParams.set("utm_medium", medium);
      if (withCampaign && slug) url.searchParams.set("utm_campaign", slug);
      return url.toString();
    } catch {
      return "Enter a valid website address above";
    }
  };

  return (
    <>
      <div className={styles.formGrid}>
        <Input
          id="link-base"
          label="Website address"
          value={base}
          onChange={(e) => setBase(e.target.value.trim())}
          description="Your domain, starting with https://"
        />
        <Input
          id="link-path"
          label="Page to open"
          value={path}
          onChange={(e) => setPath(e.target.value.trim() || "/")}
          list="link-pages"
          description="/ is the home page"
        />
        <datalist id="link-pages">
          {pages.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className={styles.full}>
          <Input
            id="link-campaign"
            label="Campaign name (optional)"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            description={
              slug
                ? `Added to story, post and DM links as “${slug}”`
                : "For example “black friday”. Lets you compare one story or post against another."
            }
          />
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className={styles.linkRow}>
          <div className={styles.cellStack}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <span className={styles.swatch} style={{ background: "var(--series-1)" }} />
              Bio link, short
            </span>
            <small>Opens the home page and counts as the bio link</small>
          </div>
          <div className={styles.linkUrl}>{shortBio}</div>
          <CopyButton text={shortBio} />
        </div>
        {PLACEMENTS.map((p) => {
          const url = build(p.medium, p.campaign);
          return (
            <div key={p.medium} className={styles.linkRow}>
              <div className={styles.cellStack}>
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}
                >
                  <span className={styles.swatch} style={{ background: p.color }} />
                  {p.name}
                </span>
                <small>{p.hint}</small>
              </div>
              <div className={styles.linkUrl}>{url}</div>
              <CopyButton text={url} />
            </div>
          );
        })}
      </div>
    </>
  );
}
