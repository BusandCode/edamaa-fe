import type { NotificationState } from "./Types";

interface NotificationToastProps {
  notification: NotificationState;
}

export default function NotificationToast({ notification }: NotificationToastProps) {
  return (
    <div
      style={{
        position: "fixed", top: 16, right: 16, zIndex: 999,
        background: notification.type === "success" ? "#10B981" : "#3D08BA",
        color: "#fff", padding: "12px 20px", borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)", fontWeight: 600, fontSize: 13,
        animation: "slideIn 0.3s ease",
      }}
    >
      {notification.msg}
    </div>
  );
}