export type ReducedMotionPreferenceValue = boolean | 'system';

/** An in-app false value never disables an operating-system accessibility request. */
export function resolveReducedMotion(
  systemReducedMotion: boolean,
  preference: ReducedMotionPreferenceValue,
): boolean {
  return preference === 'system' ? systemReducedMotion : preference || systemReducedMotion;
}
