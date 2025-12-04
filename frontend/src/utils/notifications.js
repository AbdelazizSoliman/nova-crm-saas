export function getNotificationLink(notification) {
  if (!notification) return null;

  switch (notification.notifiable_type) {
    case "Invoice":
      return notification.notifiable_id ? `/invoices/${notification.notifiable_id}` : "/invoices";
    case "Payment":
      return "/payments";
    case "Subscription":
      return "/billing";
    case "User":
      return "/settings/team";
    default:
      return null;
  }
}

export function notificationTitle(notification) {
  return notification?.title || "Notification";
}
