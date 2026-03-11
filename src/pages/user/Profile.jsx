import React, { useEffect, useState } from 'react';
import { User, MapPin, Package, LogOut, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchUserOrders, updateProfile } from '../../lib/db';
import { useNavigate } from 'react-router-dom';
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
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchUserOrders(user.id).then(data => { setOrders(data || []); setLoadingOrders(false); }).catch(() => setLoadingOrders(false));
  }, [user]);

  useEffect(() => { setFullName(profile?.full_name || ''); }, [profile]);

  const handleSave = async () => {
    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      toast.error('Full name cannot be empty');
      return;
    }

    try {
      await updateProfile(user.id, { full_name: normalizedFullName });
      await fetchProfile(user.id);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  // Calculate stats
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalOrders = orders.length;

  return (
    <div className="container" style={{ padding: '4rem 2rem', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.5px' }}>My Account</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '2rem', alignItems: 'start' }} className="cart-grid">
        
        {/* Left Column: Profile Card & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Profile Card */}
          <div style={{ background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100px', background: 'linear-gradient(135deg, rgba(245,158,11,0.2), transparent)' }} />
            
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, color: '#000', marginBottom: '1.5rem', zIndex: 1, boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}>
              {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            
            <div style={{ zIndex: 1, width: '100%' }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginBottom: '1rem' }}>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" style={{ fontSize: '1.2rem', fontWeight: 600, background: 'var(--bg-color)', border: '1px solid var(--primary)', borderRadius: '12px', padding: '0.8rem', color: 'white', outline: 'none', textAlign: 'center' }} />
                  <button onClick={handleSave} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '8px' }}><Save size={18} /> Save Changes</button>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{profile?.full_name || 'Golden User'}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{profile?.phone_number || user?.email}</p>
                  <span style={{ fontSize: '0.75rem', padding: '0.3rem 1rem', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '1rem', display: 'inline-block' }}>
                    {profile?.role || 'user'}
                  </span>
                </>
              )}
            </div>

            {!editing && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', width: '100%' }}>
                <button onClick={() => setEditing(true)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', gap: '6px' }}><Edit2 size={16} /> Edit</button>
                <button onClick={handleSignOut} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', gap: '6px', borderColor: '#ef4444', color: '#ef4444' }}><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {!loadingOrders && orders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>{totalOrders}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Orders</div>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', marginTop: '0.3rem' }}>₹{totalSpent.toLocaleString()}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginTop: '0.45rem' }}>Total Spent</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Orders */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={24} color="var(--primary)" /> Order History
            </h3>
          </div>

          {loadingOrders ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.5rem', height: '160px', opacity: 0.5, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '24px', border: '1px dashed var(--border)', marginTop: '1rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Package size={40} style={{ opacity: 0.5 }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No orders yet</h3>
              <p style={{ marginBottom: '2rem' }}>You haven't placed any premium grain orders.</p>
              <button onClick={() => navigate('/')} className="btn btn-primary" style={{ display: 'inline-flex' }}>Start Shopping</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map(order => {
                const sc = statusColors[order.status] || statusColors.pending;
                return (
                  <div key={order.id} style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', padding: '1.5rem', transition: 'transform 0.2s, border-color 0.2s', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Order ID</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <span style={{ padding: '0.35rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', background: sc.bg, color: sc.color }}>
                          {order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {order.order_items?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px' }}>
                        {order.order_items.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 500 }}>{item.products?.name || 'Premium Grain'} <span style={{ color: 'var(--primary)' }}>× {item.quantity}</span></span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{(item.price_at_time * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
                      {order.addresses ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={16} color="var(--primary)" /> {[
                            order.addresses.house_no,
                            order.addresses.street_address,
                            order.addresses.city,
                            order.addresses.state,
                          ].filter(Boolean).join(', ')} {order.addresses.pincode ? `- ${order.addresses.pincode}` : ''}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No delivery address info</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total:</span>
                        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary)' }}>₹{Number(order.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
