import { useNavigate } from "react-router";
import { useLedger } from "../context/LedgerContext";
import { formatDay, formatINR, shortId } from "../lib/format";
import { Avatar, Icon, StatusBadge } from "./ui";

/** Card for one of the user's own accounts (kit: "Banks" on the Money tab). */
export function AccountCard({ account, compact = false, onClick }) {
  const { balances, accountName } = useLedger();
  const balance = balances[account._id];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 flex-col rounded-3xl bg-surface p-4 text-left transition hover:bg-surface-2 active:scale-[0.99] ${
        compact ? "w-44" : "w-full"
      }`}
      data-animate
    >
      <span className="flex items-center justify-between gap-2">
        <Avatar account size={40} />
        <StatusBadge status={account.status} />
      </span>
      <span className="mt-3 text-base font-medium text-ink">{accountName(account._id)}</span>
      <span className="font-mono text-xs tracking-wider text-muted">{shortId(account._id)}</span>
      <span className="mt-2 font-display text-xl text-ink">
        {balance === undefined ? <span className="inline-block h-6 w-20 animate-pulse rounded bg-surface-2" /> : formatINR(balance)}
      </span>
    </button>
  );
}

function counterparty(item, accountName) {
  if (item.kind === "self") return { title: `To ${accountName(item.toAccount)}`, name: null };
  return { title: item.toName ? `Paid to ${item.toName}` : `Paid to ${shortId(item.toAccount)}`, name: item.toName };
}

/** Payments recorded on this device, newest first. */
export function ActivityList({ items, limit }) {
  const navigate = useNavigate();
  const { accountName } = useLedger();
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <ul>
      {shown.map((item) => {
        const { title, name } = counterparty(item, accountName);
        return (
          <li key={item.idempotencyKey} data-animate>
            <button
              type="button"
              onClick={() => navigate(`/activity/${item.idempotencyKey}`)}
              className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-surface active:bg-surface-2"
            >
              {item.kind === "self" ? (
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tonal text-on-tonal">
                  <Icon name="swap_horiz" />
                </span>
              ) : (
                <Avatar name={name ?? "?"} seed={item.toAccount} size={44} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base text-ink">{title}</span>
                <span className="block text-sm text-muted">
                  {formatDay(item.createdAt)} · from {accountName(item.fromAccount)}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className={`font-medium ${item.status === "COMPLETED" ? "text-ink" : "text-muted"}`}>
                  {item.kind === "self" ? "" : "−"}
                  {formatINR(item.amount)}
                </span>
                {item.status !== "COMPLETED" ? <StatusBadge status={item.status} /> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="mx-5 flex flex-col items-center rounded-3xl bg-surface px-6 py-8 text-center" data-animate>
      <span className="grid size-14 place-items-center rounded-full bg-tonal text-on-tonal">
        <Icon name={icon} size={28} />
      </span>
      <p className="mt-3 font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
