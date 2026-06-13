import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { notificationService, type NotificationCredentials, type NotificationRecord } from "../services/notification.service";
import { useAuth } from "./AuthContext";
import { useEmployee } from "./EmployeeContext";
import { useSocket } from "./SocketContext";

interface RealtimeNotice {
  id: number;
  title: string;
  message: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  requisitionId: number | null;
  createdAt: string | null;
}

interface RealtimeNotificationsValue {
  permission: NotificationPermission | "unsupported";
  unreadCount: number;
  unreadNotifications: AppNotification[];
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  requestBrowserPermission: () => Promise<void>;
}

const RealtimeNotificationsContext = createContext<RealtimeNotificationsValue | null>(null);

function notificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readPermission(): NotificationPermission | "unsupported" {
  return notificationSupported() ? Notification.permission : "unsupported";
}

function payloadText(payload: unknown, key: string, fallback = "") {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const value = record[key] ?? record[key.charAt(0).toUpperCase() + key.slice(1)];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function payloadNumber(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const value = record[key] ?? record[key.charAt(0).toUpperCase() + key.slice(1)];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function normalizeNotification(payload: NotificationRecord | unknown): AppNotification | null {
  const id = payloadNumber(payload, "id");
  if (!id) return null;

  return {
    id,
    title: payloadText(payload, "title", "Nueva notificacion"),
    message: payloadText(payload, "message", "Hay una actualizacion en Requests."),
    type: payloadText(payload, "type", "GENERAL"),
    requisitionId: payloadNumber(payload, "requisitionId"),
    createdAt: payloadText(payload, "createdAt", "") || null
  };
}

function activeRequisitionId(pathname: string) {
  const match = pathname.match(/\/requisitions\/(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function addUnread(current: AppNotification[], notification: AppNotification) {
  if (current.some((item) => item.id === notification.id)) return current;
  return [notification, ...current].slice(0, 50);
}

export function RealtimeNotificationsProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const location = useLocation();
  const { token } = useAuth();
  const { employeeToken } = useEmployee();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(readPermission);
  const [notices, setNotices] = useState<RealtimeNotice[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<AppNotification[]>([]);

  const credentials = useMemo<NotificationCredentials>(() => {
    if (location.pathname.startsWith("/admin")) return { token };
    return { employeeToken };
  }, [employeeToken, location.pathname, token]);
  const hasCredentials = Boolean(credentials.token || credentials.employeeToken);

  const removeNotice = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const pushNotice = useCallback(
    (title: string, message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setNotices((current) => [...current.slice(-3), { id, title, message }]);

      window.setTimeout(() => removeNotice(id), 7000);

      if (notificationSupported() && Notification.permission === "granted") {
        new Notification(title, {
          body: message,
          tag: `requests-${id}`
        });
      }
    },
    [removeNotice]
  );

  const requestBrowserPermission = useCallback(async () => {
    if (!notificationSupported()) {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      pushNotice("Notificaciones activadas", "Recibiras avisos cuando haya mensajes o cambios en requisiciones.");
    }
  }, [pushNotice]);

  const markAsRead = useCallback(
    (notificationId: number) => {
      setUnreadNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      socket?.emit("notification:read", { notificationId });

      if (hasCredentials) {
        notificationService.markRead(credentials, notificationId).catch(() => {
          setUnreadNotifications((current) => current);
        });
      }
    },
    [credentials, hasCredentials, socket]
  );

  const markAllAsRead = useCallback(() => {
    unreadNotifications.forEach((notification) => markAsRead(notification.id));
  }, [markAsRead, unreadNotifications]);

  useEffect(() => {
    if (!hasCredentials) {
      setUnreadNotifications([]);
      return;
    }

    let cancelled = false;
    notificationService
      .unread(credentials)
      .then((response) => {
        if (cancelled) return;
        setUnreadNotifications(response.notifications.map(normalizeNotification).filter(Boolean) as AppNotification[]);
      })
      .catch(() => {
        if (!cancelled) setUnreadNotifications([]);
      });

    return () => {
      cancelled = true;
    };
  }, [credentials, hasCredentials]);

  useEffect(() => {
    if (!socket) return;

    const onNotification = (payload: unknown) => {
      const title = payloadText(payload, "title", "Nueva notificacion");
      const message = payloadText(payload, "message", "Hay una actualizacion en Requests.");
      const notification = normalizeNotification(payload);
      const isCurrentRequisition =
        Boolean(notification?.requisitionId) &&
        notification?.requisitionId === activeRequisitionId(location.pathname) &&
        document.visibilityState === "visible";

      pushNotice(title, message);

      if (!notification) return;
      if (isCurrentRequisition) {
        markAsRead(notification.id);
        return;
      }

      setUnreadNotifications((current) => addUnread(current, notification));
    };

    const onNotificationRead = ({ notificationId }: { notificationId?: number }) => {
      if (!notificationId) return;
      setUnreadNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    };

    socket.on("notification:new", onNotification);
    socket.on("notification:read", onNotificationRead);

    return () => {
      socket.off("notification:new", onNotification);
      socket.off("notification:read", onNotificationRead);
    };
  }, [location.pathname, markAsRead, pushNotice, socket]);

  const value = useMemo(
    () => ({
      permission,
      unreadCount: unreadNotifications.length,
      unreadNotifications,
      markAsRead,
      markAllAsRead,
      requestBrowserPermission
    }),
    [markAllAsRead, markAsRead, permission, requestBrowserPermission, unreadNotifications]
  );

  return (
    <RealtimeNotificationsContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {notices.map((notice) => (
          <article key={notice.id} className="realtime-toast">
            <Bell size={18} />
            <div>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
            </div>
            <button type="button" className="toast-close" aria-label="Cerrar notificacion" onClick={() => removeNotice(notice.id)}>
              <X size={16} />
            </button>
          </article>
        ))}
      </div>
    </RealtimeNotificationsContext.Provider>
  );
}

export function useRealtimeNotifications() {
  const context = useContext(RealtimeNotificationsContext);
  if (!context) {
    throw new Error("useRealtimeNotifications debe usarse dentro de RealtimeNotificationsProvider");
  }
  return context;
}
