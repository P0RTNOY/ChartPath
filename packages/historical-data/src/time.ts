const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const LOCAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

export function isValidUtcTimestamp(value: string): boolean {
  if (!UTC_TIMESTAMP.test(value)) return false;
  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString().startsWith(value.slice(0, 19))
  );
}

export function isValidIanaTimezone(value: string): boolean {
  if (!value || value === 'UTC') return value === 'UTC';
  try {
    const resolved = new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
    return resolved === value;
  } catch {
    return false;
  }
}

export function deriveExchangeLocalTimestamp(timestampUtc: string, timezone: string): string {
  if (!isValidUtcTimestamp(timestampUtc))
    throw new RangeError(`Invalid UTC timestamp: ${timestampUtc}`);
  if (!isValidIanaTimezone(timezone)) throw new RangeError(`Invalid IANA timezone: ${timezone}`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(timestampUtc));
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  const local = `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}`;
  if (!LOCAL_TIMESTAMP.test(local))
    throw new RangeError('Unable to derive exchange-local timestamp.');
  return local;
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
