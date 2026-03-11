import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Plus,
  X,
  Save,
  RefreshCw,
  Settings,
  History,
} from 'lucide-react';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAllOrders,
  fetchAllUsers,
  updateUserRole,
  updateOrderStatus,
  fetchAdminSettings,
  upsertAdminSetting,
  fetchAdminActivityLogs,
} from '../../lib/db';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const statusColors = {
  pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  paid: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  processing: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  out_for_delivery: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  delivered: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

const prettyJson = (value) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
};

const summarizeDetails = (details) => {
  if (!details || typeof details !== 'object') return '-';
  const entries = Object.entries(details)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  return entries.length ? entries.join(' | ') : '-';
};

const mapSettingsToDraft = (rows) => {
  const draft = {};
  (rows || []).forEach((row) => {
    draft[row.key] = {
      value: prettyJson(row.value),
      description: row.description || '',
    };
  });
  return draft;
};

// Product Form Modal
const ProductModal = ({ product, onClose, onSave }) => {
  const [form, setForm] = useState(
    product || {
      name: '',
      company: '',
      type: '',
      price: '',
      weight: '',
      rating: 4.5,
      image_url: '',
      description: '',
      is_active: true,
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        required={!['image_url', 'description'].includes(key)}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{
          width: '100%',
          padding: '0.65rem 1rem',
          background: 'var(--bg-color)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          color: 'white',
          outline: 'none',
        }}
        {...extra}
      />
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '24px',
          border: '1px solid var(--border)',
          padding: '2rem',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.3rem' }}>{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {field('Name', 'name')}
            {field('Company', 'company')}
            {field('Type', 'type', 'text', { placeholder: 'e.g. Basmati' })}
            {field('Weight', 'weight', 'text', { placeholder: 'e.g. 5kg' })}
            {field('Price (Rs)', 'price', 'number', { step: '0.01', min: '0' })}
            {field('Rating', 'rating', 'number', { step: '0.1', min: '0', max: '5' })}
          </div>

          {field('Image URL', 'image_url', 'url', { placeholder: 'https://...' })}

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.4rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'white',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const { user } = useAuthStore();

  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [settingsDraft, setSettingsDraft] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [savingSettingKey, setSavingSettingKey] = useState('');
  const [newSetting, setNewSetting] = useState({ key: '', description: '', value: '{}' });

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const load = async () => {
    setLoading(true);

    try {
      const [p, o, u] = await Promise.all([fetchProducts(), fetchAllOrders(), fetchAllUsers()]);
      setProducts(p || []);
      setOrders(o || []);
      setUsers(u || []);

      try {
        const settingsRows = await fetchAdminSettings();
        setSettings(settingsRows || []);
        setSettingsDraft(mapSettingsToDraft(settingsRows || []));
      } catch (error) {
        console.warn('Admin settings table missing or inaccessible:', error.message);
        setSettings([]);
        setSettingsDraft({});
      }

      try {
        const logs = await fetchAdminActivityLogs(100);
        setActivityLogs(logs || []);
      } catch (error) {
        console.warn('Admin activity logs table missing or inaccessible:', error.message);
        setActivityLogs([]);
      }
    } catch (error) {
      toast.error('DB tables not found. Please run the SQL schema in Supabase.', { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (form) => {
    if (modal === 'add') {
      await createProduct({ ...form, price: Number(form.price), rating: Number(form.rating) }, user?.id);
      toast.success('Product created');
    } else {
      await updateProduct(modal.id, { ...form, price: Number(form.price), rating: Number(form.rating) }, user?.id);
      toast.success('Product updated');
    }
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct(id, user?.id);
      toast.success('Deleted');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status, null, user?.id);
      toast.success('Order status updated');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role, user?.id);
      toast.success('Role updated');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSettingFieldChange = (key, field, value) => {
    setSettingsDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { value: '{}', description: '' }),
        [field]: value,
      },
    }));
  };

  const handleSaveSetting = async (key) => {
    const draft = settingsDraft[key];
    if (!draft) return;

    let parsedValue;
    try {
      parsedValue = JSON.parse(draft.value || '{}');
    } catch {
      toast.error(`Invalid JSON for setting "${key}"`);
      return;
    }

    setSavingSettingKey(key);
    try {
      await upsertAdminSetting({
        key,
        value: parsedValue,
        description: (draft.description || '').trim(),
        updatedBy: user?.id,
      });
      toast.success(`Saved setting "${key}"`);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingSettingKey('');
    }
  };

  const handleCreateSetting = async (e) => {
    e.preventDefault();

    const key = newSetting.key.trim().toLowerCase();
    if (!key) {
      toast.error('Setting key is required');
      return;
    }

    let parsedValue;
    try {
      parsedValue = JSON.parse(newSetting.value || '{}');
    } catch {
      toast.error('New setting JSON is invalid');
      return;
    }

    try {
      await upsertAdminSetting({
        key,
        value: parsedValue,
        description: newSetting.description.trim(),
        updatedBy: user?.id,
      });
      setNewSetting({ key: '', description: '', value: '{}' });
      toast.success('Setting created');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const totalRevenue = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const tabs = [
    { key: 'products', label: 'Products' },
    { key: 'orders', label: 'Orders' },
    { key: 'users', label: 'Users & Roles' },
    { key: 'settings', label: 'Settings' },
    { key: 'activity', label: 'Activity Logs' },
  ];

  return (
    <div>
      {modal && <ProductModal product={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Revenue', value: `Rs ${totalRevenue.toFixed(0)}`, icon: DollarSign, color: '#f59e0b' },
          { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: '#10b981' },
          { label: 'Products', value: products.length, icon: Package, color: '#6366f1' },
          { label: 'Users', value: users.length, icon: Users, color: '#3b82f6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</span>
              <Icon color={color} size={20} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{loading ? '...' : value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              color: tab === tabItem.key ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: tab === tabItem.key ? '2px solid var(--primary)' : 'none',
              paddingBottom: '4px',
              fontSize: '1rem',
            }}
          >
            {tabItem.label}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {tab === 'products' && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <h3>Product Inventory ({products.length})</h3>
            <button onClick={() => setModal('add')} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              <Plus size={16} /> Add Product
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                    {['Product', 'Type', 'Company', 'Price', 'Rating', 'Active', 'Actions'].map((header) => (
                      <th key={header} style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={product.image_url || product.image} alt={product.name} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                        <span style={{ fontWeight: 500 }}>{product.name}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{product.type}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{product.company}</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Rs {Number(product.price).toFixed(2)}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>* {product.rating}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ color: product.is_active ? '#10b981' : '#ef4444' }}>{product.is_active ? 'Yes' : 'No'}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <button onClick={() => setModal(product)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', marginRight: '12px' }}>
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3>All Orders ({orders.length})</h3>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                    {['Order ID', 'Customer', 'Date', 'Amount', 'Status', 'Update Status'].map((header) => (
                      <th key={header} style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'left' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusStyle = statusColors[order.status] || statusColors.pending;
                    return (
                      <tr key={order.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--primary)' }}>#{order.id.slice(0, 8).toUpperCase()}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>{order.profiles?.full_name || '-'}</td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Rs {Number(order.total_amount).toFixed(2)}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.2rem 0.75rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <select
                            value={order.status}
                            onChange={(e) => handleOrderStatus(order.id, e.target.value)}
                            style={{ background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', padding: '0.4rem 0.6rem', cursor: 'pointer' }}
                          >
                            {['pending', 'paid', 'processing', 'out_for_delivery', 'delivered', 'cancelled'].map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3>Users & Role Management ({users.length})</h3>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Phone', 'Joined', 'Role', 'Change Role'].map((header) => (
                      <th key={header} style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'left' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((row) => (
                    <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{row.full_name || '-'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{row.phone_number || '-'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.75rem',
                            borderRadius: '50px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: row.role === 'admin' ? 'rgba(239,68,68,0.1)' : row.role === 'delivery' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)',
                            color: row.role === 'admin' ? '#ef4444' : row.role === 'delivery' ? '#6366f1' : '#f59e0b',
                          }}
                        >
                          {row.role?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <select
                          value={row.role}
                          onChange={(e) => handleRoleChange(row.id, e.target.value)}
                          style={{ background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', padding: '0.4rem 0.6rem', cursor: 'pointer' }}
                        >
                          {['user', 'admin', 'delivery'].map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Create Setting
            </h3>
            <form onSubmit={handleCreateSetting} style={{ display: 'grid', gap: '0.9rem' }}>
              <input
                placeholder="setting key (example: delivery_rules)"
                value={newSetting.key}
                onChange={(e) => setNewSetting((prev) => ({ ...prev, key: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
              />
              <input
                placeholder="description"
                value={newSetting.description}
                onChange={(e) => setNewSetting((prev) => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
              />
              <textarea
                rows={4}
                value={newSetting.value}
                onChange={(e) => setNewSetting((prev) => ({ ...prev, value: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'white', outline: 'none', fontFamily: 'monospace' }}
              />
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', width: 'fit-content' }}>
                <Plus size={16} /> Add Setting
              </button>
            </form>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Existing Settings ({settings.length})
            </h3>

            {loading ? (
              <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
            ) : settings.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>No settings found. Create one above.</div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {settings.map((settingRow) => (
                  <div key={settingRow.key} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{settingRow.key}</div>
                    <input
                      value={settingsDraft[settingRow.key]?.description ?? ''}
                      onChange={(e) => handleSettingFieldChange(settingRow.key, 'description', e.target.value)}
                      placeholder="description"
                      style={{ width: '100%', marginBottom: '0.7rem', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                    />
                    <textarea
                      rows={4}
                      value={settingsDraft[settingRow.key]?.value ?? '{}'}
                      onChange={(e) => handleSettingFieldChange(settingRow.key, 'value', e.target.value)}
                      style={{ width: '100%', marginBottom: '0.7rem', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'white', outline: 'none', fontFamily: 'monospace' }}
                    />
                    <button
                      onClick={() => handleSaveSetting(settingRow.key)}
                      className="btn btn-outline"
                      disabled={savingSettingKey === settingRow.key}
                      style={{ justifyContent: 'center' }}
                    >
                      <Save size={16} /> {savingSettingKey === settingRow.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} /> Admin Activity Logs ({activityLogs.length})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : activityLogs.length === 0 ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>No activity logs found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                    {['Time', 'Action', 'Entity', 'Admin', 'Details'].map((header) => (
                      <th key={header} style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.85rem 1.5rem', fontWeight: 600 }}>{log.action_type}</td>
                      <td style={{ padding: '0.85rem 1.5rem' }}>{log.entity_type}</td>
                      <td style={{ padding: '0.85rem 1.5rem' }}>{usersById[log.admin_id]?.full_name || log.admin_id?.slice(0, 8) || 'System'}</td>
                      <td style={{ padding: '0.85rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{summarizeDetails(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
