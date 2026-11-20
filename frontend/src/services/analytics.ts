import posthog from 'posthog-js'

// Usage analytics via PostHog. Visitors don't sign in, so PostHog gives each browser an anonymous id,
// which is what unique users, daily/weekly actives and retention are counted by.
// Off unless VITE_POSTHOG_KEY is set, and always off in `npm run dev`, so local work doesn't count as usage.
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com'

let enabled = false

export function initAnalytics() {
  if (!KEY || import.meta.env.DEV) return
  posthog.init(KEY, {
    api_host: HOST,
    // The app routes in the browser, so a page view is recorded on every route change, not just page loads.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // No sign-in, so no person profiles; anonymous events still count unique visitors.
    person_profiles: 'identified_only',
  })
  enabled = true
}

// The things people do in the app, named so the PostHog dashboards read plainly.
export type AnalyticsEvent =
  | 'match_opened'
  | 'playback_started'
  | 'sidebar_panel_opened'
  | 'overlay_toggled'
  | 'overlay_panel_opened'
  | 'annotation_added'
  | 'moment_added'
  | 'project_saved'
  | 'project_loaded'

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (enabled) posthog.capture(event, properties)
}
