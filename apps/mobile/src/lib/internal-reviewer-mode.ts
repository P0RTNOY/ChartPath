export function isInternalReviewerModeEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_CHARTPATH_REVIEWER_MODE === '1';
}
