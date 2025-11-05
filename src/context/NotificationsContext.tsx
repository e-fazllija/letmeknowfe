import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type LmwNotification = {
  id: string;
  title: string;
  body?: string;
  link?: string;      // es. "#/reports/123"
  createdAt: number;  // Date.now()
  read: boolean;
};

type NotificationsCtx = {
  notifications: LmwNotification[];
  unseenCount: number;
  notify: (n: Omit<LmwNotification, "id" | "createdAt" | "read">) => void;
  markAllAsRead: () => void;
  removeById: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsCtx | null>(null);

export const NotificationsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<LmwNotification[]>([]);
  const idSeq = useRef(0);

  const notify: NotificationsCtx["notify"] = useCallback((n) => {
    idSeq.current += 1;
    const next: LmwNotification = {
      id: `n${Date.now()}_${idSeq.current}`,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: Date.now(),
      read: false,
    };
    setItems((prev) => [next, ...prev].slice(0, 100)); // cap 100 in memoria
  }, []);

  const markAllAsRead = useCallback(() => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  }, []);

  const removeById = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const unseenCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  const value = useMemo(
    () => ({ notifications: items, unseenCount, notify, markAllAsRead, removeById }),
    [items, unseenCount, notify, markAllAsRead, removeById]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotificationsContext = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotificationsContext must be used within NotificationsProvider");
  return ctx;
};

