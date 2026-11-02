import { useRef } from "react";
import { useSearchParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { useLedger } from "../context/LedgerContext";
import { EmptyState } from "../components/LedgerItems";
import { toast } from "../components/Toaster";
import { Avatar, Button, Icon, TopBar } from "../components/ui";
import { copyText, shortId } from "../lib/format";
import { usePageEnter } from "../lib/motion";

/** Kit: "QR Screen". The code holds the plain account ID so it can also be pasted. */
export default function MyQR() {
  const { user } = useAuth();
  const ledger = useLedger();
  const [params, setParams] = useSearchParams();
  const ref = useRef(null);

  const selectedId = params.get("account");
  const account = ledger.accounts.find((a) => a._id === selectedId) ?? ledger.accounts[0];

  usePageEnter(ref, [Boolean(account)]);

  const share = async () => {
    const text = `Pay me on Ledger Pay. My account ID: ${account._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Ledger Pay account", text });
        return;
      } catch {
        // cancelled: fall back to copying
      }
    }
    if (await copyText(account._id)) toast("Account ID copied");
  };

  return (
    <div ref={ref} className="min-h-dvh">
      <TopBar title="Your QR code" />

      {!account ? (
        <EmptyState icon="qr_code" title="No account yet" body="Open an account on the Money tab to get a QR code." />
      ) : (
        <div className="px-5">
          {ledger.accounts.length > 1 ? (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-4" role="tablist" data-animate>
              {ledger.accounts.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  role="tab"
                  aria-selected={a._id === account._id}
                  onClick={() => setParams({ account: a._id }, { replace: true })}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition ${
                    a._id === account._id ? "border-transparent bg-tonal text-on-tonal" : "border-line text-muted"
                  }`}
                >
                  {ledger.accountName(a._id)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-[28px] bg-surface px-6 pb-6 pt-8 text-center" data-animate>
            <div className="flex flex-col items-center">
              <Avatar name={user?.name} seed={user?._id} size={56} />
              <p className="mt-3 font-display text-xl text-ink">{user?.name}</p>
              <p className="text-sm text-muted">
                {ledger.accountName(account._id)} · {shortId(account._id)}
              </p>
            </div>
            {/* QR stays dark-on-white in both themes so every scanner can read it. */}
            <div className="mx-auto mt-6 w-fit rounded-3xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={account._id} size={208} level="M" marginSize={0} />
            </div>
            <p className="mt-5 text-sm text-muted">Scan to pay with Ledger Pay</p>
            <button
              type="button"
              onClick={async () => (await copyText(account._id)) && toast("Account ID copied")}
              className="mx-auto mt-2 flex max-w-full items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2"
            >
              <span className="truncate font-mono text-xs text-ink">{account._id}</span>
              <Icon name="content_copy" size={16} className="text-primary" />
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-3" data-animate>
            <Button variant="outline" onClick={share}>
              <Icon name="share" size={18} />
              Share
            </Button>
            <Button onClick={async () => (await copyText(account._id)) && toast("Account ID copied")}>
              <Icon name="content_copy" size={18} />
              Copy ID
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
