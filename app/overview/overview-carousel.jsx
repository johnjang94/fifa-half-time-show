"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function OverviewCarousel({ cards }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const rafRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    function updateActiveIndex() {
      const trackRect = track.getBoundingClientRect();
      const viewportCenter = trackRect.left + trackRect.width / 2;

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setActiveIndex(bestIndex);
    }

    function handleScroll() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(updateActiveIndex);
    }

    updateActiveIndex();
    track.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      track.removeEventListener("scroll", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <section className="overview-carousel" aria-label="Overview cards">
      <div className="overview-track" ref={trackRef}>
        {cards.map((card, index) => (
          <article
            aria-current={index === activeIndex ? "true" : undefined}
            className={`overview-card ${index === activeIndex ? "is-active" : ""}`}
            key={card.title}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
          >
            <div className="overview-media">
              <Image
                alt={card.alt}
                className="overview-image"
                fill
                priority={index === 0}
                sizes="(max-width: 640px) 88vw, 520px"
                src={card.src}
              />
            </div>

            <div className="overview-caption" aria-hidden="true">
              <span className="overview-caption-icon">
                {index === 0 ? "✦" : index === 1 ? "✿" : index === 2 ? "✧" : "♡"}
              </span>
              <span className="overview-caption-text">{card.caption}</span>
              <span className="overview-caption-arrow">
                {card.arrows?.left ? "←" : ""}
                {card.arrows?.right ? "→" : ""}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
