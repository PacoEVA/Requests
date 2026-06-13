import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications, type AppNotification } from "../../contexts/RealtimeNotificationsContext";

interface NotificationBellProps {
  scope: "admin" | "employee";
}

function notificationDate(notification: AppNotification) {
  if (!notification.createdAt) return "";
  const date = new Date(notification.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function NotificationBell({ scope }: NotificationBellProps) {
  const navigate = useNavigate();
  const { unreadCount, unreadNotifications, markAsRead, markAllAsRead } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const label = useMemo(
    () => `${unreadCount} notificacion${unreadCount === 1 ? "" : "es"} sin leer`,
    [unreadCount]
  );

  const openNotification = (notification: AppNotification) => {
    markAsRead(notification.id);
    setOpen(false);

    if (notification.requisitionId) {
      const basePath = scope === "admin" ? "/admin/requisitions" : "/employee/requisitions";
      navigate(`${basePath}/${notification.requisitionId}`);
    }
  };

  return (
    <div className="notification-menu">
      <button
        type="button"
        className="icon-text-button notification-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="notification-icon">
          <Bell size={18} />
          <span className="notification-badge">{unreadCount}</span>
        </span>
        Notificaciones
      </button>

      {open ? (
        <section className="notification-panel" aria-label="Notificaciones sin leer">
          <div className="notification-panel-header">
            <strong>{label}</strong>
            <button type="button" className="notification-mark-all" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck size={16} /> Leer todo
            </button>
          </div>

          {unreadNotifications.length === 0 ? (
            <div className="notification-empty">
              <Inbox size={18} />
              <span>No hay pendientes</span>
            </div>
          ) : (
            <div className="notification-list">
              {unreadNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="notification-item"
                  onClick={() => openNotification(notification)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <small>{notificationDate(notification)}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
