import React, { useEffect, useState } from 'react';
import {
  DollarSign, ShoppingCart, Package, Users,
  TrendingUp, ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle, AlertCircle, Truck
} from 'lucide-react';
import { fetchProducts, fetchAllOrders, fetchAllUsers } from '../../lib/db';

/* ── tiny helpers ── */
const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n));
const pct = (a, b) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

const CARD_CONFIGS = [
  { key: 'revenue', label: 'Total Revenue', icon: DollarSign, prefix: 'Rs ', color: '#f2cc0d', glow: 'rgba(242,204,13,0.2)' },
  { key: 'orders', label: 'Total Orders', icon: ShoppingCart, color: '#10b981', glow: 'rgba(16,185,129,0.2)' },
  { key: 'products', label: 'Active Products', icon: Package, color: '#6366f1', glow: 'rgba(99,102,241,0.2)' },
  { key: 'users', label: 'Registered Users', icon: Users, color: '#3b82f6', glow: 'rgba(59,130,246,0.2)' },
];

const STATUS_STYLES = {
  pending:         { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: Clock },
  paid:            { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: CheckCircle },
  processing:      { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', icon: AlertCircle },
  out_for_delivery:{ bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: Truck },
  delivered:       { bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: CheckCircle },
  cancelled:       { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: AlertCircle },
};

function StatCard({ label, value, prefix = '', icon: Icon, color, glow, loading }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    if (loading || !value) return;
    const target = typeof value === 'number' ? value : 0;
    let start = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setAnimated(target); clearInterval(t); }
      else setAnimated(start);
    }, 20);
    return () => clearInterval(t);
  }, [value, loading]);

  return (
    <div
      style={{
        background: 'linear-gradient(145deg,rgba(18,18,18,0.9),rgba(10,10,10,0.95))',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: '20px', padding: '1.75rem',
        transition: 'all 0.3s', cursor: 'default', position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.6), 0 0 30px ${glow}`; e.currentTarget.style.borderColor = color + '40'; }}
      onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
    >
      {/* background glow orb */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: `radial-gradient(circle,${glow},transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.75rem', borderRadius: '14px', background: `rgba(${hexToRgb(color)},0.1)`, border: `1px solid ${color}30` }}>
          <Icon size={22} color={color} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '50px', border: '1px solid rgba(16,185,129,0.2)' }}>
          <TrendingUp size={12} color="#10b981" />
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>+12%</span>
        </div>
      </div>

      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '0.4rem' }}>
        {loading ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span> : `${prefix}${fmt(animated)}`}
      </div>
      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function hexToRgb(hex) {
  const res = hex.replace('#','');
  const r = parseInt(res.substring(0,2),16);
  const g = parseInt(res.substring(2,4),16);
  const b = parseInt(res.substring(4,6),16);
  return `${r},${g},${b}`;
}

function RecentOrderRow({ order }) {
  const s = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const StatusIcon = s.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ShoppingCart size={16} color="#f2cc0d" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>#{order.id.slice(0,8).toUpperCase()}</div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{order.profiles?.full_name || 'Customer'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f2cc0d' }}>Rs {fmt(order.total_amount)}</div>
        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '50px', background: s.bg, color: s.color, fontWeight: 700, display: 'inline-block', marginTop: '3px' }}>
          {order.status.replace(/_/g,' ').toUpperCase()}
        </span>
      </div>
    </div>
  );
}

export const AdminOverview = () => {
  const [data, setData] = useState({ revenue: 0, orders: 0, products: 0, users: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, o, u] = await Promise.all([fetchProducts(), fetchAllOrders(), fetchAllUsers()]);
        const orders = o || [];
        const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);
        setData({ revenue, orders: orders.length, products: (p || []).length, users: (u || []).length });
        setRecentOrders(orders.slice(0, 6));
        const sb = {};
        orders.forEach(o => { sb[o.status] = (sb[o.status] || 0) + 1; });
        setStatusBreakdown(sb);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const total = Object.values(statusBreakdown).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'adminFadeIn 0.4s ease' }}>
      <style>{`@keyframes adminFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(242,204,13,0.1) 0%, rgba(224,115,0,0.08) 100%)', border: '1px solid rgba(242,204,13,0.2)', borderRadius: '20px', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>Welcome back! 👋</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', margin: '4px 0 0' }}>Here's what's happening with your store today.</p>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.25rem' }}>
        {CARD_CONFIGS.map(c => (
          <StatCard key={c.key} {...c} value={data[c.key]} loading={loading} />
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Recent Orders */}
        <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.95),rgba(8,8,8,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Recent Orders</h3>
            <a href="#/admin/orders" style={{ fontSize: '0.78rem', color: '#f2cc0d', textDecoration: 'none', fontWeight: 600 }}>View all →</a>
          </div>
          {loading
            ? Array(4).fill(0).map((_, i) => <div key={i} style={{ height: '56px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />)
            : recentOrders.map(o => <RecentOrderRow key={o.id} order={o} />)
          }
        </div>

        {/* Order Status Breakdown */}
        <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.95),rgba(8,8,8,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Order Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(STATUS_STYLES).map(([status, style]) => {
              const count = statusBreakdown[status] || 0;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{status.replace(/_/g,' ')}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: style.color }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percentage}%`, background: style.color, borderRadius: '3px', transition: 'width 1s ease', boxShadow: `0 0 8px ${style.color}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
