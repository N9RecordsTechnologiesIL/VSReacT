// JS side of the mutation/event bridge. Ops queue up during a React commit
// and flush to C++ as one JSON batch; C++ pushes events back through the
// __vsreact_dispatch global registered here.

import { fireTimer } from "./runtime";

export type Op = unknown[];

let queue: Op[] = [];

export function queueOp(op: Op): void {
  queue.push(op);
}

export function flushOps(): void {
  if (queue.length === 0) return;
  const json = JSON.stringify(queue);
  queue = [];
  (globalThis as Record<string, any>).__vsreact_flush?.(json);
}

export type EventHandler = (payload: unknown) => void;

const eventHandlers = new Map<number, Map<string, EventHandler>>();

export function setHandlers(nodeId: number, handlers: Map<string, EventHandler>): void {
  if (handlers.size === 0) eventHandlers.delete(nodeId);
  else eventHandlers.set(nodeId, handlers);
}

export function removeHandlers(nodeId: number): void {
  eventHandlers.delete(nodeId);
}

const nativeListeners = new Map<string, Set<EventHandler>>();

export function addNativeListener(name: string, cb: EventHandler): () => void {
  let set = nativeListeners.get(name);
  if (!set) nativeListeners.set(name, (set = new Set()));
  set.add(cb);
  return () => {
    set.delete(cb);
    if (set.size === 0) nativeListeners.delete(name);
  };
}

interface DispatchMessage {
  kind: "event" | "native" | "timer";
  nodeId?: number;
  type?: string;
  name?: string;
  id?: number;
  payload?: unknown;
}

(globalThis as Record<string, any>).__vsreact_dispatch = (json: string) => {
  const msg = JSON.parse(json) as DispatchMessage;

  if (msg.kind === "timer" && msg.id !== undefined) {
    fireTimer(msg.id);
  } else if (msg.kind === "event" && msg.nodeId !== undefined && msg.type) {
    eventHandlers.get(msg.nodeId)?.get(msg.type)?.(msg.payload);
  } else if (msg.kind === "native" && msg.name) {
    nativeListeners.get(msg.name)?.forEach((cb) => cb(msg.payload));
  }
};
