import { useLayoutEffect } from "react";
import gsap from "gsap";

gsap.config({ nullTargetWarn: false });

export function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Staggers every [data-animate] element inside `ref` in on mount. */
export function usePageEnter(ref, deps = []) {
  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-animate]", {
        y: 18,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.045,
        clearProps: "transform,opacity",
      });
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
