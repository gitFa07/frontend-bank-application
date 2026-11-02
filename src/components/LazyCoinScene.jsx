import { lazy, Suspense } from "react";

// three.js is large; keep it out of the main bundle.
const CoinScene = lazy(() => import("./CoinScene"));

export default function LazyCoinScene(props) {
  return (
    <Suspense fallback={<div className={props.className} aria-hidden="true" />}>
      <CoinScene {...props} />
    </Suspense>
  );
}
