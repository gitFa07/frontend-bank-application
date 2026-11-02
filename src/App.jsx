import { useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LedgerProvider } from "./context/LedgerContext";
import AppLayout from "./components/AppLayout";
import Splash from "./components/Splash";
import Toaster from "./components/Toaster";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Money from "./pages/Money";
import MyQR from "./pages/MyQR";
import Pay from "./pages/Pay";
import Receipt from "./pages/Receipt";
import Scan from "./pages/Scan";
import You from "./pages/You";

const SPLASH_KEY = "ledger.splashShown";

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function GuestOnly() {
  const { user } = useAuth();
  return user ? <Navigate to="/home" replace /> : <Outlet />;
}

function shouldShowSplash() {
  try {
    if (sessionStorage.getItem(SPLASH_KEY)) return false;
    sessionStorage.setItem(SPLASH_KEY, "1");
  } catch {
    // ignore
  }
  return true;
}

export default function App() {
  const [splash, setSplash] = useState(shouldShowSplash);

  return (
    <BrowserRouter>
      <AuthProvider>
        <LedgerProvider>
          {/* Phone-width column; on larger screens it sits centred like a device. */}
          <div className="relative mx-auto min-h-dvh w-full max-w-[440px] bg-bg md:border-x md:border-line">
            <Routes>
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<Auth mode="login" />} />
                <Route path="/register" element={<Auth mode="register" />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/money" element={<Money />} />
                  <Route path="/you" element={<You />} />
                </Route>
                <Route path="/pay" element={<Pay />} />
                <Route path="/qr" element={<MyQR />} />
                <Route path="/scan" element={<Scan />} />
                <Route path="/activity/:key" element={<Receipt />} />
              </Route>
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
          <Toaster />
          {splash ? <Splash onDone={() => setSplash(false)} /> : null}
        </LedgerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
