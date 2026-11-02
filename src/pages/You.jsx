import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLedger } from "../context/LedgerContext";
import BottomSheet from "../components/BottomSheet";
import { toast } from "../components/Toaster";
import { Avatar, Button, Icon, ListRow } from "../components/ui";
import { copyText, formatINR } from "../lib/format";
import { usePageEnter } from "../lib/motion";
import { getTheme, setTheme } from "../lib/theme";

const THEMES = [
  { value: "system", label: "System default", icon: "contrast" },
  { value: "light", label: "Light", icon: "light_mode" },
  { value: "dark", label: "Dark", icon: "dark_mode" },
];

export default function You() {
  const { user, logout } = useAuth();
  const ledger = useLedger();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [theme, setThemeState] = useState(getTheme);
  const [sheet, setSheet] = useState(null); // "theme" | "clear" | "logout" | null
  const [lastSheet, setLastSheet] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  usePageEnter(ref);

  const primary = ledger.accounts[0];

  const openSheet = (name) => {
    setLastSheet(name);
    setSheet(name);
  };

  const chooseTheme = (value) => {
    setTheme(value);
    setThemeState(value);
    setSheet(null);
  };

  const signOut = async () => {
    setSigningOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div ref={ref}>
      <section className="banner-gradient px-5 pb-6 pt-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0" data-animate>
            <h1 className="truncate font-display text-[32px] leading-tight text-ink">{user?.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
              <Icon name="mail" size={18} />
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/qr")}
            aria-label="Your QR code"
            className="relative shrink-0"
            data-animate
          >
            <Avatar name={user?.name} seed={user?._id} size={76} className="ring-4 ring-bg" />
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-bg text-ink shadow">
              <Icon name="qr_code" size={20} />
            </span>
          </button>
        </div>

        {primary ? (
          <button
            type="button"
            onClick={async () => (await copyText(primary._id)) && toast("Account ID copied")}
            className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-bg/70 px-4 py-3 text-left backdrop-blur"
            data-animate
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Primary account ID</span>
              <span className="block truncate font-mono text-sm text-ink">{primary._id}</span>
            </span>
            <Icon name="content_copy" className="text-primary" />
          </button>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div className="rounded-2xl bg-warn-tonal px-4 py-3" data-animate>
          <p className="font-display text-xl text-ink">{ledger.accounts.length}</p>
          <p className="text-xs text-muted">{ledger.accounts.length === 1 ? "Account" : "Accounts"} open</p>
        </div>
        <div className="rounded-2xl bg-tonal px-4 py-3" data-animate>
          <p className="truncate font-display text-xl text-on-tonal">
            {ledger.balancesReady ? formatINR(ledger.totalBalance) : "…"}
          </p>
          <p className="text-xs text-on-tonal/80">Total balance</p>
        </div>
      </div>

      <div className="py-4">
        <ListRow icon="qr_code" title="Your QR code" subtitle="Use it to receive money" onClick={() => navigate("/qr")} />
        <ListRow icon="payments" title="Pay to an account" subtitle="Send money with an account ID" onClick={() => navigate("/pay")} />
        <ListRow
          icon="account_balance"
          title="Accounts"
          subtitle={`${ledger.accounts.length} open`}
          onClick={() => navigate("/money")}
        />
        <ListRow
          icon="contrast"
          title="Theme"
          subtitle={THEMES.find((t) => t.value === theme)?.label}
          onClick={() => openSheet("theme")}
        />
        <ListRow
          icon="delete"
          title="Clear payment history"
          subtitle="Removes the history saved on this device"
          onClick={() => openSheet("clear")}
        />
        <ListRow icon="logout" title="Sign out" tone="danger" onClick={() => openSheet("logout")} />
      </div>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={{ theme: "Theme", clear: "Clear payment history?", logout: "Sign out?" }[lastSheet]}
      >
        {lastSheet === "theme" ? (
          <ul role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <li key={t.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === t.value}
                  onClick={() => chooseTheme(t.value)}
                  className="flex w-full items-center gap-4 px-6 py-3.5 text-left hover:bg-surface-2"
                >
                  <Icon name={t.icon} className="text-primary" />
                  <span className="flex-1 text-ink">{t.label}</span>
                  {theme === t.value ? <Icon name="check" className="text-primary" /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6">
            <p className="text-sm text-muted">
              {lastSheet === "clear"
                ? "Your payments stay on the ledger. Only the list saved in this browser is removed."
                : "You'll need your email and password to sign back in."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="text" onClick={() => setSheet(null)}>
                Cancel
              </Button>
              {lastSheet === "clear" ? (
                <Button
                  onClick={() => {
                    ledger.clearHistory();
                    setSheet(null);
                    toast("Payment history cleared");
                  }}
                >
                  Clear
                </Button>
              ) : (
                <Button onClick={signOut} loading={signingOut}>
                  Sign out
                </Button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
