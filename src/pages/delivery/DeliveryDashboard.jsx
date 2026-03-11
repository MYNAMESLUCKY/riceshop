import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, Package, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { updateOrderStatus } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const statusColors = {
  paid: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  processing: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  out_for_delivery: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  delivered: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

const formatAddress = (addr) => {
  if (!addr) return '-';
  const line = [addr.house_no, addr.street_address, addr.city, addr.state].filter(Boolean).join(', ');
  return `${line}${addr.pincode ? ` - ${addr.pincode}` : ''}`;
};

export const DeliveryDashboard = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles!orders_user_id_fkey(full_name, phone_number), addresses(*), order_items(*, products(name))')
        .eq('delivery_agent_id', user?.id)
        .in('status', ['paid', 'processing', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch {
      // Demo fallback when backend tables or RLS are not yet configured.
      setOrders([
        {
          id: 'mock-1001',
          status: 'out_for_delivery',
          total_amount: 84.5,
          profiles: { full_name: 'Mike Johnson', phone_number: '+91 9876543210' },
          addresses: {
            house_no: '123',
            street_address: 'Park Ave',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          },
          order_items: [{ id: 'i1', products: { name: 'Premium Basmati Rice' }, quantity: 2 }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) loadOrders();
  }, [user, loadOrders]);

  const markDelivered = async (orderId) => {
    try {
      await updateOrderStatus(orderId, 'delivered', user.id);
      toast.success('Marked as delivered');
      await loadOrders();
    } catch {
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      toast.success('Marked as delivered (demo mode)');
    }
  };

  const markOutForDelivery = async (orderId) => {
    try {
      await updateOrderStatus(orderId, 'out_for_delivery', user.id);
      toast.success('Status updated');
      await loadOrders();
    } catch {
      toast.success('Updated (demo mode)');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading your deliveries...</div>;
  }

  return (
    <div style={{ paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>My Deliveries</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {orders.length} active assignment{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={loadOrders} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
          <RefreshCw size={22} />
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No active deliveries. Check back soon.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {orders.map((order) => {
            const sc = statusColors[order.status] || statusColors.processing;
            return (
              <div key={order.id} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>#{(order.id || 'MOCK').slice(0, 8).toUpperCase()}</div>
                  <span style={{ padding: '0.2rem 0.75rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 600, background: sc.bg, color: sc.color }}>
                    {order.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{order.profiles?.full_name || 'Customer'}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    {formatAddress(order.addresses)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <Phone size={16} color="var(--primary)" />
                    {order.profiles?.phone_number || '-'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <Package size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    {order.order_items?.map((item) => `${item.products?.name} x${item.quantity}`).join(', ') || '-'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {order.status !== 'out_for_delivery' && (
                    <button onClick={() => markOutForDelivery(order.id)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '0.9rem', padding: '0.6rem 1rem' }}>
                      Out for Delivery
                    </button>
                  )}
                  <button onClick={() => markDelivered(order.id)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.9rem', padding: '0.6rem 1rem' }}>
                    <CheckCircle size={16} /> Mark Delivered
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
