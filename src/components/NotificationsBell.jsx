import React, { useEffect, useState, useRef } from 'react';
import { Bell, X, CheckCheck, ShoppingBag, Package, Truck, CheckCircle, XCircle, Tag, Info } from 'lucide-react';
import { fetchUserNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

const TYPE_ICON = {
  order_placed:          { icon: ShoppingBag, color: '#6366f1' },
  order_paid:            { icon: CheckCircle, color: '#10b981' },
  order_processing:      { icon: Package,     color: '#3b82f6' },
  order_out_for_delivery:{ icon: Truck,       color: '#f59e0b' },
  order_delivered:       { icon: CheckCircle, color: '#10b981' },
  order_cancelled:       { icon: XCircle,     color: '#ef4444' },
  promo:                 { icon: Tag,         color: '#f2cc0d' },
  system:                { icon: Info,        color: '#6366f1' },
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsBell() {
  const { user } = useAuthStore();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unread = notifs.filter(n => !n.is_read).length;

  const load = async () => {
    if (!user?.id) return;
    try { setNotifs(await fetchUserNotifications(user.id)); } catch {}
  };

  useEffect(() => {
    if (!user?.id) return;
    load();
    // Realtime subscription
    const ch = supabase
      .channel(`notifs:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleReadAll = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  if (!user) return null;

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(242,204,13,0.3)'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '18px', height: '18px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', borderRadius: '50%', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', padding: '0 3px', boxShadow: '0 2px 8px rgba(242,204,13,0.4)', animation: 'notifPulse 2s infinite' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: '340px', background: 'linear-gradient(145deg,#111,#0a0a0a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', zIndex: 999, overflow: 'hidden', animation: 'dropIn 0.2s ease' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Notifications</span>
              {unread > 0 && <span style={{ marginLeft: '8px', background: 'rgba(242,204,13,0.15)', color: '#f2cc0d', borderRadius: '50px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{unread} new</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unread > 0 && (
                <button onClick={handleReadAll} style={{ background: 'none', border: 'none', color: '#f2cc0d', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={14} /></button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <Bell size={36} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => {
                const { icon: Icon, color } = TYPE_ICON[n.type] || TYPE_ICON.system;
                return (
                  <div key={n.id}
                    onClick={() => !n.is_read && handleRead(n.id)}
                    style={{ display: 'flex', gap: '12px', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.is_read ? 'transparent' : 'rgba(242,204,13,0.04)', cursor: n.is_read ? 'default' : 'pointer', transition: 'background 0.2s' }}
                    onMouseOver={e => { if (!n.is_read) e.currentTarget.style.background = 'rgba(242,204,13,0.08)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(242,204,13,0.04)'; }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: n.is_read ? 500 : 700, color: n.is_read ? 'rgba(255,255,255,0.7)' : '#fff', fontSize: '0.85rem', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.body}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f2cc0d', flexShrink: 0, marginTop: '6px', boxShadow: '0 0 6px rgba(242,204,13,0.5)' }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}
