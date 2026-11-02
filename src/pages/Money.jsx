import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useLedger } from "../context/LedgerContext";
import BottomSheet from "../components/BottomSheet";
import { AccountCard, ActivityList, EmptyState } from "../components/LedgerItems";
import { toast } from "../components/Toaster";
import { Button, IconButton, ListRow, SectionHeader, Spinner, StatusBadge } from "../components/ui";
import { copyText, formatDateTime, formatINR } from "../lib/format";
import { usePageEnter } from "../lib/motion";

function AccountSheet({ account, open, onClose }) {
  const ledger = useLedger();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  if (!account) return null;

  const balance = ledger.balances[account._id];

  const recheck = async () => {
    setChecking(true);
    await ledger.refreshBalances([account._id]);
    setChecking(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={ledger.accountName(account._id)}>
      <div className="px-6">
        <p className="text-sm text-muted">Balance</p>
        <div className="flex items-center gap-2">
          <p className="font-display text-[32px] text-ink">{balance === undefined ? "…" : formatINR(balance)}</p>
          {checking ? <Spinner className="text-primary" /> : <IconButton icon="refresh" label="Refresh balance" onClick={recheck} />}
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Account ID</dt>
          <dd className="break-all font-mono text-ink">{account._id}</dd>
          <dt className="text-muted">Status</dt>
          <dd>
            <StatusBadge status={account.status} />
          </dd>
          <dt className="text-muted">Currency</dt>
          <dd className="text-ink">{account.currency}</dd>
          <dt className="text-muted">Opened</dt>
          <dd className="text-ink">{formatDateTime(account.createdAt)}</dd>
        </dl>
      </div>
      <div className="mt-4 border-t border-line pt-2">
        <ListRow
          icon="content_copy"
          title="Copy account ID"
          onClick={async () => (await copyText(account._id)) && toast("Account ID copied")}
        />
        <ListRow icon="qr_code" title="Show QR code" onClick={() => navigate(`/qr?account=${account._id}`)} />
        {account.status === "ACTIVE" ? (
          <ListRow icon="payments" title="Pay from this account" onClick={() => navigate(`/pay?from=${account._id}`)} />
        ) : null}
      </div>
    </BottomSheet>
  );
}

export default function Money() {
  const ledger = useLedger();
  const ref = useRef(null);
  // Kept after closing so the sheet keeps its content while it animates out.
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  usePageEnter(ref, [ledger.accounts.length > 0]);

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

  return (
    <div ref={ref}>
      <section className="banner-gradient px-5 pb-8 pt-5">
        <div className="flex items-center justify-between" data-animate>
          <h1 className="font-display text-[28px] text-ink">Money</h1>
          {ledger.loading ? (
            <Spinner className="mr-2 text-primary" />
          ) : (
            <IconButton icon="refresh" label="Refresh" onClick={ledger.refresh} />
          )}
        </div>
        <p className="mt-6 text-sm text-muted" data-animate>
          Total across {ledger.accounts.length} {ledger.accounts.length === 1 ? "account" : "accounts"}
        </p>
        <p className="font-display text-[40px] leading-tight text-ink" data-animate>
          {ledger.balancesReady ? formatINR(ledger.totalBalance) : "…"}
        </p>
      </section>

      <SectionHeader title="Accounts" />
      {ledger.error && ledger.accounts.length === 0 ? (
        <EmptyState
          icon="error"
          title="Couldn't load your accounts"
          body={ledger.error}
          action={
            <Button variant="tonal" onClick={ledger.refresh}>
              Try again
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {ledger.accounts.map((a) => (
            <AccountCard key={a._id} account={a} onClick={() => {
                setSelected(a);
                setSheetOpen(true);
              }}
            />
          ))}
          <Button variant="outline" onClick={openAccount} loading={creating} className="h-12" data-animate>
            Open another account
          </Button>
        </div>
      )}

      <SectionHeader title="Transaction history" />
      <p className="px-5 pb-2 text-sm text-muted" data-animate>
        Payments sent from this device. Money you receive isn't listed: the server doesn't share history yet.
      </p>
      {ledger.activity.length === 0 ? (
        <EmptyState icon="history" title="No payments yet" body="Your payments will appear here." />
      ) : (
        <ActivityList items={ledger.activity} />
      )}

      <AccountSheet account={selected} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
