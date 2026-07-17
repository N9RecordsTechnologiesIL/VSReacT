// @vsreact/posthog — PostHog analytics for VSReacT plugins.
export { posthog } from "./client";
export type { PostHogInitOptions, PostHogEvent, PostHogClient } from "./client";
export { usePostHog, useCaptureOnMount, usePostHogParameters } from "./hooks";
export type { PostHogParametersOptions } from "./hooks";
