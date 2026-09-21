import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * A shadcn hook version rewritten with `useSyncExternalStore`.
 *
 * The original calls `setState` from a `useEffect`, which React 19's
 * `react-hooks/set-state-in-effect` rule rejects because it causes cascading
 * renders. `useSyncExternalStore` is designed for subscriptions to external
 * stores such as `matchMedia`, and prevents a flash with the wrong initial
 * value.
 */
function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // The server has no viewport, so use the desktop value.
    () => false,
  );
}
