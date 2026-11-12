"use client";

import { Button, Column, Row, SmartLink, Text } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./Tracker.module.scss";

const CONSENT_KEY = "tw_consent";
const ENDPOINT = "/api/track";
export const OPEN_CONSENT_EVENT = "tw:open-consent";

type Consent = "accepted" | "rejected" | "unset";

type Page = {
  pv: string;
  path: string;
  sent: boolean;
  /** Settles when the server has answered the pageview (and given us the IDs). */
  ready: Promise<unknown> | null;
  activeMs: number;
  visibleSince: number | null;
  maxScroll: number;
  timer: ReturnType<typeof setTimeout> | null;
};

type Reply = { expired?: boolean; sid?: string; vid?: string };

// Kept in memory only (no storage) for the life of the page load: where the
// visitor came from, and the IDs of the running visit. Visitors who have not
// accepted cookies are followed with these alone, so nothing is saved on
// their device. A full reload forgets them.
let firstSearch: string | null = null;
let firstReferrer: string | null = null;
let visitId: string | null = null;
let visitorId: string | null = null;

function readConsent(): Consent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : "unset";
  } catch {
    return "unset";
  }
}

function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(
      16,
    ),
  );
}

function post(data: Record<string, unknown>, beacon = false): Promise<Reply | null> {
  const payload = JSON.stringify({ ...data, sid: visitId, vid: visitorId });
  if (beacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }));
    return Promise.resolve(null);
  }
  return fetch(ENDPOINT, {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "text/plain" },
  })
    .then((res) => (res.status === 200 ? res.json() : null))
    .catch(() => null);
}

function scrollPercent() {
  const total = document.documentElement.scrollHeight;
  if (!total) return 0;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
}

const SOCIAL_HOSTS =
  /(^|\.)(instagram|facebook|linkedin|github|twitter|x|threads|tiktok|youtube|discord|wa|whatsapp)\.(com|net|me|gg)$/i;

function describeClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const el = target.closest("a, button, [role='button'], [data-track]");
  if (!el || el.closest("[data-no-track]")) return null;

  const text = (
    el.getAttribute("data-track") ||
    el.getAttribute("aria-label") ||
    el.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const href = el instanceof HTMLAnchorElement ? el.href : "";

  if (href.startsWith("mailto:")) return { type: "click_email", label: text || href.slice(7) };
  if (href.startsWith("tel:")) return { type: "click_phone", label: text || href.slice(4) };

  if (href.startsWith("http")) {
    const url = new URL(href);
    if (url.host !== window.location.host) {
      const host = url.hostname.replace(/^www\./, "");
      return {
        type: SOCIAL_HOSTS.test(host) ? "click_social" : "outbound_link",
        label: text ? `${text} (${host})` : host,
      };
    }
  }

  // A click inside a plan card of a pricing section.
  const card = el.closest("article");
  const pricing = card?.closest("[class*='pricing' i], section[aria-label*='pricing' i]");
  if (card && pricing) {
    // The plan name is the card's heading, or else its first line of text.
    const heading = card.querySelector("h1, h2, h3, h4")?.textContent;
    const firstLine = (card as HTMLElement).innerText?.split("\n").find((line) => line.trim());
    const plan = (heading || firstLine || "").replace(/\s+/g, " ").trim().slice(0, 60);
    const section = pricing.getAttribute("aria-label");
    return {
      type: "click_pricing_plan",
      label: [section ? `${section}: ${plan}` : plan, plan === text ? "" : text]
        .filter(Boolean)
        .join(" – ")
        .slice(0, 160),
    };
  }

  if (!text) return null;
  const isButton = el.tagName === "BUTTON" || /button/i.test(el.className?.toString() || "");
  return {
    type: isButton ? "click_cta" : "click_link",
    label: href ? `${text} → ${new URL(href).pathname}` : text,
  };
}

export function Tracker() {
  const pathname = usePathname() ?? "/";
  const isAdmin = pathname.startsWith("/admin");
  const [consent, setConsent] = useState<Consent | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const page = useRef<Page | null>(null);
  const formStarted = useRef(false);
  // Read when a request is sent, so pressing Accept does not restart the page.
  const cookiesAllowed = useRef(false);
  cookiesAllowed.current = consent === "accepted";
  const ready = consent !== null;

  // Read the saved choice once the page is in the browser.
  useEffect(() => {
    if (firstSearch === null) {
      firstSearch = window.location.search;
      firstReferrer = document.referrer;
    }
    const saved = readConsent();
    setConsent(saved);
    setBannerOpen(saved === "unset");
    const reopen = () => setBannerOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  // Every visitor: one pageview per route. Cookies are only used after Accept
  // (c: 1); without it the visit is followed with the IDs kept in memory.
  useEffect(() => {
    if (!ready || isAdmin) return;

    const c = () => (cookiesAllowed.current ? 1 : 0);

    const elapsed = (p: Page) =>
      Math.round((p.activeMs + (p.visibleSince ? Date.now() - p.visibleSince : 0)) / 1000);

    const sendPageview = (p: Page) => {
      if (p.sent) return;
      p.sent = true;
      const nav = navigator as Navigator & {
        connection?: { effectiveType?: string; type?: string };
      };
      p.ready = post({
        t: "pv",
        c: c(),
        pv: p.pv,
        path: p.path,
        title: document.title,
        search: firstSearch,
        referrer: firstReferrer,
        lang: navigator.language,
        sw: window.screen.width,
        sh: window.screen.height,
        vw: window.innerWidth,
        vh: window.innerHeight,
        conn: nav.connection?.type || nav.connection?.effectiveType || null,
      }).then((res) => {
        if (res?.sid && res.vid) {
          visitId = res.sid;
          visitorId = res.vid;
        }
      });
    };

    const startPage = () => {
      const p: Page = {
        pv: uuid(),
        path: pathname,
        sent: false,
        ready: null,
        activeMs: 0,
        visibleSince: document.visibilityState === "visible" ? Date.now() : null,
        maxScroll: scrollPercent(),
        timer: null,
      };
      // Short wait so the new page title is in place.
      p.timer = setTimeout(() => sendPageview(p), 400);
      page.current = p;
    };

    const ping = (beacon: boolean, leaving = false) => {
      const p = page.current;
      if (!p) return;
      if (!p.sent) {
        if (p.timer) clearTimeout(p.timer);
        sendPageview(p);
      }
      p.maxScroll = Math.max(p.maxScroll, scrollPercent());
      const data = {
        t: "ping",
        c: c(),
        pv: p.pv,
        s: elapsed(p),
        sc: p.maxScroll,
        f: leaving ? 1 : 0,
      };
      if (beacon) {
        // The page is going away: send now, there is no time to wait.
        post(data, true);
        return;
      }
      // Wait for the pageview's answer first, so the visit IDs are known.
      (p.ready ?? Promise.resolve()).then(() =>
        post(data).then((res) => {
          // The visit timed out on the server: begin a new one on this page.
          if (res?.expired && page.current === p) {
            visitId = null;
            startPage();
          }
        }),
      );
    };

    const onScroll = () => {
      const p = page.current;
      if (p) p.maxScroll = Math.max(p.maxScroll, scrollPercent());
    };

    const onVisibility = () => {
      const p = page.current;
      if (!p) return;
      if (document.visibilityState === "hidden") {
        if (p.visibleSince) p.activeMs += Date.now() - p.visibleSince;
        p.visibleSince = null;
        ping(true);
      } else if (!p.visibleSince) {
        p.visibleSince = Date.now();
      }
    };

    // The page is being closed: tells the server the visit is probably over.
    const onPageHide = () => ping(true, true);

    // Events wait for the pageview's answer too, so they carry the visit IDs.
    const sendEvent = (data: Record<string, unknown>) => {
      const path = window.location.pathname;
      (page.current?.ready ?? Promise.resolve()).then(() =>
        post({ t: "ev", c: c(), ...data, path }),
      );
    };

    const onClick = (event: MouseEvent) => {
      const click = describeClick(event.target);
      if (click) sendEvent(click);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (formStarted.current || !(event.target instanceof Element)) return;
      if (!event.target.closest("form.contactForm")) return;
      formStarted.current = true;
      sendEvent({ type: "form_start", label: "Contact form" });
    };

    startPage();
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") ping(false);
    }, 15000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      // Leaving this page for another one: store its final time and scroll depth.
      ping(false);
      page.current = null;
      clearInterval(heartbeat);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [ready, isAdmin, pathname]);

  const choose = (choice: "accepted" | "rejected") => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Storage blocked: the choice lasts for this page load only.
    }
    // Cookies are removed again when permission is withdrawn, and set for the
    // running visit when it is given.
    if (choice === "rejected" && consent === "accepted") post({ t: "revoke" });
    if (choice === "accepted" && visitId) post({ t: "consent", c: 1 });
    setConsent(choice);
    setBannerOpen(false);
  };

  if (!bannerOpen || isAdmin) return null;

  return (
    <Column
      as="section"
      data-no-track
      className={styles.banner}
      aria-label="Cookie consent"
      background="page"
      border="neutral-alpha-medium"
      radius="l"
      shadow="l"
      padding="20"
      gap="16"
    >
      <Column gap="4">
        <Text variant="heading-strong-s">Cookies</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          This site keeps visitor statistics (pages, device, approximate location) without cookies.
          May I also set a first-party cookie to recognise your browser on your next visit? No ads,
          nothing is sold. <SmartLink href="/privacy">Privacy policy</SmartLink>
        </Text>
      </Column>
      <Row gap="8" horizontal="end" className={styles.actions}>
        <Button size="s" variant="secondary" onClick={() => choose("rejected")}>
          No cookies
        </Button>
        <Button size="s" variant="primary" onClick={() => choose("accepted")}>
          Allow cookie
        </Button>
      </Row>
    </Column>
  );
}
