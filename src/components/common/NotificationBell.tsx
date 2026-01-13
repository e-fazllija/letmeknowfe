import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchNotificationSnapshot, getLastSeenAt, setLastSeenNow, type NotifItem } from "@/lib/notifications.service";

const BellIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2a6 6 0 0 0-6 6v3.586l-1.707 1.707A1 1 0 0 0 5 15h14a1 1 0 0 0 .707-1.707L18 11.586V8a6 6 0 0 0-6-6z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 18a3 3 0 0 0 6 0" fill="none" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const formatTime = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "adesso";
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h fa`;
  const d = Math.floor(h / 24);
  return `${d} g fa`;
};

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [count, setCount] = useState(0);
  const timerRef = useRef<number | null>(null);
  const openRef = useRef<boolean>(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const displayCount = useMemo(() => {
    if (count <= 0) return "";
    return count > 99 ? "99+" : String(count);
  }, [count]);

  async function fetchNow(force = false) {
    const snap = await fetchNotificationSnapshot();
    if (force || !openRef.current) {
      setItems(snap.items.slice(-20));
      setCount(snap.total);
    } else {
      // Se sta leggendo, non sovrascrivere l’elenco; azzera solo il badge
      setCount(0);
    }
    return snap.pollMs;
  }

  const schedule = async () => {
    try {
      const pollMs = await fetchNow(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(schedule, Math.max(5000, pollMs));
    } catch {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(schedule, 45000);
    }
  };

  useEffect(() => {
    schedule();
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => { openRef.current = open; }, [open]);

  // Chiudi cliccando fuori da campanella o menu
  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      if (!open) return;
      const target = ev.target as Node | null;
      const insideBtn = btnRef.current && target && btnRef.current.contains(target);
      const insideMenu = menuRef.current && target && menuRef.current.contains(target);
      if (!insideBtn && !insideMenu) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const onClickItem = (reportId?: string) => {
    if (reportId) {
      window.location.hash = `#/reports/${encodeURIComponent(reportId)}`;
    }
    setOpen(false);
  };

  return (
    <div className="dropdown me-3">
      <button
        ref={btnRef}
        className="btn btn-link position-relative d-flex align-items-center"
        type="button"
        aria-label="Notifiche"
        style={{ color: "#f08010" }}
        onMouseDown={(e) => {
          // Mantieni la tendina aperta al click sulla campanella
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
            setLastSeenNow();
            setCount(0);
            if (items.length === 0) { fetchNow(true).catch(() => {}); }
          }
        }}
      >
        <BellIcon filled={count > 0} />
        {count > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {displayCount}
            <span className="visually-hidden">non lette</span>
          </span>
        )}
      </button>

      <div
        ref={menuRef}
        className={`dropdown-menu shadow ${open ? "show" : ""}`}
        style={{ minWidth: 340, maxWidth: 420, left: "50%", transform: "translateX(-50%)", right: "auto", top: "110%" }}
        onMouseDown={(e) => { e.stopPropagation(); }}
      >
        <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
          <strong>Notifiche</strong>
          <small className="text-muted">Ultimo visto: {new Date(getLastSeenAt()).toLocaleString()}</small>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-3 text-muted">Nessuna notifica</div>
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {items.slice(-20).reverse().map((n) => (
              <div key={n.id} className="px-3 py-2 border-bottom">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="me-2 flex-grow-1">
                    <div className="fw-semibold text-truncate">
                      <span className={`badge me-2 ${n.type === 'report' ? 'bg-success' : n.type === 'message' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                        {n.type}
                      </span>
                      {n.title}
                    </div>
                    {n.subtitle && <div className="small text-muted text-truncate">{n.subtitle}</div>}
                    <div className="small text-muted">{formatTime(new Date(n.createdAt).getTime())}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-primary" onClick={() => onClickItem(n.reportId)}>Apri</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationBell;
