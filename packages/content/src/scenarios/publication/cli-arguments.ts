export function parseArguments(values: readonly string[]): ReadonlyMap<string, string | true> {
  const parsed = new Map<string, string | true>();
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index]!;
    if (token === '--') continue;
    if (!token.startsWith('--')) throw new TypeError(`Unexpected positional argument: ${token}`);
    if (parsed.has(token)) throw new TypeError(`Duplicate argument: ${token}`);
    const next = values[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      parsed.set(token, next);
      index += 1;
    } else parsed.set(token, true);
  }
  return parsed;
}

export function requiredArgument(
  argumentsMap: ReadonlyMap<string, string | true>,
  name: string,
): string {
  const value = argumentsMap.get(name);
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError(`Required argument ${name} is missing.`);
  return value;
}

export function optionalArgument(
  argumentsMap: ReadonlyMap<string, string | true>,
  name: string,
  fallback: string,
): string {
  const value = argumentsMap.get(name);
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError(`Argument ${name} requires a value.`);
  return value;
}

export function assertOnlyArguments(
  argumentsMap: ReadonlyMap<string, string | true>,
  accepted: readonly string[],
): void {
  for (const key of argumentsMap.keys())
    if (!accepted.includes(key)) throw new TypeError(`Unknown argument: ${key}`);
}
