import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const listeners = new Set();
let nextId = 1;

/** Shows a Material snackbar. tone: "default" | "error" */
export function toast(message, { tone = "default" } = {}) {
  const item = { id: nextId++, message, tone };
  listeners.forEach((fn) => fn(item));
}

function Snackbar({ item, onDone }) {
  const ref = useRef(null);

  useEffect(() => {
    const tl = gsap
      .timeline({ onComplete: onDone })
      .from(ref.current, { y: 24, opacity: 0, duration: 0.3, ease: "power3.out" })
      .to(ref.current, { y: 12, opacity: 0, duration: 0.25, ease: "power2.in", delay: 3.2 });
    return () => tl.kill();
    // onDone changes every render; the timeline should only start once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      role={item.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto mx-auto w-full max-w-[400px] rounded-lg px-4 py-3.5 text-sm shadow-lg ${
        item.tone === "error" ? "bg-danger-tonal text-ink" : "bg-ink text-bg"
      }`}
    >
      {item.message}
    </div>
  );
}

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const add = (item) => setItems((prev) => [...prev.slice(-2), item]);
    listeners.add(add);
    return () => listeners.delete(add);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col gap-2 px-4" aria-live="polite">
      {items.map((item) => (
        <Snackbar
          key={item.id}
          item={item}
          onDone={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
        />
      ))}
    </div>
  );
}
