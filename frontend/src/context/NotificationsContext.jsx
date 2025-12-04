import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getUnreadCount } from "../api/notifications";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await getUnreadCount({ token });
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Failed to load unread notifications", error);
    }
  }, [token]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!token) return undefined;

    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token, refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
