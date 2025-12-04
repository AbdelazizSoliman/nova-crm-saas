import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BellIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { formatTimeAgo } from "../utils/datetime";
import { getNotificationLink } from "../utils/notifications";

const POLL_LIMIT = 10;

export default function NotificationsDropdown() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { unreadCount, setUnreadCount, refreshUnreadCount } = useNotifications() || {};

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !token) return;

    loadNotifications();
  }, [open, token]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotifications({ token, perPage: POLL_LIMIT });
      setNotifications(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notification) => {
    if (!notification || notification.read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    if (setUnreadCount) {
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    try {
      await markNotificationRead({ token, id: notification.id });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
      refreshUnreadCount?.();
    }
  };

  const handleMarkAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount?.(0);

    try {
      await markAllNotificationsRead({ token });
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      refreshUnreadCount?.();
    }
  };

  const handleItemClick = async (notification) => {
    await handleMarkRead(notification);
    const link = getNotificationLink(notification);
    if (link) {
      navigate(link);
      setOpen(false);
    }
  };

  const badgeLabel = unreadCount > 9 ? "9+" : unreadCount;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl bg-white shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse space-y-2 rounded-lg bg-slate-50 p-3">
                    <div className="h-3 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-48 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="p-4 text-sm text-red-600">{error}</div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">No notifications yet.</div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(notification)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="pt-0.5">
                        <CheckCircleIcon
                          className={`h-5 w-5 ${notification.read ? "text-slate-300" : "text-blue-500"}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${notification.read ? "text-slate-600" : "text-slate-900"}`}
                        >
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notification.body}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">{formatTimeAgo(notification.created_at)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 text-center">
            <Link
              to="/notifications"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
