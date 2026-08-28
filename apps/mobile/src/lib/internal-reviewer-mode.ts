export function isInternalReviewerModeEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE === '1';
}

/**
 * Central route boundary for persisted internal QA state. A `qa=1` deep link is not sufficient:
 * the installed application must also be a development reviewer build.
 */
export function isInternalQaDeepLinkAllowed(qaRequested: boolean): boolean {
  return !qaRequested || isInternalReviewerModeEnabled();
}
