import React, { useEffect, useState } from 'react';
import { MapPin, Package, LogOut, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchUserOrders, updateProfile } from '../../lib/db';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyINR } from '../../lib/format';
import toast from 'react-hot-toast';

const statusColors = {
  pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  paid: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  processing: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  out_for_delivery: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  delivered: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

export const Profile = () => {
  const { user, profile, signOut, fetchProfile, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserOrders(user.id)
      .then((data) => {
        setOrders(data || []);
        setLoadingOrders(false);
      })
      .catch(() => setLoadingOrders(false));
  }, [navigate, user]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile]);

  const handleSave = async () => {
    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      toast.error('Full name cannot be empty');
      return;
    }

    if (normalizedFullName === (profile?.full_name || '').trim()) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await updateProfile(user.id, { full_name: normalizedFullName });
      setProfile({ ...(updatedProfile || {}), full_name: normalizedFullName });
      setEditing(false);
      fetchProfile(user.id).catch(() => {});
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: 1000 }}>
      <h1 style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>My Account</h1>

      <div className="profile-grid">
        <div className="stack-lg">
          <div className="surface-card section-card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, height: 100, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), transparent)' }} />
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #d97706)', color: '#000', display: 'grid', placeItems: 'center', fontSize: '2.3rem', fontWeight: 800, margin: '0 auto 1.25rem', position: 'relative' }}>
              {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>

            {editing ? (
              <div className="stack-md">
                <input className="field-input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" />
                <button type="button" disabled={saving} onClick={handleSave} className="btn btn-primary">
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ margin: 0 }}>{profile?.full_name || 'Golden User'}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{profile?.phone_number || user?.email}</p>
                <span className="badge" style={{ marginTop: '0.75rem' }}>{profile?.role || 'user'}</span>
              </>
            )}

            {!editing && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setEditing(true)} className="btn btn-outline" style={{ width: 'auto' }}>
                  <Edit2 size={16} />
                  Edit
                </button>
                <button type="button" onClick={handleSignOut} className="btn btn-outline" style={{ width: 'auto', color: '#fda4a4', borderColor: 'rgba(239,68,68,0.22)' }}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

          {!loadingOrders && orders.length > 0 && (
            <div className="info-grid">
              <div className="surface-card section-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{orders.length}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Orders</div>
              </div>
              <div className="surface-card section-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatCurrencyINR(totalSpent)}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Spent</div>
              </div>
            </div>
          )}
        </div>

        <div className="stack-md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Package size={24} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Order History</h3>
          </div>

          {loadingOrders ? (
            <div className="stack-md">
              {[1, 2].map((item) => <div key={item} className="surface-card section-card" style={{ height: 150, opacity: 0.5 }} />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="surface-card section-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <Package size={40} style={{ opacity: 0.45, marginBottom: '1rem' }} />
              <h3>No orders yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>You have not placed any orders yet.</p>
              <button type="button" onClick={() => navigate('/shop')} className="btn btn-primary" style={{ width: 'auto' }}>
                Start Shopping
              </button>
            </div>
          ) : (
            orders.map((order) => {
              const statusMeta = statusColors[order.status] || statusColors.pending;
              return (
                <div key={order.id} className="surface-card section-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Order ID</div>
                      <div style={{ fontWeight: 700 }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '0.35rem' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <span style={{ padding: '0.35rem 0.9rem', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, fontSize: '0.74rem', fontWeight: 700 }}>
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {order.order_items?.length > 0 && (
                    <div className="stack-sm" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
                      {order.order_items.map((item) => (
                        <div key={item.id} className="summary-row">
                          <span>{item.products?.name || 'Premium Grain'} x {item.quantity}</span>
                          <strong>{formatCurrencyINR(item.price_at_time * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
                    {order.addresses ? (
                      <div style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', maxWidth: '70%' }}>
                        <MapPin size={16} color="var(--primary)" />
                        <span>
                          {[
                            order.addresses.house_no,
                            order.addresses.street_address,
                            order.addresses.city,
                            order.addresses.state,
                          ].filter(Boolean).join(', ')}{order.addresses.pincode ? ` - ${order.addresses.pincode}` : ''}
                        </span>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)' }}>No delivery address info</div>
                    )}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem' }}>{formatCurrencyINR(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
