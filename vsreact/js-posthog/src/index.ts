// @vsreact/posthog — PostHog analytics for VSReacT plugins.
export { posthog } from "./client";
export type { PostHogInitOptions, PostHogEvent, PostHogClient } from "./client";
export {
  usePostHog,
  useCaptureOnMount,
  useCaptureOnUnmount,
  useEditorSession,
  useScreen,
  usePostHogParameters,
} from "./hooks";
export type { PostHogParametersOptions, EditorSessionOptions } from "./hooks";
export { PostHogErrorBoundary } from "./boundary";
export type { PostHogErrorBoundaryProps } from "./boundary";
