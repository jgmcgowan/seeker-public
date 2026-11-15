"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

/** Renders children only in the browser, so they can read localStorage in state initializers. */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  return isClient ? children : fallback;
}
