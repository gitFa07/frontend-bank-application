import { useLayoutEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router";
import gsap from "gsap";
import { useAuth } from "../context/AuthContext";
import { Avatar, Icon } from "./ui";

const TABS = [
  { to: "/home", label: "Home", icon: "home" },
  { to: "/money", label: "Money", icon: "currency_rupee" },
  { to: "/you", label: "You", icon: "person" },
];

function TabIndicator({ children }) {
  const ref = useRef(null);
  // Material 3 nav indicator grows out from the centre when a tab becomes active.
  useLayoutEffect(() => {
    gsap.fromTo(ref.current, { scaleX: 0.4, opacity: 0.4 }, { scaleX: 1, opacity: 1, duration: 0.35, ease: "power3.out" });
  }, []);
  return (
    <span ref={ref} className="absolute inset-0 rounded-full bg-tonal">
      {children}
    </span>
  );
}

function BottomNav() {
  const { user } = useAuth();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[440px] border-t border-line/60 bg-nav"
    >
      <ul className="grid h-20 grid-cols-3">
        {TABS.map((tab) => (
          <li key={tab.to} className="contents">
            <NavLink to={tab.to} className="flex flex-col items-center justify-center gap-1">
              {({ isActive }) => (
                <>
                  <span className="relative grid h-8 w-16 place-items-center">
                    {isActive ? <TabIndicator /> : null}
                    <span className={`relative ${isActive ? "text-on-tonal" : "text-muted"}`}>
                      {tab.to === "/you" && user ? (
                        <Avatar name={user.name} seed={user._id} size={24} />
                      ) : (
                        <Icon name={tab.icon} fill={isActive} />
                      )}
                    </span>
                  </span>
                  <span className={`text-xs ${isActive ? "font-bold text-ink" : "font-medium text-muted"}`}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shell for the three tab pages. */
export default function AppLayout() {
  return (
    <>
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}
