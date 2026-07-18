// The error boundary that reports render crashes to PostHog error
// tracking and keeps the plugin window alive with a fallback UI.

import { Component, type ReactNode } from "react";
import { posthog } from "./client";

export interface PostHogErrorBoundaryProps {
  children?: ReactNode;
  /** Rendered instead of the crashed subtree. A node, or a function of
      the error. Default: nothing. */
  fallback?: ReactNode | ((error: Error) => ReactNode);
  /** Extra properties on the captured `$exception` event. */
  properties?: Record<string, unknown>;
}

interface PostHogErrorBoundaryState {
  error: Error | null;
}

/** Wrap your app (or a risky panel):
 *
 *    <PostHogErrorBoundary fallback={<Text>Something broke.</Text>}>
 *      <App />
 *    </PostHogErrorBoundary>
 *
 *  Render errors become `$exception` events (flushed immediately —
 *  a crashed editor may close before the batch timer fires). */
export class PostHogErrorBoundary extends Component<
  PostHogErrorBoundaryProps,
  PostHogErrorBoundaryState
> {
  state: PostHogErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PostHogErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    posthog.captureException(error, this.props.properties);
    posthog.flush();
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function" ? fallback(error) : (fallback ?? null);
  }
}
