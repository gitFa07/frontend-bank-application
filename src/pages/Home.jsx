import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLedger } from "../context/LedgerContext";
import LazyCoinScene from "../components/LazyCoinScene";
import { AccountCard, ActivityList, EmptyState } from "../components/LedgerItems";
import { toast } from "../components/Toaster";
import { Avatar, Button, FeatureTile, Icon, ListRow, SectionHeader } from "../components/ui";
import { recentRecipients } from "../lib/activity";
import { copyText, formatINR, shortId } from "../lib/format";
import { usePageEnter } from "../lib/motion";

const HIDE_BALANCE_KEY = "ledger.hideBalance";

function readHidden() {
  try {
    return localStorage.getItem(HIDE_BALANCE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Home() {
  const { user } = useAuth();
  const ledger = useLedger();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [hidden, setHidden] = useState(readHidden);
  const [creating, setCreating] = useState(false);

  usePageEnter(ref, [ledger.accounts.length > 0]);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const primary = ledger.activeAccounts[0];
  const people = recentRecipients(ledger.activity, ledger.ownIds).slice(0, 7);

  const toggleHidden = () => {
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_BALANCE_KEY, h ? "0" : "1");
      } catch {
        // ignore
      }
      return !h;
    });
  };

  const openAccount = async () => {
    setCreating(true);
    try {
      await ledger.createAccount();
      toast("New account opened");
    } catch (err) {
      toast(err.message, { tone: "error" });
    } finally {
      setCreating(false);
    }
  };

  const selfTransfer = () => {
    if (ledger.activeAccounts.length < 2) {
      toast("Open a second account to move money between your own accounts.");
      return;
    }
    navigate("/pay?mode=self");
  };

  const copyPrimaryId = async () => {
    if (!primary) return;
    if (await copyText(primary._id)) toast("Account ID copied");
  };

  return (
    <div ref={ref}>
      {/* Search bar, profile and banner share one gradient, as in the kit's homepage. */}
      <section className="banner-gradient relative overflow-hidden pb-6">
        <div className="relative z-10 flex items-center gap-3 px-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/pay")}
            className="flex h-12 flex-1 items-center gap-3 rounded-full bg-bg/90 px-4 text-left text-muted shadow-sm backdrop-blur"
            data-animate
          >
            <Icon name="search" />
            <span className="truncate">Pay by account ID</span>
          </button>
          <button type="button" onClick={() => navigate("/you")} aria-label="Your profile" data-animate>
            <Avatar name={user?.name} seed={user?._id} size={40} />
          </button>
        </div>

        <LazyCoinScene variant="banner" className="absolute bottom-0 right-0 top-16 w-1/2" />

        <div className="relative z-10 max-w-[62%] px-5 pt-7">
          <p className="font-display text-2xl leading-snug text-ink" data-animate>
            Hi {firstName},
            <br />
            your money, simply.
          </p>
          <div className="mt-4 flex items-center gap-2" data-animate>
            <span className="text-sm text-muted">Total balance</span>
            <button
              type="button"
              onClick={toggleHidden}
              aria-label={hidden ? "Show balance" : "Hide balance"}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-bg/50"
            >
              <Icon name={hidden ? "visibility" : "visibility_off"} size={20} />
            </button>
          </div>
          <p className="font-display text-[32px] leading-tight text-ink" data-animate>
            {hidden ? "₹ ••••••" : ledger.balancesReady ? formatINR(ledger.totalBalance) : "…"}
          </p>
          <button
            type="button"
            onClick={() => navigate("/pay")}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
            data-animate
          >
            Pay now
            <span className="grid size-7 place-items-center rounded-full bg-primary text-on-primary">
              <Icon name="arrow_forward" size={18} />
            </span>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-2 px-3 pt-6">
        <FeatureTile icon="qr_code_scanner" label="Scan QR code" onClick={() => navigate("/scan")} />
        <FeatureTile icon="payments" label="Pay account" onClick={() => navigate("/pay")} />
        <FeatureTile icon="swap_horiz" label="Self transfer" onClick={selfTransfer} />
        <FeatureTile icon="qr_code" label="Your QR" onClick={() => navigate("/qr")} />
      </section>

      <div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto px-4">
        <button
          type="button"
          onClick={copyPrimaryId}
          disabled={!primary}
          className="flex shrink-0 items-center gap-3 rounded-full border border-line px-4 py-2 text-left disabled:opacity-50"
          data-animate
        >
          <Icon name="content_copy" className="text-primary" size={20} />
          <span className="text-xs leading-tight">
            <span className="block text-muted">Your account ID</span>
            <span className="block font-mono text-ink">{primary ? shortId(primary._id) : "No account yet"}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/money")}
          className="flex shrink-0 items-center gap-3 rounded-full border border-line px-4 py-2 text-left"
          data-animate
        >
          <Icon name="account_balance_wallet" className="text-primary" size={20} />
          <span className="text-xs leading-tight">
            <span className="block text-muted">Accounts</span>
            <span className="block text-ink">{ledger.accounts.length} open</span>
          </span>
        </button>
      </div>

      <SectionHeader title="People" />
      <div className="grid grid-cols-4 gap-y-5 px-3">
        <button type="button" onClick={selfTransfer} className="flex flex-col items-center gap-2" data-animate>
          <span className="grid size-14 place-items-center rounded-full bg-tonal text-on-tonal">
            <Icon name="swap_horiz" />
          </span>
          <span className="text-xs text-ink">Self transfer</span>
        </button>
        {people.map((p) => (
          <button
            key={p.accountId}
            type="button"
            onClick={() => navigate(`/pay?to=${p.accountId}`)}
            className="flex min-w-0 flex-col items-center gap-2"
            data-animate
          >
            <Avatar name={p.name ?? "?"} seed={p.accountId} size={56} />
            <span className="w-full truncate px-1 text-center text-xs text-ink">{p.name ?? shortId(p.accountId)}</span>
          </button>
        ))}
        <button type="button" onClick={() => navigate("/pay")} className="flex flex-col items-center gap-2" data-animate>
          <span className="grid size-14 place-items-center rounded-full border border-line text-primary">
            <Icon name="add" />
          </span>
          <span className="text-xs text-ink">New payment</span>
        </button>
      </div>
      {people.length === 0 ? (
        <p className="px-5 pt-3 text-sm text-muted" data-animate>
          People you pay from this device will show up here.
        </p>
      ) : null}

      <SectionHeader title="Your accounts" action="Manage" onAction={() => navigate("/money")} />
      {ledger.loading && ledger.accounts.length === 0 ? (
        <div className="flex gap-3 px-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 w-44 animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      ) : ledger.accounts.length === 0 ? (
        <EmptyState
          icon="account_balance"
          title={ledger.error ? "Couldn't load your accounts" : "Open your first account"}
          body={ledger.error ?? "You need an account to send and receive money."}
          action={
            ledger.error ? (
              <Button variant="tonal" onClick={ledger.refresh}>
                Try again
              </Button>
            ) : (
              <Button onClick={openAccount} loading={creating}>
                Open account
              </Button>
            )
          }
        />
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {ledger.accounts.map((a) => (
            <AccountCard key={a._id} account={a} compact onClick={() => navigate(`/qr?account=${a._id}`)} />
          ))}
          <button
            type="button"
            onClick={openAccount}
            disabled={creating}
            className="flex w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line text-primary disabled:opacity-50"
            data-animate
          >
            <Icon name="add" size={28} />
            <span className="text-sm font-medium">{creating ? "Opening…" : "Open account"}</span>
          </button>
        </div>
      )}
      {ledger.balancesReady && ledger.accounts.length > 0 && ledger.totalBalance === 0 ? (
        <p className="mx-5 mt-3 rounded-2xl bg-warn-tonal px-4 py-3 text-sm text-ink" data-animate>
          New accounts start at ₹0. Share your QR code or account ID so someone can send you money.
        </p>
      ) : null}

      {ledger.activity.length > 0 ? (
        <>
          <SectionHeader title="Recent activity" action="See all" onAction={() => navigate("/money")} />
          <ActivityList items={ledger.activity} limit={3} />
        </>
      ) : null}

      <SectionHeader title="Manage your money" />
      <div className="pb-4">
        <ListRow icon="history" title="See transaction history" onClick={() => navigate("/money")} />
        <ListRow icon="account_balance" title="Check account balance" onClick={() => navigate("/money")} />
        <ListRow icon="qr_code" title="Receive money with your QR" onClick={() => navigate("/qr")} />
      </div>
    </div>
  );
}
