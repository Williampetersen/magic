"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = { src: string; alt: string };

function useCountUp(to: number, durationMs = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);

  return value;
}

export default function CrossMarquee() {
  const items: Item[] = useMemo(
    () => [
      { src: "/images/cross/ads.png", alt: "Google Ads" },
      { src: "/images/cross/email.png", alt: "Email Marketing" },
      { src: "/images/cross/meta.png", alt: "Meta Ads" },
      { src: "/images/cross/SEO.png", alt: "SEO Optimization" },
    ],
    []
  );

  const helped = useCountUp(75, 1500);
  const REPEAT = 10;

  const firstGroupRef = useRef<HTMLDivElement | null>(null);
  const marqueeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const apply = () => {
      if (!firstGroupRef.current || !marqueeRef.current) return;

      // One full group width = items + spacer
      const groupWidth = firstGroupRef.current.offsetWidth;

      // Start in the middle of the group
      const startX = -groupWidth / 2;

      // Move exactly one group width for a perfect seamless loop
      const endX = startX - groupWidth;

      marqueeRef.current.style.setProperty("--cross-start", `${startX}px`);
      marqueeRef.current.style.setProperty("--cross-end", `${endX}px`);
    };

    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return (
    <section
      className="crossSection"
      aria-label="Tools we use to grow your business"
    >
      {/* Centered title + text + stat */}
      <div className="crossHeader center">
        <div className="crossHeaderText">
          <h2 className="crossTitle">Tools We Use to Grow Your Business</h2>
          <p className="crossDesc">
            Over <strong>10+ years</strong> of experience delivering
            performance-focused marketing with measurable, real-world results.
          </p>

          <div className="crossStat center">
            <span className="crossDot" aria-hidden="true" />
            <span className="crossStatNumber">{helped}</span>
            <span className="crossStatLabel">companies helped</span>
          </div>
        </div>
      </div>

      {/* Marquee */}
      <div className="crossMarquee cinematicGlow" ref={marqueeRef}>
        <div className="crossTrack">
          {Array.from({ length: REPEAT }).map((_, groupIndex) => (
            <div
              className="crossGroup"
              key={groupIndex}
              ref={groupIndex === 0 ? firstGroupRef : undefined}
            >
              {items.map((item, itemIndex) => (
                <div className="crossCard" key={`${groupIndex}-${itemIndex}`}>
                  <img className="crossLogo" src={item.src} alt={item.alt} />
                  <span className="crossLabel">{item.alt}</span>
                </div>
              ))}

              {/* Spacer only between loops (≈ 2 cards space) */}
              {groupIndex !== REPEAT - 1 && (
                <div className="crossLoopSpacer" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        <div className="crossFade crossFadeLeft" aria-hidden="true" />
        <div className="crossFade crossFadeRight" aria-hidden="true" />
      </div>
    </section>
  );
}
