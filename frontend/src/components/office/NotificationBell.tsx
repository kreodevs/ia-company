import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, type TenantNotificationItem } from "../../lib/api";
import {
  displayNotificationBody,
  displayNotificationTitle,
} from "../../lib/notification-display";
import { toast } from "../molecules/Sonner";
import { cn } from "../../lib/utils";

const POLL_MS = 30_000;
const POLL_MS_HIDDEN = 120_000;
const SEEN_KEY = "ac-notif-seen";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)));
}

function maybeBrowserNotify(item: TenantNotificationItem, language: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const n = new Notification(displayNotificationTitle(item, language), {
    body: displayNotificationBody(item, language),
    tag: item.id,
  });
  if (item.href) {
    n.onclick = () => {
      window.focus();
      window.location.assign(item.href!);
    };
  }
}

export function useOfficeNotifications(enabled: boolean) {
  const { t, i18n } = useTranslation();
  const seenRef = useRef(loadSeen());
  const initializedRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<TenantNotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await api.office.notifications({ limit: 15 });
      setItems(data.items);
      setUnreadCount(data.unreadCount);

      for (const item of data.items) {
        if (!initializedRef.current) {
          seenRef.current.add(item.id);
          continue;
        }
        if (seenRef.current.has(item.id)) continue;
        seenRef.current.add(item.id);
        saveSeen(seenRef.current);
        if (!item.readAt) {
          const title = displayNotificationTitle(item, i18n.language);
          const body = displayNotificationBody(item, i18n.language);
          toast(title, {
            description: body,
            action: item.href
              ? {
                  label: t("office.notifications.view"),
                  onClick: () => {
                    window.location.assign(item.href!);
                  },
                }
              : undefined,
          });
          maybeBrowserNotify(item, i18n.language);
        }
      }
      if (!initializedRef.current) {
        saveSeen(seenRef.current);
        initializedRef.current = true;
      }
    } catch {
      // ignore polling errors
    }
  }, [enabled, t, i18n.language]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const tick = () => {
      const delay = document.hidden ? POLL_MS_HIDDEN : POLL_MS;
      return window.setTimeout(() => {
        void refresh().finally(() => {
          timer = tick();
        });
      }, delay);
    };
    let timer = tick();
    const onVisibility = () => {
      window.clearTimeout(timer);
      timer = tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  const markRead = async (id: string) => {
    await api.office.markNotificationRead(id);
    void refresh();
  };

  const markAllRead = async () => {
    await api.office.markAllNotificationsRead();
    void refresh();
  };

  return { unreadCount, items, open, setOpen, refresh, markRead, markAllRead };
}

export interface NotificationBellProps {
  enabled: boolean;
}

export default function NotificationBell({ enabled }: NotificationBellProps) {
  const { t, i18n } = useTranslation();
  const { unreadCount, items, open, setOpen, markRead, markAllRead } =
    useOfficeNotifications(enabled);

  if (!enabled) return null;

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="office-notif-backdrop"
              aria-label={t("common.close")}
              onClick={() => setOpen(false)}
            />
            <div
              className="office-notif-panel office-notif-panel-portal"
              role="dialog"
              aria-label={t("office.notifications.title")}
            >
              <div className="office-notif-panel-head">
                <p>{t("office.notifications.title")}</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="office-notif-mark-all"
                    onClick={() => void markAllRead()}
                  >
                    {t("office.notifications.markAllRead")}
                  </button>
                )}
              </div>
              <ul className="office-notif-list">
                {items.length === 0 ? (
                  <li className="office-notif-empty">{t("office.notifications.empty")}</li>
                ) : (
                  items.map((item) => (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          to={item.href}
                          className={cn("office-notif-item", !item.readAt && "office-notif-item-unread")}
                          onClick={() => {
                            void markRead(item.id);
                            setOpen(false);
                          }}
                        >
                          <NotificationRow item={item} t={t} language={i18n.language} />
                        </Link>
                      ) : (
                        <div
                          className={cn("office-notif-item", !item.readAt && "office-notif-item-unread")}
                          onClick={() => void markRead(item.id)}
                          onKeyDown={() => undefined}
                          role="button"
                          tabIndex={0}
                        >
                          <NotificationRow item={item} t={t} language={i18n.language} />
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={cn("office-notif-btn interactive shrink-0", open && "office-notif-btn-active")}
        aria-label={t("office.notifications.title")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="office-notif-badge" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}

function NotificationRow({
  item,
  t,
  language,
}: {
  item: TenantNotificationItem;
  t: (key: string) => string;
  language: string;
}) {
  const isDepartmentReady = item.type === "department_run_completed";
  return (
    <>
      <p className="office-notif-item-title">{displayNotificationTitle(item, language)}</p>
      <p className="office-notif-item-body">{displayNotificationBody(item, language)}</p>
      <p className="office-notif-item-meta" data-dept-ready={isDepartmentReady ? "true" : undefined}>
        {t(`office.notifications.types.${item.type}`)} ·{" "}
        {new Date(item.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </>
  );
}

export function NotificationPermissionPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="office-notif-permission">
      <p>{t("office.notifications.browserHint")}</p>
      <button
        type="button"
        className="office-notif-permission-btn"
        onClick={() => {
          void Notification.requestPermission().finally(() => setVisible(false));
        }}
      >
        {t("office.notifications.enableBrowser")}
      </button>
      <button type="button" className="office-notif-permission-dismiss" onClick={() => setVisible(false)}>
        {t("office.notifications.dismiss")}
      </button>
    </div>
  );
}
