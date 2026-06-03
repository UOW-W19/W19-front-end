const HAS_TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function normalizeBackendTimestamp(timestamp: string): string;
export function normalizeBackendTimestamp(timestamp?: string): string | undefined;
export function normalizeBackendTimestamp(timestamp?: string): string | undefined {
  if (!timestamp) return timestamp;

  const trimmed = timestamp.trim();
  const timestampWithZone = HAS_TIMEZONE_SUFFIX.test(trimmed) ? trimmed : `${trimmed}Z`;
  const parsed = new Date(timestampWithZone);

  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toISOString();
}
