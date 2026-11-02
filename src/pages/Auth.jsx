import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import LazyCoinScene from "../components/LazyCoinScene";
import { Button, Icon, TextField } from "../components/ui";
import { usePageEnter } from "../lib/motion";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the backend's Mongoose rules, whose failures otherwise surface as a bare 500.
function validate(mode, { name, email, password }) {
  const errors = {};
  if (mode === "register" && !name.trim()) errors.name = "Enter your name";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address";
  if (mode === "register" && password.length < 6) errors.password = "Use at least 6 characters";
  if (mode === "login" && !password) errors.password = "Enter your password";
  return errors;
}

export default function Auth({ mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);

  usePageEnter(ref, [mode]);

  useEffect(() => {
    setErrors({});
    setServerError("");
  }, [mode]);

  // Render's free tier sleeps; say so if the first request is slow.
  useEffect(() => {
    if (!submitting) return setSlow(false);
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [submitting]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(mode, form);
    setErrors(found);
    setServerError("");
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const payload = { email: form.email.trim(), password: form.password };
      if (mode === "register") await register({ ...payload, name: form.name.trim() });
      else await login(payload);
      navigate(location.state?.from ?? "/home", { replace: true });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div ref={ref} className="flex min-h-dvh flex-col">
      <div className="banner-gradient relative h-[34dvh] min-h-56 overflow-hidden rounded-b-[32px]">
        <LazyCoinScene variant="hero" className="absolute inset-0" />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-8 pt-6">
        <h1 className="font-display text-[28px] leading-tight text-ink" data-animate>
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted" data-animate>
          {isRegister ? "Open a ledger account and start sending money." : "Sign in to Ledger Pay to continue."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-surface p-1 text-sm font-medium" data-animate>
          <Link
            to="/login"
            replace
            className={`rounded-full py-2 text-center transition ${!isRegister ? "bg-tonal text-on-tonal" : "text-muted"}`}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            replace
            className={`rounded-full py-2 text-center transition ${isRegister ? "bg-tonal text-on-tonal" : "text-muted"}`}
          >
            Create account
          </Link>
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          {isRegister ? (
            <div data-animate>
              <TextField label="Full name" autoComplete="name" value={form.name} onChange={update("name")} error={errors.name} />
            </div>
          ) : null}
          <div data-animate>
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
            />
          </div>
          <div data-animate>
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={form.password}
              onChange={update("password")}
              error={errors.password}
              hint={isRegister ? "At least 6 characters" : undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} />
                </button>
              }
            />
          </div>

          {serverError ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-tonal px-4 py-3 text-sm text-ink">
              <Icon name="error" size={20} className="text-danger" />
              {serverError}
            </p>
          ) : null}

          <Button type="submit" loading={submitting} className="mt-2 h-12 w-full text-base" data-animate>
            {isRegister ? "Create account" : "Sign in"}
          </Button>
          {slow ? (
            <p className="text-center text-xs text-muted">Waking up the server, this can take up to a minute…</p>
          ) : null}
        </form>

        <p className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-xs text-subtle">
          <Icon name="lock" size={16} />
          Secured with JWT and an immutable ledger
        </p>
      </div>
    </div>
  );
}
