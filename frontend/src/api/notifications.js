import { apiRequest } from "./client";

export async function getNotifications({ token, unread = false, page = 1, perPage = 20 } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("per_page", perPage);
  if (unread) params.set("unread", "true");

  return apiRequest(`/notifications?${params.toString()}`, { token });
}

export async function getUnreadCount({ token }) {
  return apiRequest("/notifications/unread_count", { token });
}

export async function markNotificationRead({ token, id }) {
  return apiRequest(`/notifications/${id}/mark_read`, { method: "PATCH", token });
}

export async function markAllNotificationsRead({ token }) {
  return apiRequest("/notifications/mark_all_read", { method: "PATCH", token });
}
