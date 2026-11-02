import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "../lib/motion";

const TONES = {
  success: { fill: "var(--primary)", glyph: "check" },
  pending: { fill: "var(--warn)", glyph: "clock" },
  error: { fill: "var(--danger)", glyph: "cross" },
  neutral: { fill: "var(--subtle)", glyph: "info" },
};

const BURST_COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853"];

function Glyph({ type }) {
  const common = { fill: "none", stroke: "var(--bg)", strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "check") return <path className="glyph" d="M34 52 L46 64 L68 40" {...common} />;
  if (type === "cross") return <path className="glyph" d="M38 38 L62 62 M62 38 L38 62" {...common} />;
  if (type === "clock") return <path className="glyph" d="M50 32 L50 52 L62 60" {...common} />;
  return <path className="glyph" d="M50 46 L50 66 M50 34 L50 35" {...common} />;
}

/** Animated status circle used on the payment result and receipt screens. */
export default function ResultBadge({ tone = "success", size = 120, animate = true }) {
  const ref = useRef(null);
  const { fill, glyph } = TONES[tone];

  useLayoutEffect(() => {
    if (!animate || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const glyphEl = ref.current.querySelector(".glyph");
      const length = glyphEl.getTotalLength();
      const tl = gsap.timeline();
      tl.from(".disc", { scale: 0, transformOrigin: "50% 50%", duration: 0.55, ease: "back.out(1.8)" })
        .fromTo(glyphEl, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, "-=0.15")
        .fromTo(
          ".ring",
          { scale: 1, opacity: 0.45, transformOrigin: "50% 50%" },
          { scale: 1.9, opacity: 0, duration: 1.2, ease: "power2.out", stagger: 0.25 },
          "-=0.35",
        );
      if (tone === "success") {
        tl.fromTo(
          ".dot",
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: (i) => Math.cos((i / 12) * Math.PI * 2) * 78,
            y: (i) => Math.sin((i / 12) * Math.PI * 2) * 78,
            opacity: 0,
            scale: 0.4,
            duration: 0.9,
            ease: "power3.out",
          },
          "<",
        );
      }
    }, ref);
    return () => ctx.revert();
  }, [tone, animate]);

  return (
    <svg ref={ref} viewBox="-30 -30 160 160" width={size * 1.6} height={size * 1.6} aria-hidden="true" className="overflow-visible">
      <circle className="ring" cx="50" cy="50" r="40" fill={fill} opacity="0" />
      <circle className="ring" cx="50" cy="50" r="40" fill={fill} opacity="0" />
      {tone === "success"
        ? Array.from({ length: 12 }, (_, i) => (
            <circle key={i} className="dot" cx="50" cy="50" r="3.5" fill={BURST_COLORS[i % 4]} opacity="0" />
          ))
        : null}
      <circle className="disc" cx="50" cy="50" r="40" fill={fill} />
      <Glyph type={glyph} />
    </svg>
  );
}
