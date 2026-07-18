// react-reconciler host config (mutation mode). React commits become batched
// mutation ops; event props become handler-registry entries + listener lists.

import { DefaultEventPriority } from "react-reconciler/constants";
import { queueOp, flushOps, setHandlers, removeHandlers, type EventHandler } from "./bridge";
import { tw, type Style } from "./tw";

export interface Instance {
  id: number;
  type: string;
}

export type TextInstance = Instance;

let nextId = 1;

const hostTypes: Record<string, string> = {
  "vs-view": "view",
  "vs-text": "text",
  "vs-image": "image",
  "vs-textinput": "textinput",
  "vs-native": "native",
};

const eventPropNames: Record<string, string> = {
  onClick: "click",
  onDoubleClick: "dblclick",
  onWheel: "wheel",
  onMouseEnter: "mouseenter",
  onMouseLeave: "mouseleave",
  onMouseDown: "mousedown",
  onMouseUp: "mouseup",
  onMouseMove: "mousemove",
  onKeyDown: "keydown",
  onDragStart: "dragstart",
  onDrag: "drag",
  onDragEnd: "dragend",
  onLayout: "layout",
  onChange: "change",
  onSubmit: "submit",
  onFocus: "focus",
  onBlur: "blur",
};

function normalizeProps(props: Record<string, unknown>): {
  payload: Record<string, unknown>;
  handlers: Map<string, EventHandler>;
} {
  const payload: Record<string, unknown> = {};
  const handlers = new Map<string, EventHandler>();
  const listeners: string[] = [];

  const resolved = typeof props.className === "string" ? tw(props.className) : { style: {} };
  payload.style = { ...resolved.style, ...((props.style as Style) ?? {}) };
  if (resolved.hoverStyle) payload.hoverStyle = resolved.hoverStyle;
  if (resolved.activeStyle) payload.activeStyle = resolved.activeStyle;
  if (resolved.focusStyle) payload.focusStyle = resolved.focusStyle;

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || key === "children" || key === "className" || key === "style")
      continue;

    const eventType = eventPropNames[key];

    if (eventType && typeof value === "function") {
      handlers.set(eventType, value as EventHandler);
      listeners.push(eventType);
      continue;
    }

    if (typeof value !== "function" && typeof value !== "object") payload[key] = value;
  }

  if (listeners.length > 0) payload.listeners = listeners;

  return { payload, handlers };
}

function applyProps(instance: Instance, props: Record<string, unknown>): void {
  const { payload, handlers } = normalizeProps(props);
  setHandlers(instance.id, handlers);
  queueOp(["setProps", instance.id, payload]);
}

export const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  supportsMicrotasks: true,
  scheduleMicrotask: (fn: () => void) => queueMicrotask(fn),
  scheduleTimeout: (fn: (...args: unknown[]) => void, delay?: number) => setTimeout(fn, delay),
  cancelTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  noTimeout: -1 as const,

  getRootHostContext: () => ({}),
  getChildHostContext: (parent: object) => parent,
  getPublicInstance: (instance: Instance) => instance,
  prepareForCommit: () => null,
  resetAfterCommit: () => flushOps(),
  shouldSetTextContent: () => false,

  createInstance(type: string, props: Record<string, unknown>): Instance {
    const hostType = hostTypes[type];
    if (!hostType) throw new Error(`Unknown VSReacT element <${type}>`);

    const instance: Instance = { id: nextId++, type: hostType };
    queueOp(["create", instance.id, hostType]);
    applyProps(instance, props);
    return instance;
  },

  createTextInstance(text: string): TextInstance {
    const instance: TextInstance = { id: nextId++, type: "rawtext" };
    queueOp(["create", instance.id, "rawtext"]);
    queueOp(["setText", instance.id, text]);
    return instance;
  },

  appendInitialChild: (parent: Instance, child: Instance) =>
    queueOp(["appendChild", parent.id, child.id]),
  appendChild: (parent: Instance, child: Instance) =>
    queueOp(["appendChild", parent.id, child.id]),
  appendChildToContainer: (_container: unknown, child: Instance) =>
    queueOp(["appendChild", 0, child.id]),
  insertBefore: (parent: Instance, child: Instance, before: Instance) =>
    queueOp(["insertBefore", parent.id, child.id, before.id]),
  insertInContainerBefore: (_container: unknown, child: Instance, before: Instance) =>
    queueOp(["insertBefore", 0, child.id, before.id]),
  removeChild: (parent: Instance, child: Instance) =>
    queueOp(["removeChild", parent.id, child.id]),
  removeChildFromContainer: (_container: unknown, child: Instance) =>
    queueOp(["removeChild", 0, child.id]),

  finalizeInitialChildren: () => false,

  prepareUpdate: () => true,

  commitUpdate(
    instance: Instance,
    _updatePayload: unknown,
    _type: string,
    _prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>,
  ): void {
    applyProps(instance, nextProps);
  },

  commitTextUpdate(instance: TextInstance, _oldText: string, newText: string): void {
    queueOp(["setText", instance.id, newText]);
  },

  clearContainer: () => queueOp(["clearContainer"]),

  detachDeletedInstance(instance: Instance): void {
    removeHandlers(instance.id);
  },

  getCurrentEventPriority: () => DefaultEventPriority,
  getInstanceFromNode: () => null,
  getInstanceFromScope: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {},
  preparePortalMount: () => {},
};
