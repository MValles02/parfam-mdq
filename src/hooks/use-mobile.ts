import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Versión del hook de shadcn reescrita con `useSyncExternalStore`.
 *
 * El original hacía `setState` dentro de un `useEffect`, que la regla
 * `react-hooks/set-state-in-effect` de React 19 marca como error (provoca
 * renders en cascada). `useSyncExternalStore` es justo la API pensada para
 * suscribirse a un store externo como `matchMedia`, así que además de pasar
 * el lint evita el flash de un primer render con el valor equivocado.
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
    // En el servidor no hay viewport: asumimos escritorio.
    () => false,
  );
}
