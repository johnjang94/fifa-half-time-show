"use client";

import { useEffect, useRef, useState } from "react";

const steps = {
  ready: 0,
  kick: 1,
  flight: 2,
  goal: 3,
  reveal: 4,
};

export function Celebration({ onComplete }) {
  const [step, setStep] = useState(steps.ready);
  const completionTimerRef = useRef(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(steps.kick), 560),
      setTimeout(() => setStep(steps.flight), 1480),
      setTimeout(() => setStep(steps.goal), 2860),
      setTimeout(() => setStep(steps.reveal), 4120),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step !== steps.reveal || typeof onComplete !== "function") {
      return undefined;
    }

    completionTimerRef.current = window.setTimeout(() => {
      onComplete();
    }, 520);

    return undefined;
  }, [onComplete, step]);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  return (
    <section
      className={`celebration-stage step-${step}`}
      aria-label="Registration success celebration"
    >
      <div className="celebration-arena" aria-hidden="true">
        <div className={`celebration-player step-${step}`}>
          <svg viewBox="0 0 120 150" className="player-figure" role="presentation">
            <defs>
              <linearGradient id="playerKitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#d4dde9" />
              </linearGradient>
              <radialGradient id="playerHeadGradient" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#f8ddc7" />
                <stop offset="100%" stopColor="#c89d80" />
              </radialGradient>
            </defs>
            <g className="player-figure-shadow">
              <ellipse cx="56" cy="138" rx="28" ry="8" />
            </g>
            <g className="player-figure-body">
              <circle className="player-head" cx="60" cy="26" r="17" />
              <path
                className="player-arm player-arm-back"
                d="M49 49 L31 66"
              />
              <path
                className="player-arm player-arm-front"
                d="M71 49 L88 69"
              />
              <path
                className="player-torso"
                d="M48 43 Q60 37 72 43 L79 92 Q60 102 41 92 Z"
              />
              <path
                className="player-sash"
                d="M50 49 L77 88"
              />
              <path
                className="player-leg player-leg-back"
                d="M50 92 L42 132"
              />
              <path
                className="player-leg player-leg-front"
                d="M67 90 L81 127"
              />
              <path
                className="player-boot player-boot-back"
                d="M39 131 Q46 134 49 130"
              />
              <path
                className="player-boot player-boot-front"
                d="M79 129 Q88 131 91 127"
              />
            </g>
          </svg>
        </div>

        <div className={`celebration-ball step-${step}`} />

        <div className={`celebration-goal step-${step}`}>
          <div className="goal-post goal-post-left" />
          <div className="goal-post goal-post-right" />
          <div className="goal-bar goal-bar-top" />
          <div className="goal-net" />
          <div className="goal-glow" />
        </div>

        <div className={`celebration-trail step-${step}`} />
      </div>

    </section>
  );
}
