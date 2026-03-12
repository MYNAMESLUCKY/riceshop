import React, { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, RefreshCw, Search, Clock, CheckCircle, AlertCircle, Truck, ChevronDown } from 'lucide-react';
import { fetchAllOrders, updateOrderStatus } from '../../lib/db';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const STATUS_META = {
  pending:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  paid:             { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle },
  processing:       { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: AlertCircle },
  out_for_delivery: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Truck },
  delivered:        { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle },
  cancelled:        { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: AlertCircle },
};
const ALL_STATUSES = Object.keys(STATUS_META);

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '50px', background: m.bg, color: m.color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${m.color}30` }}>
      <Icon size={12} /> {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

function OrderRow({ order, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  const change = async (status) => {
    setOpen(false);
    setUpdating(true);
    try { await onStatusChange(order.id, status); } finally { setUpdating(false); }
  };

  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f2cc0d', letterSpacing: '0.5px' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </td>
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{order.profiles?.full_name || '—'}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{order.profiles?.phone_number || ''}</div>
      </td>
      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{(order.order_items || []).length}</td>
      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>Rs {Number(order.total_amount || 0).toLocaleString('en-IN')}</td>
      <td style={{ padding: '1rem 1.25rem' }}><StatusBadge status={order.status} /></td>
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setOpen(o => !o)}
            disabled={updating}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: updating ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s' }}
          >
            {updating ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <><ChevronDown size={13} /> Change</>}
          </button>
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', overflow: 'hidden', zIndex: 100, minWidth: '190px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)' }}>
              {ALL_STATUSES.map(s => {
                const m = STATUS_META[s];
                return (
                  <button key={s} onClick={() => change(s)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0.7rem 1rem', background: s === order.status ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: s === order.status ? m.color : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: s === order.status ? 700 : 500, transition: 'background 0.15s' }}
                    onMouseOver={e => { if (s !== order.status) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseOut={e => { if (s !== order.status) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                    {s.replace(/_/g, ' ')}
                    {s === order.status && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: m.color }}>current</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export const AdminOrders = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await fetchAllOrders() || []); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (orderId, status) => {
    try { await updateOrderStatus(orderId, status, null, user?.id); toast.success('Status updated'); await load(); }
    catch (e) { toast.error(e.message); }
  };

  const filtered = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.id.toLowerCase().includes(q) || (o.profiles?.full_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ animation: 'adminFadeIn 0.4s ease' }}>
      <style>{`@keyframes adminFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}><ShoppingCart size={20} color="#10b981" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Orders</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{orders.length} total orders</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', ...ALL_STATUSES].map(s => {
                const m = STATUS_META[s];
                const active = filterStatus === s;
                return (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '4px 12px', borderRadius: '50px', border: `1px solid ${active ? (m?.color || '#f2cc0d') : 'rgba(255,255,255,0.1)'}`, background: active ? (m ? m.bg : 'rgba(242,204,13,0.1)') : 'transparent', color: active ? (m?.color || '#f2cc0d') : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{s === 'all' ? 'All' : s.replace(/_/g, ' ')}</button>
                );
              })}
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input type="text" placeholder="Order ID or name…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.55rem 1rem 0.55rem 32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', width: '190px', fontFamily: 'inherit', fontSize: '0.82rem' }}
              />
            </div>
            <button onClick={load} style={{ padding: '0.55rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex' }}><RefreshCw size={15} /></button>
          </div>
        </div>

        {/* Table */}
        {loading
          ? <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading orders…</div>
          : filtered.length === 0
            ? <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <ShoppingCart size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>No orders found</p>
              </div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Order', 'Customer', 'Items', 'Amount', 'Status', 'Update'].map(h => (
                        <th key={h} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => <OrderRow key={o.id} order={o} onStatusChange={handleStatusChange} />)}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
};
