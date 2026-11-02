import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useLedger } from "../context/LedgerContext";
import ResultBadge from "../components/ResultBadge";
import { EmptyState } from "../components/LedgerItems";
import { toast } from "../components/Toaster";
import { Button, Icon, StatusBadge, TopBar } from "../components/ui";
import { transfer } from "../lib/api";
import { copyText, formatDateTime, formatINR, shortId } from "../lib/format";

const TONE = { COMPLETED: "success", PENDING: "pending", FAILED: "error", REVERSED: "neutral" };

function Row({ label, value, mono = false, copy = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`min-w-0 text-right text-sm text-ink ${mono ? "break-all font-mono text-xs" : ""}`}>
        {copy ? (
          <button
            type="button"
            onClick={async () => (await copyText(value)) && toast(`${label} copied`)}
            className="inline-flex items-start gap-1 text-left"
          >
            <span className="break-all">{value}</span>
            <Icon name="content_copy" size={16} className="shrink-0 text-primary" />
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** Details of a payment from this device's history (kit: "Payment"). */
export default function Receipt() {
  const { key } = useParams();
  const ledger = useLedger();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const item = ledger.activity.find((i) => i.idempotencyKey === key);

  if (!item) {
    return (
      <div>
        <TopBar title="Payment" />
        <EmptyState icon="history" title="Payment not found" body="It may have been cleared from this device." />
      </div>
    );
  }

  const isSelf = item.kind === "self";
  const toLabel = isSelf ? ledger.accountName(item.toAccount) : (item.toName ?? shortId(item.toAccount));

  // Re-sending with the same idempotency key returns the stored transaction
  // rather than paying twice.
  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await transfer({
        fromAccount: item.fromAccount,
        toAccount: item.toAccount,
        amount: item.amount,
        idempotencyKey: item.idempotencyKey,
      });
      ledger.recordActivity({
        idempotencyKey: item.idempotencyKey,
        status: res.status,
        transactionId: res.transaction?._id ?? item.transactionId,
        message: res.status === "COMPLETED" ? null : res.message,
      });
      toast(res.status === "COMPLETED" ? "Payment completed" : res.message);
    } catch (err) {
      toast(err.message, { tone: "error" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-dvh pb-10">
      <TopBar />
      <div className="flex flex-col items-center px-6 text-center">
        <ResultBadge tone={TONE[item.status] ?? "neutral"} size={72} animate={false} />
        <p className="-mt-2 font-display text-[40px] text-ink">{formatINR(item.amount)}</p>
        <p className="text-base text-ink">{isSelf ? `Moved to ${toLabel}` : `Paid to ${toLabel}`}</p>
        <div className="mt-2">
          <StatusBadge status={item.status} />
        </div>
        {item.message ? <p className="mt-2 text-sm text-muted">{item.message}</p> : null}
      </div>

      <dl className="mx-5 mt-8 divide-y divide-line rounded-3xl bg-surface px-5">
        <Row label="Date" value={formatDateTime(item.createdAt)} />
        <Row label="From" value={`${ledger.accountName(item.fromAccount)} ${shortId(item.fromAccount)}`} />
        <Row label="To account" value={item.toAccount} mono copy />
        {item.note ? <Row label="Note" value={item.note} /> : null}
        {item.transactionId ? <Row label="Transaction ID" value={item.transactionId} mono copy /> : null}
        <Row label="Reference" value={item.idempotencyKey} mono />
      </dl>

      <div className="mt-8 flex justify-center gap-3 px-6">
        {item.status === "PENDING" ? (
          <Button onClick={checkStatus} loading={checking}>
            <Icon name="refresh" size={18} />
            Check status
          </Button>
        ) : null}
        {!isSelf ? (
          <Button variant={item.status === "PENDING" ? "outline" : "filled"} onClick={() => navigate(`/pay?to=${item.toAccount}`)}>
            Pay again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
