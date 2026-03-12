import React, { useEffect, useState, useCallback } from 'react';
import { History, RefreshCw, Search, Filter } from 'lucide-react';
import { fetchAdminActivityLogs, fetchAllUsers } from '../../lib/db';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  create:         { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  update:         { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  update_status:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  update_role:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  delete:         { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  upsert_setting: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  default:        { color: '#a0a0a0', bg: 'rgba(160,160,160,0.1)' },
};

const ENTITY_ICONS = { product: '📦', order: '🛒', profile: '👤', admin_setting: '⚙️' };

function timeSince(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

function ActivityRow({ log, usersById }) {
  const actionMeta = ACTION_COLORS[log.action_type] || ACTION_COLORS.default;
  const adminName = usersById[log.admin_id]?.full_name || 'System';
  const entityIcon = ENTITY_ICONS[log.entity_type] || '🔧';
  const details = log.details || {};
  const detailStr = Object.entries(details).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('  ·  ') || '—';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      {/* Entity icon */}
      <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
        {entityIcon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
          <span style={{ padding: '2px 10px', borderRadius: '50px', background: actionMeta.bg, color: actionMeta.color, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
            {log.action_type.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            {log.entity_type}
            {log.entity_id && <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>#{log.entity_id.slice(0, 8)}</span>}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detailStr}</div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{adminName}</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{timeSince(log.created_at)}</div>
      </div>
    </div>
  );
}

export const AdminActivity = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, u] = await Promise.all([fetchAdminActivityLogs(150), fetchAllUsers()]);
      setLogs(l || []);
      setUsers(u || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const usersById = Object.fromEntries(users.map(u => [u.id, u]));
  const actionTypes = ['all', ...Object.keys(ACTION_COLORS).filter(k => k !== 'default')];

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action_type !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.action_type.includes(q) || l.entity_type.includes(q) || (l.entity_id || '').toLowerCase().includes(q) || (usersById[l.admin_id]?.full_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ animation: 'adminFadeIn 0.4s ease' }}>
      <style>{`@keyframes adminFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}><History size={20} color="#8b5cf6" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Activity Logs</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{logs.length} recent actions recorded</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {/* Action filter pills */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {actionTypes.map(a => {
                const m = ACTION_COLORS[a];
                const active = filterAction === a;
                return (
                  <button key={a} onClick={() => setFilterAction(a)}
                    style={{ padding: '3px 10px', borderRadius: '50px', border: `1px solid ${active ? (m?.color || '#f2cc0d') : 'rgba(255,255,255,0.1)'}`, background: active ? (m ? m.bg : 'rgba(242,204,13,0.1)') : 'transparent', color: active ? (m?.color || '#f2cc0d') : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize', whiteSpace: 'nowrap' }}
                  >{a === 'all' ? 'All' : a.replace(/_/g, ' ')}</button>
                );
              })}
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input type="text" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.5rem 1rem 0.5rem 30px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', width: '160px', fontFamily: 'inherit', fontSize: '0.8rem' }}
              />
            </div>
            <button onClick={load} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex' }}><RefreshCw size={14} /></button>
          </div>
        </div>

        {/* Log list */}
        <div style={{ padding: '1.25rem', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
          {loading
            ? <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading activity logs…</div>
            : filtered.length === 0
              ? <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <History size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                  <p>No activity logs found</p>
                </div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filtered.map(l => <ActivityRow key={l.id} log={l} usersById={usersById} />)}
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
};
