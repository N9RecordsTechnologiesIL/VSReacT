// The overlay layer — content that paints above everything else (menus,
// tooltips, modals). render() mounts <OverlayLayer/> after your app
// automatically, so painting order puts overlays on top and hit-testing
// reaches them first. Position entries absolutely using rects from
// onLayout / useLayoutRect.

import { Fragment, useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

interface OverlayEntry {
  key: number;
  node: ReactNode;
}

let entries: OverlayEntry[] = [];
const subscribers = new Set<() => void>();
let nextOverlayKey = 1;

function emit(): void {
  for (const subscriber of subscribers) subscriber();
}

function setEntry(key: number, node: ReactNode): void {
  entries = [...entries.filter((e) => e.key !== key), { key, node }];
  emit();
}

function clearEntry(key: number): void {
  if (!entries.some((e) => e.key === key)) return;
  entries = entries.filter((e) => e.key !== key);
  emit();
}

/** A per-component slot in the overlay layer. show() replaces the slot's
    content; hide() removes it; unmounting cleans up automatically. */
export function useOverlay(): {
  show: (node: ReactNode) => void;
  hide: () => void;
} {
  const key = useRef(0);
  if (key.current === 0) key.current = nextOverlayKey++;

  useEffect(() => {
    const k = key.current;
    return () => clearEntry(k);
  }, []);

  return {
    show: useCallback((node: ReactNode) => setEntry(key.current, node), []),
    hide: useCallback(() => clearEntry(key.current), []),
  };
}

/** Mounted automatically by render() as the last sibling of your app. */
export function OverlayLayer() {
  const list = useSyncExternalStore(
    (onStoreChange) => {
      subscribers.add(onStoreChange);
      return () => subscribers.delete(onStoreChange);
    },
    () => entries,
  );

  return (
    <>
      {list.map((entry) => (
        <Fragment key={entry.key}>{entry.node}</Fragment>
      ))}
    </>
  );
}
