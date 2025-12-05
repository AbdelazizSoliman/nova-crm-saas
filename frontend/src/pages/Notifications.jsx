import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { formatTimeAgo, formatTimestamp, notificationGroupLabel } from "../utils/datetime";
import { getNotificationLink, notificationTitle } from "../utils/notifications";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

const PER_PAGE = 20;

export default function Notifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { setUnreadCount, refreshUnreadCount } = useNotifications() || {};

  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    fetchNotifications(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter]);

  const fetchNotifications = async (pageToLoad = 1, filterValue = filter) => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotifications({
        token,
        unread: filterValue === "unread",
        page: pageToLoad,
        perPage: PER_PAGE,
      });
      setNotifications(data.data || []);
      setMeta(data.meta || {});
      setPage(pageToLoad);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const groupedNotifications = useMemo(() => {
    const groups = notifications.reduce((acc, notification) => {
      const label = notificationGroupLabel(notification.created_at);
      acc[label] = acc[label] || [];
      acc[label].push(notification);
      return acc;
    }, {});

    const orderedLabels = ["Today", "This Week", "Older", ...Object.keys(groups)];
    const seen = new Set();

    return orderedLabels
      .filter((label) => {
        if (seen.has(label)) return false;
        seen.add(label);
        return groups[label];
      })
      .map((label) => ({ label, items: groups[label] }));
  }, [notifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );
      setUnreadCount?.((prev) => Math.max(prev - 1, 0));

      try {
        await markNotificationRead({ token, id: notification.id });
      } catch (err) {
        console.error("Failed to mark notification as read", err);
        refreshUnreadCount?.();
      }
    }

    const link = getNotificationLink(notification);
    if (link) navigate(link);
  };

  const handleMarkAll = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount?.(0);

    try {
      await markAllNotificationsRead({ token });
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      refreshUnreadCount?.();
    }
  };

  const handlePageChange = (direction) => {
    const nextPage = direction === "next" ? page + 1 : page - 1;
    if (nextPage < 1 || nextPage > (meta.total_pages || 1)) return;
    fetchNotifications(nextPage);
  };

  const emptyState = !loading && notifications.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Inbox</p>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            Stay up to date with activity across billing, subscriptions, and your team.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          Mark all as read
        </button>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex gap-2">
            {FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  filter === tab.key
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {meta.total_records || notifications.length} total
          </p>
        </div>

        {loading && (
          <div className="space-y-3 py-6">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-full rounded bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && <div className="py-6 text-sm text-red-600">{error}</div>}

        {emptyState && !error && (
          <div className="py-10 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">No notifications yet.</p>
            <p className="mt-2 text-sm">You will see updates here as your team works.</p>
          </div>
        )}

        {!loading && !error && groupedNotifications.length > 0 && (
          <div className="divide-y divide-slate-100">
            {groupedNotifications.map(({ label, items }) => (
              <div key={label} className="py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <div className="space-y-2">
                  {items.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        notification.read
                          ? "border-slate-100 bg-white hover:border-slate-200"
                          : "border-blue-100 bg-blue-50/70 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              notification.read ? "text-slate-700" : "text-slate-900"
                            }`}
                          >
                            {notificationTitle(notification)}
                          </p>
                          {notification.body && (
                            <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                          )}
                        </div>
                        {!notification.read && <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatTimeAgo(notification.created_at)}</span>
                        <span>•</span>
                        <span>{formatTimestamp(notification.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && meta.total_pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => handlePageChange("prev")}
              className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1}
            >
              Previous
            </button>
            <p>
              Page {meta.current_page || page} of {meta.total_pages}
            </p>
            <button
              type="button"
              onClick={() => handlePageChange("next")}
              className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= (meta.total_pages || 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
