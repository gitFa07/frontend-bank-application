import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import LazyCoinScene from "./LazyCoinScene";
import { prefersReducedMotion } from "../lib/motion";

/** Brief launch screen (kit: "Splash screen"), shown once per browser session. */
export default function Splash({ onDone }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    // GSAP runs on requestAnimationFrame, which browsers throttle in hidden or
    // occluded windows; never leave the user stuck behind the splash.
    const fallback = setTimeout(onDone, 3200);
    const ctx = gsap.context(() => {
      gsap
        .timeline({ onComplete: onDone })
        .from(".splash-title", { y: 24, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.5)
        .from(".splash-tag", { y: 12, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.7)
        .to(ref.current, { opacity: 0, duration: 0.45, ease: "power2.in" }, 2.1);
    }, ref);
    return () => {
      clearTimeout(fallback);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-bg">
      <LazyCoinScene variant="hero" className="h-72 w-72" />
      <h1 className="splash-title mt-2 font-display text-3xl font-medium text-ink">
        Ledger <span className="text-primary">Pay</span>
      </h1>
      <p className="splash-tag mt-2 text-sm text-muted">Every rupee, accounted for.</p>
    </div>
  );
}
