# @vsreact/posthog

**PostHog analytics for [VSReacT](https://www.npmjs.com/package/@vsreact/core) plugins.**

Product analytics, error tracking, and session insights for native
JUCE VSTs whose UI is written in React. Capture happens in JS; the
native `vsreact::PostHogBridge` delivers batches over HTTPS on a
background thread — QuickJS has no network, and your API key stays in
C++.

```tsx
import { render, GenericEditor, Text } from "@vsreact/core";
import {
  posthog,
  usePostHogParameters,
  useEditorSession,
  PostHogErrorBoundary,
} from "@vsreact/posthog";

posthog.init({ defaultProperties: { plugin_version: "1.2.0" } });

function App() {
  useEditorSession();       // editor_session_start / _end { duration_ms }
  usePostHogParameters();   // every knob tweak, debounced per parameter
  return <GenericEditor />;
}

render(
  <PostHogErrorBoundary fallback={<Text>Something broke.</Text>}>
    <App />
  </PostHogErrorBoundary>,
);
```

Three hooks and you know which knobs users touch, how long they keep
the editor open, and every render crash — as properly-shaped
`$exception` events in PostHog error tracking.

## Install

```sh
bun add @vsreact/posthog @vsreact/core
```

Wire the native half (the API key lives here, not in JS):

```cpp
vsreact::PostHogBridge::Options analytics;
analytics.apiKey = "phc_...";
analytics.host = "https://eu.i.posthog.com";
analytics.stateFile = appData.getChildFile ("posthog-id.txt");
posthog = std::make_unique<vsreact::PostHogBridge> (analytics);

options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
{
    if (auto handled = posthog->handleNativeCall (name, args)) return *handled;
    if (auto handled = bridge.handleNativeCall (name, args))   return *handled;
    return {};
};
```

## The client

posthog-js-shaped, tuned for plugins:

- `capture`, `identify`, `alias`, `set`, `setOnce`, `register`,
  `registerOnce`, `unregister`, `group`, `reset`, `flush`
- `captureException(error)` + `<PostHogErrorBoundary>` — error
  tracking with QuickJS stacks, self-flushing on crash
- `optOut()` / `optIn()` / `optedOut` — the consent switch;
  `init({ optOut })` starts disabled
- `init({ beforeSend })` to scrub or veto, `init({ propertyDenylist })`
  to strip keys mechanically, `init({ sampleRate })` for whole-session
  sampling, `init({ maxQueueSize })` to cap memory
- `time(name)` / `timeEnd(name)` stopwatch captures,
  `screen(name)` / `useScreen(name)` for panel analytics,
  `shutdown()` for editor teardown, `debug(true)` for dev logging

## Hooks

- `usePostHogParameters()` — one debounced `parameter_changed
  { parameter_id, value, text }` per touched parameter
- `useEditorSession()` — brackets the editor lifetime with
  `duration_ms`
- `useCaptureOnMount` / `useCaptureOnUnmount` — panel views
- `useScreen(name)` — PostHog screen analytics
- `usePostHog()` — the client, for components

## Docs

Full guide: <https://vsreact.n9records.com/docs/posthog>

MIT © N9 Records Technologies
