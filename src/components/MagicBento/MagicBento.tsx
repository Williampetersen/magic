"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import gsap from "gsap";
import "./MagicBento.css";

const DEFAULT_SPOTLIGHT_RADIUS = 380;

const cardData = [
  { title: "Ads", description: "High-performing ad campaigns", label: "Growth" },
  { title: "SEO", description: "Rank higher and convert more", label: "Search" },
  { title: "Email", description: "Automations that sell", label: "Retention" },
  { title: "Analytics", description: "Track and optimize performance", label: "Insights" },
];

export default function MagicBento({
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
}: {
  spotlightRadius?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || isMobile) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gsap.to(containerRef.current, {
        "--x": `${x}px`,
        "--y": `${y}px`,
        duration: 0.25,
        ease: "power2.out",
      });
    },
    [isMobile]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <section className="mbSection">
      <div
        ref={containerRef}
        className="magicBento"
        style={{ ["--spotlight-radius" as any]: `${spotlightRadius}px` }}
      >
        {cardData.map((card, i) => (
          <article className="magicCard" key={i}>
            <div className="magicTop">
              <span className="magicLabel">{card.label}</span>
            </div>
            <h3 className="magicTitle">{card.title}</h3>
            <p className="magicDesc">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
