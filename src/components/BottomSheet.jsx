import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

export default function BottomSheet({ open, onClose, title, children }) {
  const [mounted, setMounted] = useState(open);
  const scrimRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return;
    if (open) {
      gsap.fromTo(scrimRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(panelRef.current, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "power3.out" });
      panelRef.current.focus();
    } else {
      gsap.to(scrimRef.current, { opacity: 0, duration: 0.2 });
      gsap.to(panelRef.current, {
        yPercent: 100,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => setMounted(false),
      });
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div ref={scrimRef} className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="pb-safe absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-[440px] overflow-y-auto rounded-t-[28px] bg-surface outline-none"
      >
        <div className="mx-auto mb-2 mt-3 h-1 w-8 rounded-full bg-subtle/60" />
        {title ? <h2 className="px-6 pb-2 pt-2 font-display text-[22px] text-ink">{title}</h2> : null}
        <div className="pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
