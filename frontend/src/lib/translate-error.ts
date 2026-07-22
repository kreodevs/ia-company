const GENERIC_API_MESSAGES =
  /^(Login failed|Save failed|Delete failed|Request failed|Reset failed|Setup failed|Sync failed|Create failed|Reseed failed|Failed to create tenant|Failed to create user)$/i;

export function translateApiError(
  err: unknown,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (!(err instanceof Error)) return t(fallbackKey);
  const msg = err.message.trim();
  if (!msg || GENERIC_API_MESSAGES.test(msg)) return t(fallbackKey);
  return msg;
}
