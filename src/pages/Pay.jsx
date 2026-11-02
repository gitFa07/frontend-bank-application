import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import gsap from "gsap";
import { useLedger } from "../context/LedgerContext";
import BottomSheet from "../components/BottomSheet";
import ResultBadge from "../components/ResultBadge";
import { toast } from "../components/Toaster";
import { Avatar, Button, Icon, IconButton, TextField, TopBar } from "../components/ui";
import { newIdempotencyKey, transfer } from "../lib/api";
import { recentRecipients } from "../lib/activity";
import { copyText, formatAmountDigits, formatDateTime, formatINR, isAccountId, shortId } from "../lib/format";
import { prefersReducedMotion, usePageEnter } from "../lib/motion";

const AMOUNT_PATTERN = /^\d{0,7}(\.\d{0,2})?$/;

// ---------------------------------------------------------------- recipient

function RecipientStep({ selfMode, onPick }) {
  const ledger = useLedger();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  usePageEnter(ref, [selfMode]);

  const people = recentRecipients(ledger.activity, ledger.ownIds);

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      setAccountId(text);
      setError("");
    } catch {
      toast("Paste isn't available here. Long-press the field to paste.");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const id = accountId.trim();
    if (!isAccountId(id)) {
      setError("An account ID is 24 characters, using 0-9 and a-f");
      return;
    }
    onPick({ accountId: id.toLowerCase(), name: name.trim() || null });
  };

  return (
    <div ref={ref}>
      <TopBar title={selfMode ? "Self transfer" : "Pay to account"} />

      {selfMode ? (
        <>
          <p className="px-5 pb-3 text-sm text-muted" data-animate>
            Choose the account to move money into.
          </p>
          <ul>
            {ledger.activeAccounts.map((a) => (
              <li key={a._id} data-animate>
                <button
                  type="button"
                  onClick={() => onPick({ accountId: a._id, name: ledger.accountName(a._id) })}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-surface"
                >
                  <Avatar account size={44} />
                  <span className="flex-1">
                    <span className="block text-ink">{ledger.accountName(a._id)}</span>
                    <span className="block font-mono text-xs text-muted">{shortId(a._id)}</span>
                  </span>
                  <span className="text-sm text-muted">{formatINR(ledger.balances[a._id] ?? 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-5 pt-2">
            <div data-animate>
              <TextField
                label="Recipient account ID"
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  setError("");
                }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
                className="[&_input]:font-mono [&_input]:text-sm"
                error={error}
                hint="Ask them for the ID on their QR code or profile"
                trailing={
                  <div className="mr-1 flex">
                    <IconButton icon="content_paste" label="Paste" onClick={paste} />
                    <IconButton icon="qr_code_scanner" label="Scan QR code" onClick={() => navigate("/scan")} />
                  </div>
                }
              />
            </div>
            <div data-animate>
              <TextField
                label="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                hint="Only saved on this device, to recognise them later"
              />
            </div>
            <Button type="submit" className="h-12 text-base" data-animate>
              Continue
            </Button>
          </form>

          {people.length > 0 ? (
            <>
              <h2 className="px-5 pb-2 pt-8 font-display text-lg text-ink" data-animate>
                Recent
              </h2>
              <ul>
                {people.map((p) => (
                  <li key={p.accountId} data-animate>
                    <button
                      type="button"
                      onClick={() => onPick(p)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-surface"
                    >
                      <Avatar name={p.name ?? "?"} seed={p.accountId} size={44} />
                      <span>
                        <span className="block text-ink">{p.name ?? "Unnamed"}</span>
                        <span className="block font-mono text-xs text-muted">{shortId(p.accountId)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- amount

function AmountStep({ recipient, fromId, setFromId, amount, setAmount, note, setNote, onSubmit, onBack }) {
  const ledger = useLedger();
  const ref = useRef(null);
  const amountRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(Boolean(note));
  const [error, setError] = useState("");

  usePageEnter(ref);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const isSelf = ledger.ownIds.has(recipient.accountId);
  const sources = ledger.activeAccounts.filter((a) => a._id !== recipient.accountId);
  const balance = ledger.balances[fromId];
  const value = Number(amount);

  const shake = () => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(amountRef.current.parentElement, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
  };

  const submit = () => {
    let problem = "";
    if (!fromId) problem = "Open an active account to pay from";
    else if (!value || value <= 0) problem = "Enter an amount";
    else if (balance !== undefined && value > balance) problem = `You only have ${formatINR(balance)} in this account`;
    setError(problem);
    if (problem) return shake();
    onSubmit();
  };

  const onAmountChange = (e) => {
    const next = e.target.value.replace(/,/g, "");
    if (AMOUNT_PATTERN.test(next)) {
      setAmount(next.replace(/^0+(?=\d)/, ""));
      setError("");
    }
  };

  return (
    <div ref={ref} className="flex min-h-dvh flex-col">
      <TopBar back="close" onBack={onBack} />

      <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
        <div data-animate>
          {isSelf ? <Avatar account size={64} /> : <Avatar name={recipient.name ?? "?"} seed={recipient.accountId} size={64} />}
        </div>
        <p className="mt-3 text-lg text-ink" data-animate>
          {isSelf ? `To ${ledger.accountName(recipient.accountId)}` : `Paying ${recipient.name ?? "account"}`}
        </p>
        <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted" data-animate>
          <Icon name="account_balance" size={14} />
          {recipient.accountId}
        </p>

        <label className="mt-8 flex items-baseline justify-center gap-1 text-ink" data-animate>
          <span className="font-display text-4xl">₹</span>
          <span className="sr-only">Amount in rupees</span>
          <input
            ref={amountRef}
            value={amount}
            onChange={onAmountChange}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            inputMode="decimal"
            placeholder="0"
            size={Math.max(1, amount.length)}
            className="min-w-[1ch] bg-transparent font-display text-[56px] leading-none text-ink outline-none placeholder:text-subtle"
            aria-invalid={error ? "true" : undefined}
          />
        </label>
        {amount ? (
          <p className="mt-1 text-xs text-muted" data-animate>
            {formatINR(value)}
          </p>
        ) : null}

        <div className="mt-4" data-animate>
          {editingNote ? (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 60))}
              placeholder="Add a note"
              aria-label="Note"
              className="w-56 rounded-lg bg-surface px-3 py-2 text-center text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs text-muted"
            >
              <Icon name="edit_note" size={16} />
              Add note
            </button>
          )}
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="pb-safe sticky bottom-0 flex items-center gap-3 bg-bg px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={sources.length === 0}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left disabled:opacity-60"
        >
          <Avatar account size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">
              {fromId ? `${ledger.accountName(fromId)} ${shortId(fromId)}` : "No account to pay from"}
            </span>
            <span className="block text-xs text-muted">
              {fromId ? `Balance ${balance === undefined ? "…" : formatINR(balance)}` : "Open one on the Money tab"}
            </span>
          </span>
          <Icon name="expand_more" className="text-muted" />
        </button>
        <button
          type="button"
          onClick={submit}
          aria-label="Pay"
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg transition active:scale-95"
        >
          <Icon name="arrow_forward" size={28} />
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Pay from">
        <ul>
          {sources.map((a) => (
            <li key={a._id}>
              <button
                type="button"
                onClick={() => {
                  setFromId(a._id);
                  setSheetOpen(false);
                  setError("");
                }}
                className="flex w-full items-center gap-4 px-6 py-3 text-left hover:bg-surface-2"
              >
                <Avatar account size={40} />
                <span className="flex-1">
                  <span className="block text-ink">{ledger.accountName(a._id)}</span>
                  <span className="block font-mono text-xs text-muted">{shortId(a._id)}</span>
                </span>
                <span className="text-sm text-muted">{formatINR(ledger.balances[a._id] ?? 0)}</span>
                {a._id === fromId ? <Icon name="check_circle" fill className="text-primary" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}

// ---------------------------------------------------------------- processing

// Mirrors the backend's steps, which take 5s or more.
const STAGES = ["Checking both accounts", "Debiting your account", "Crediting the receiver", "Confirming with the ledger"];

function ProcessingStep({ recipient, amount, fromId }) {
  const ledger = useLedger();
  const ref = useRef(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1700);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(".proc-in", { y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" });
      gsap.fromTo(".packet", { x: 0 }, { x: 132, duration: 1.2, ease: "power1.inOut", stagger: { each: 0.4, repeat: -1 } });
      gsap.fromTo(
        ".packet",
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: "sine.inOut", stagger: { each: 0.4, repeat: -1, yoyo: true } },
      );
      gsap.to(".bar", { xPercent: 350, duration: 1.4, ease: "power1.inOut", repeat: -1 });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="flex min-h-dvh flex-col items-center justify-center px-6 text-center" aria-busy="true">
      <div className="proc-in relative flex items-center gap-[84px]">
        <Avatar account size={56} />
        <div className="absolute left-[60px] top-1/2 h-0 w-[140px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="packet absolute -top-1 size-2 rounded-full bg-primary opacity-0" />
          ))}
        </div>
        {ledger.ownIds.has(recipient.accountId) ? (
          <Avatar account size={56} />
        ) : (
          <Avatar name={recipient.name ?? "?"} seed={recipient.accountId} size={56} />
        )}
      </div>
      <p className="proc-in mt-8 font-display text-[40px] text-ink">{formatINR(amount)}</p>
      <p className="proc-in mt-1 text-sm text-muted">
        {ledger.accountName(fromId)} → {recipient.name ?? shortId(recipient.accountId)}
      </p>
      <div className="proc-in mt-10 h-1 w-56 overflow-hidden rounded-full bg-tonal">
        <div className="bar h-full w-2/5 -translate-x-full rounded-full bg-primary" />
      </div>
      <p className="proc-in mt-4 text-base text-ink" role="status">
        {STAGES[stage]}…
      </p>
      <p className="proc-in mt-1 text-xs text-muted">Please keep this screen open.</p>
    </div>
  );
}

// ---------------------------------------------------------------- result

const RESULT_COPY = {
  COMPLETED: { tone: "success", title: "Payment successful" },
  PENDING: { tone: "pending", title: "Payment processing" },
  REVERSED: { tone: "neutral", title: "Payment reversed" },
  FAILED: { tone: "error", title: "Payment failed" },
};

function ResultStep({ result, recipient, amount, fromId, onRetry, onDone, onEdit }) {
  const ledger = useLedger();
  const ref = useRef(null);
  const { tone, title } = RESULT_COPY[result.status];
  const tx = result.transaction;

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(".res-in", { y: 20, opacity: 0, duration: 0.5, stagger: 0.07, delay: 0.35, ease: "power3.out" });
    }, ref);
    return () => ctx.revert();
  }, []);

  const share = async () => {
    const text = `Paid ${formatINR(amount)} to ${recipient.name ?? recipient.accountId} via Ledger Pay. Transaction ID: ${tx?._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Payment receipt", text });
        return;
      } catch {
        // cancelled: fall back to copying
      }
    }
    if (await copyText(text)) toast("Receipt copied");
  };

  return (
    <div ref={ref} className="flex min-h-dvh flex-col">
      <TopBar back="close" onBack={onDone} />
      <div className="flex flex-1 flex-col items-center px-6 pt-4 text-center">
        <ResultBadge tone={tone} size={96} />
        <p className="res-in -mt-2 font-display text-[40px] text-ink">{formatINR(amount)}</p>
        <p className="res-in text-lg text-ink">{title}</p>
        <p className="res-in mt-1 text-sm text-muted">
          {result.status === "COMPLETED"
            ? `Paid to ${recipient.name ?? shortId(recipient.accountId)} from ${ledger.accountName(fromId)}`
            : result.message}
        </p>
        {tx?.createdAt ? <p className="res-in mt-1 text-xs text-muted">{formatDateTime(tx.createdAt)}</p> : null}
        {tx?._id ? (
          <button
            type="button"
            onClick={async () => (await copyText(tx._id)) && toast("Transaction ID copied")}
            className="res-in mt-6 flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-left"
          >
            <span>
              <span className="block text-xs text-muted">Transaction ID</span>
              <span className="block font-mono text-xs text-ink">{tx._id}</span>
            </span>
            <Icon name="content_copy" size={18} className="text-primary" />
          </button>
        ) : null}
      </div>

      <div className="pb-safe res-in flex justify-center gap-3 px-6 pb-8 pt-4">
        {result.status === "COMPLETED" ? (
          <>
            <Button variant="outline" onClick={share}>
              <Icon name="share" size={18} />
              Share
            </Button>
            <Button onClick={onDone}>Done</Button>
          </>
        ) : result.status === "PENDING" ? (
          <>
            <Button variant="outline" onClick={onDone}>
              Close
            </Button>
            <Button onClick={onRetry}>
              <Icon name="refresh" size={18} />
              Check status
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onDone}>
              Close
            </Button>
            <Button onClick={result.retrySameKey ? onRetry : onEdit}>{result.retrySameKey ? "Retry" : "Try again"}</Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- flow

export default function Pay() {
  const ledger = useLedger();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selfMode = params.get("mode") === "self";

  const initialTo = params.get("to");
  const knownName = initialTo
    ? (ledger.activity.find((i) => i.toAccount === initialTo && i.toName)?.toName ?? null)
    : null;

  const [step, setStep] = useState(initialTo && isAccountId(initialTo) ? "amount" : "recipient");
  const [recipient, setRecipient] = useState(
    initialTo && isAccountId(initialTo) ? { accountId: initialTo.toLowerCase(), name: knownName } : null,
  );
  const [fromId, setFromId] = useState(params.get("from") ?? null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const keyRef = useRef(null);

  // Default the source account once accounts have loaded.
  useEffect(() => {
    if (ledger.accounts.length === 0) return;
    if (fromId && ledger.activeAccounts.some((a) => a._id === fromId && a._id !== recipient?.accountId)) return;
    const candidates = ledger.activeAccounts.filter((a) => a._id !== recipient?.accountId);
    candidates.sort((a, b) => (ledger.balances[b._id] ?? 0) - (ledger.balances[a._id] ?? 0));
    setFromId(candidates[0]?._id ?? null);
  }, [ledger.accounts.length, ledger.activeAccounts, ledger.balances, recipient, fromId]);

  const pickRecipient = (r) => {
    setRecipient(r);
    setStep("amount");
  };

  const run = useCallback(
    async ({ reuseKey }) => {
      if (!reuseKey || !keyRef.current) keyRef.current = newIdempotencyKey();
      const idempotencyKey = keyRef.current;
      const value = Number(amount);
      const kind = ledger.ownIds.has(recipient.accountId) ? "self" : "payment";
      const base = {
        idempotencyKey,
        kind,
        fromAccount: fromId,
        toAccount: recipient.accountId,
        toName: kind === "self" ? null : recipient.name,
        amount: value,
        note: note.trim() || null,
        createdAt: new Date().toISOString(),
      };

      setStep("processing");
      ledger.recordActivity({ ...base, status: "PENDING" });

      let outcome;
      try {
        const res = await transfer({ fromAccount: fromId, toAccount: recipient.accountId, amount: value, idempotencyKey });
        outcome = { ...res, message: res.message };
      } catch (err) {
        // No answer at all: the payment may have gone through, so retry with the same key.
        // Any answer: the server rejected it, so the next attempt gets a fresh key.
        outcome = { status: "FAILED", message: err.message, retrySameKey: err.isNetwork };
      }

      ledger.recordActivity({
        ...base,
        status: outcome.status,
        transactionId: outcome.transaction?._id ?? null,
        message: outcome.status === "COMPLETED" ? null : outcome.message,
      });
      if (outcome.status === "COMPLETED") {
        ledger.refreshBalances([fromId, recipient.accountId].filter((id) => ledger.ownIds.has(id)));
      }
      setResult(outcome);
      setStep("result");
    },
    [amount, fromId, note, recipient, ledger],
  );

  if (step === "recipient") return <RecipientStep selfMode={selfMode} onPick={pickRecipient} />;

  if (step === "amount") {
    return (
      <AmountStep
        recipient={recipient}
        fromId={fromId}
        setFromId={setFromId}
        amount={amount}
        setAmount={setAmount}
        note={note}
        setNote={setNote}
        onSubmit={() => run({ reuseKey: false })}
        onBack={() => (initialTo ? navigate(-1) : setStep("recipient"))}
      />
    );
  }

  if (step === "processing") return <ProcessingStep recipient={recipient} amount={Number(amount)} fromId={fromId} />;

  return (
    <ResultStep
      result={result}
      recipient={recipient}
      amount={Number(amount)}
      fromId={fromId}
      onRetry={() => run({ reuseKey: true })}
      onEdit={() => setStep("amount")}
      onDone={() => navigate("/home", { replace: true })}
    />
  );
}
