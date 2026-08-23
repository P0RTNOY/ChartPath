import { isLessonUnlocked, isUnitUnlocked, lessons, units } from './catalog';

describe('catalog prerequisite gates', () => {
  it('unlocks only the first lesson until its prerequisite is completed', () => {
    const first = lessons[0]!;
    const second = lessons[1]!;
    expect(isLessonUnlocked(first.id, {})).toBe(true);
    expect(isLessonUnlocked(second.id, {})).toBe(false);
    expect(
      isLessonUnlocked(second.id, {
        [first.id]: { status: 'completed' },
      }),
    ).toBe(true);
  });

  it('does not unlock a later unit through a direct route', () => {
    const firstUnit = units.find((unit) => unit.prerequisiteUnitIds.length === 0)!;
    const laterUnit = units.find((unit) => unit.prerequisiteUnitIds.length > 0)!;
    expect(isUnitUnlocked(firstUnit.id, {})).toBe(true);
    expect(isUnitUnlocked(laterUnit.id, {})).toBe(false);
  });
});
