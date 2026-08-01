import type { TenantNotificationItem } from "./api";

const LOCALE_SPLIT = "\n---\n";

/** Pick localized half stored as `es\n---\nen` from notification fields. */
export function localizedNotificationText(
  value: string,
  language: string,
): string {
  if (!value.includes(LOCALE_SPLIT)) return value;
  const [es, en] = value.split(LOCALE_SPLIT);
  return language === "en" ? (en ?? es ?? value) : (es ?? en ?? value);
}

export function displayNotificationTitle(
  item: TenantNotificationItem,
  language: string,
): string {
  return localizedNotificationText(item.title, language);
}

export function displayNotificationBody(
  item: TenantNotificationItem,
  language: string,
): string {
  return localizedNotificationText(item.body, language);
}
