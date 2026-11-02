import { useNavigate } from "react-router";
import { avatarColor, initials } from "../lib/format";

export function Icon({ name, fill = false, size = 24, className = "" }) {
  return (
    <span aria-hidden="true" className={`icon ${fill ? "icon-fill" : ""} ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

export function Spinner({ size = 20, className = "" }) {
  return (
    <span
      role="progressbar"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-[2.5px] border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

const BUTTON_STYLES = {
  filled: "bg-primary text-on-primary hover:brightness-110",
  tonal: "bg-tonal text-on-tonal hover:brightness-95",
  outline: "border border-line text-primary hover:bg-surface",
  text: "text-primary hover:bg-surface",
};

export function Button({ variant = "filled", loading = false, className = "", children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={18} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, onClick, className = "", fill = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-full transition ${
        /\btext-/.test(className) ? "" : "text-ink hover:bg-surface active:bg-surface-2"
      } ${className}`}
    >
      <Icon name={icon} fill={fill} />
    </button>
  );
}

/** Person avatar with initials, or a bank tile when `account` is set. */
export function Avatar({ name, seed, size = 48, account = false, className = "" }) {
  if (account) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-full bg-tonal text-on-tonal ${className}`}
        style={{ width: size, height: size }}
      >
        <Icon name="account_balance" size={size * 0.46} />
      </span>
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-medium text-white ${className}`}
      style={{ width: size, height: size, background: avatarColor(seed ?? name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

/** Top app bar for full-screen flows: close/back on the left, actions on the right. */
export function TopBar({ title, back = "back", onBack, actions = null, className = "" }) {
  const navigate = useNavigate();
  return (
    <header className={`sticky top-0 z-20 flex h-16 items-center gap-1 bg-bg/90 px-2 backdrop-blur-md ${className}`}>
      {back ? (
        <IconButton
          icon={back === "close" ? "close" : "arrow_back"}
          label={back === "close" ? "Close" : "Back"}
          onClick={onBack ?? (() => navigate(-1))}
        />
      ) : null}
      {title ? (
        <h1 className="min-w-0 flex-1 truncate px-2 font-display text-[22px] text-ink">{title}</h1>
      ) : (
        <div className="flex-1" />
      )}
      {actions}
    </header>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between px-5 pb-3 pt-7" data-animate>
      <h2 className="font-display text-[22px] text-ink">{title}</h2>
      {action ? (
        <button type="button" onClick={onAction} className="flex items-center gap-0.5 text-sm font-medium text-primary">
          {action}
          <Icon name="chevron_right" size={20} />
        </button>
      ) : null}
    </div>
  );
}

/** Square tonal tile with an icon and a two-line label (kit: "Primary features"). */
export function FeatureTile({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-2 text-center" data-animate>
      <span className="grid size-16 place-items-center rounded-[20px] bg-tonal text-on-tonal transition group-hover:rounded-[24px] group-active:scale-95">
        <Icon name={icon} size={28} />
      </span>
      <span className="text-[13px] leading-tight text-ink">{label}</span>
    </button>
  );
}

export function ListRow({ icon, title, subtitle, onClick, trailing, tone = "default" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition enabled:hover:bg-surface enabled:active:bg-surface-2"
      data-animate
    >
      {icon ? <Icon name={icon} className={tone === "danger" ? "text-danger" : "text-primary"} /> : null}
      <span className="min-w-0 flex-1">
        <span className={`block text-base ${tone === "danger" ? "text-danger" : "text-ink"}`}>{title}</span>
        {subtitle ? <span className="block truncate text-sm text-muted">{subtitle}</span> : null}
      </span>
      {trailing ?? (onClick ? <Icon name="chevron_right" className="text-muted" /> : null)}
    </Tag>
  );
}

/** Material outlined text field with a floating label. */
export function TextField({ label, error, hint, trailing, id, className = "", ...props }) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <div
        className={`relative flex items-center rounded-xl border bg-bg transition focus-within:border-2 ${
          error ? "border-danger focus-within:border-danger" : "border-subtle focus-within:border-primary"
        }`}
      >
        <input
          id={fieldId}
          placeholder=" "
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error || hint ? `${fieldId}-help` : undefined}
          className="peer h-14 w-full min-w-0 rounded-xl bg-transparent px-4 pt-1 text-base text-ink outline-none"
          {...props}
        />
        <label
          htmlFor={fieldId}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-bg px-1 text-base transition-all peer-focus:top-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs ${
            error ? "text-danger" : "text-muted peer-focus:text-primary"
          }`}
        >
          {label}
        </label>
        {trailing}
      </div>
      {error || hint ? (
        <p id={`${fieldId}-help`} className={`px-4 pt-1 text-xs ${error ? "text-danger" : "text-muted"}`}>
          {error || hint}
        </p>
      ) : null}
    </div>
  );
}

const STATUS_STYLES = {
  ACTIVE: "bg-success-tonal text-success",
  COMPLETED: "bg-success-tonal text-success",
  FROZEN: "bg-tonal text-on-tonal",
  PENDING: "bg-warn-tonal text-warn",
  CLOSED: "bg-danger-tonal text-danger",
  FAILED: "bg-danger-tonal text-danger",
  REVERSED: "bg-surface-2 text-muted",
};

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.REVERSED}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
