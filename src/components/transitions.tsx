import { ViewTransition } from "react";

/**
 * Page-level enter/exit for lateral navigation (Dashboard ⇄ Readings ⇄ Trends).
 * Must be the first thing a page renders (before any DOM node) for enter/exit to fire.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}

/** Fades streamed data in when its Suspense boundary resolves. Place directly inside <Suspense>. */
export function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="reveal" default="none">
      {children}
    </ViewTransition>
  );
}
