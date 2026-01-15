"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Column, Row, Text, Button, Icon } from "@once-ui-system/core";
import styles from "./PricePage.module.css";

type PricingOption = {
  title: string;
  price: string;
  description: string;
  href: string;
  icon: string;
  bestFor: string;
  timeline: string;
  highlights: string[];
};

type PricingCardsProps = {
  options: PricingOption[];
  spotlightRadius?: number;
};

export default function PricingCards({
  options,
  spotlightRadius = 360,
}: PricingCardsProps) {
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
    [isMobile],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className={styles.pricingBento}
      style={{ ["--spotlight-radius" as any]: `${spotlightRadius}px` }}
    >
      {options.map((option) => (
        <article key={option.title} className={styles.pricingCard}>
          <Row gap="12" vertical="center" className={styles.cardHeader}>
            <span className={styles.iconWrap}>
              <Icon name={option.icon} onBackground="brand-weak" />
            </span>
            <Text variant="heading-strong-m">{option.title}</Text>
          </Row>
          <Row gap="8" vertical="center" className={styles.cardBadgeRow}>
            <span className={styles.cardBadge}>Best for</span>
            <Text variant="body-default-s">{option.bestFor}</Text>
          </Row>
          <Text variant="heading-default-l" onBackground="brand-weak" className={styles.price}>
            {option.price}
          </Text>
          <Text variant="body-default-m" onBackground="neutral-weak">
            {option.description}
          </Text>
          <Row gap="16" className={styles.meta}>
            <Column gap="4">
              <Text variant="label-default-s" className={styles.metaLabel}>
                Timeline
              </Text>
              <Text variant="body-default-s">{option.timeline}</Text>
            </Column>
            <Column gap="4">
              <Text variant="label-default-s" className={styles.metaLabel}>
                Outcome
              </Text>
              <Text variant="body-default-s">Clear ROI targets</Text>
            </Column>
          </Row>
          <Column as="ul" gap="8" className={styles.list}>
            {option.highlights.map((highlight) => (
              <Text as="li" key={highlight} variant="body-default-s" className={styles.listItem}>
                {highlight}
              </Text>
            ))}
          </Column>
          <Button href={option.href} variant="secondary" arrowIcon className={styles.ctaButton}>
            View pricing details
          </Button>
        </article>
      ))}
    </div>
  );
}
