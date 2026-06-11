import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, X } from "lucide-react";
import { useSocket } from "./SocketContext";

interface RealtimeNotice {
  id: number;
  title: string;
  message: string;
}

interface RealtimeNotificationsValue {
  permission: NotificationPermission | "unsupported";
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

export function RealtimeNotificationsProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(readPermission);
  const [notices, setNotices] = useState<RealtimeNotice[]>([]);

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

  useEffect(() => {
    if (!socket) return;

    const onNotification = (payload: unknown) => {
      const title = payloadText(payload, "title", "Nueva notificacion");
      const message = payloadText(payload, "message", "Hay una actualizacion en Requests.");
      pushNotice(title, message);
    };

    socket.on("notification:new", onNotification);

    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [pushNotice, socket]);

  const value = useMemo(
    () => ({
      permission,
      requestBrowserPermission
    }),
    [permission, requestBrowserPermission]
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
