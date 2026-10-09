"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "@/components/ui/sonner";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const MOBILE_BOTTOM_OFFSET = {
  bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
};

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Store toaster: top-right on desktop, bottom-center below 1024px so toasts do
 * not cover the header (cart button). The bottom offset clears the fixed
 * purchase bar on the product page plus the device safe-area inset.
 */
export function StoreToaster() {
  // Server snapshot is desktop so hydration matches the initial markup.
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
    () => true,
  );

  // `mobileOffset` only applies up to 600px; `offset` covers the 601-1023px
  // range where the purchase bar is still visible.
  return (
    <Toaster
      position={isDesktop ? "top-right" : "bottom-center"}
      offset={isDesktop ? undefined : MOBILE_BOTTOM_OFFSET}
      mobileOffset={MOBILE_BOTTOM_OFFSET}
      richColors
    />
  );
}
