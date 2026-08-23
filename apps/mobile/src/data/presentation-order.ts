export interface IdentifiedChoice {
  readonly id: string;
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Stable per-exercise ordering that never consults the answer rubric. */
export function stablePresentationOrder<T extends IdentifiedChoice>(
  choices: readonly T[],
  presentationKey: string,
): readonly T[] {
  if (choices.length < 2) return [...choices];
  const ordered = [...choices];
  let state = hashText(presentationKey) || 0x9e3779b9;
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const target = (state >>> 0) % (index + 1);
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
  }
  if (ordered.every((choice, index) => choice.id === choices[index]?.id)) {
    ordered.push(ordered.shift()!);
  }
  return ordered;
}
