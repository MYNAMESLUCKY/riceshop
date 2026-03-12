import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Edit3, Trash2, Search, X, Save, RefreshCw, Package, Star, CheckCircle, XCircle, Upload, Link as LinkIcon, Image } from 'lucide-react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../../lib/db';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrencyINR } from '../../lib/format';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', company: '', category_id: '', price: '', weight: '', rating: '4.5', compare_price: '', image_url: '', description: '', is_active: true, is_featured: false };

/* ── Image Upload Component ── */
function ImageUploader({ value, onChange }) {
  const [tab, setTab] = useState('upload'); // 'upload' | 'url'
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return; }
    const localURL = URL.createObjectURL(file);
    setPreview(localURL);
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
      setPreview(url);
      toast.success('Image uploaded!', { icon: '🖼️' });
    } catch (e) {
      toast.error('Upload failed: ' + e.message);
      setPreview('');
    } finally { setUploading(false); }
  };

  const tabBtn = (id, label, Icon) => (
    <button type="button" onClick={() => setTab(id)}
      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: tab === id ? 'rgba(242,204,13,0.15)' : 'transparent', color: tab === id ? '#f2cc0d' : 'rgba(255,255,255,0.4)', fontWeight: tab === id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.2s' }}>
      <Icon size={13} />{label}
    </button>
  );

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product Image</label>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', marginBottom: '12px' }}>
          {tabBtn('upload', 'Upload', Upload)}
          {tabBtn('url', 'URL', LinkIcon)}
        </div>

        {tab === 'upload' ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? '#f2cc0d' : 'rgba(255,255,255,0.15)'}`, borderRadius: '10px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragging ? 'rgba(242,204,13,0.05)' : 'transparent' }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {uploading
              ? <div style={{ color: '#f2cc0d' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><div style={{ fontSize: '0.82rem' }}>Uploading…</div></div>
              : <><Image size={28} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} /><div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>Drag & drop or <span style={{ color: '#f2cc0d', fontWeight: 700 }}>click to browse</span></div><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>JPG, PNG, WEBP — max 5 MB</div></>
            }
          </div>
        ) : (
          <input type="url" value={value} onChange={e => { onChange(e.target.value); setPreview(e.target.value); }} placeholder="https://example.com/image.jpg"
            style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = '#f2cc0d'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
        )}

        {/* Preview */}
        {preview && (
          <div style={{ marginTop: '12px', position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '120px', background: 'rgba(0,0,0,0.3)' }}>
            <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPreview('')} />
            <button type="button" onClick={() => { setPreview(''); onChange(''); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── helpers ── */
const inp = (props) => ({
  width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff',
  outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ...props,
});

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product
    ? { category_id: '', is_featured: false, ...product, price: String(product.price || ''), rating: String(product.rating || '4.5'), compare_price: String(product.compare_price || '') }
    : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    import('../../lib/supabase').then(({ supabase }) =>
      supabase.from('product_categories').select('id,name').eq('is_active', true).order('sort_order')
        .then(({ data }) => setCategories(data || []))
    );
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input
        type={type} value={form[key]}
        onChange={e => set(key, e.target.value)}
        style={inp()}
        onFocus={e => { e.target.style.borderColor = '#f2cc0d'; e.target.style.boxShadow = '0 0 12px rgba(242,204,13,0.2)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
        {...extra}
      />
    </div>
  );

  // Only send columns that exist on the products table
  const buildPayload = () => ({
    name: form.name,
    company: form.company,
    category_id: form.category_id || null,
    price: Number(form.price),
    compare_price: form.compare_price ? Number(form.compare_price) : null,
    weight: form.weight,
    rating: Number(form.rating),
    image_url: form.image_url || null,
    description: form.description || null,
    is_active: Boolean(form.is_active),
    is_featured: Boolean(form.is_featured),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(buildPayload());
      onClose();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'linear-gradient(145deg,#111,#0a0a0a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 80px rgba(0,0,0,0.7)', animation: 'adminFadeIn 0.25s ease' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{product ? 'Edit Product' : 'Add New Product'}</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{product ? 'Update product details' : 'Fill in the product information'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {field('Product Name', 'name', 'text', { required: true, placeholder: 'e.g. Basmati Premium' })}
            {field('Company / Brand', 'company', 'text', { required: true, placeholder: 'e.g. India Gate' })}
            {/* Category dropdown */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
              <select value={form.category_id || ''} onChange={e => set('category_id', e.target.value)}
                style={{ ...inp(), appearance: 'none', cursor: 'pointer' }}
                onFocus={e => { e.target.style.borderColor = '#f2cc0d'; e.target.style.boxShadow = '0 0 12px rgba(242,204,13,0.2)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}>
                <option value="">— Select category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {field('Weight', 'weight', 'text', { required: true, placeholder: '1kg, 5kg, 25kg' })}
            {field('Price (Rs)', 'price', 'number', { required: true, min: '0', step: '0.01' })}
            {field('Compare Price', 'compare_price', 'number', { min: '0', step: '0.01', placeholder: 'Optional original price' })}
            {field('Rating', 'rating', 'number', { required: true, min: '0', max: '5', step: '0.1' })}
          </div>
          <ImageUploader value={form.image_url} onChange={v => set('image_url', v)} />
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inp(), resize: 'vertical' }} onFocus={e => { e.target.style.borderColor = '#f2cc0d'; e.target.style.boxShadow = '0 0 12px rgba(242,204,13,0.2)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }} placeholder="Describe this product..." />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div onClick={() => set('is_active', !form.is_active)} style={{ width: 44, height: 24, borderRadius: '12px', background: form.is_active ? '#f2cc0d' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s', position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: 3, left: form.is_active ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: form.is_active ? '#000' : '#fff', transition: 'left 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Active (visible in store)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div onClick={() => set('is_featured', !form.is_featured)} style={{ width: 44, height: 24, borderRadius: '12px', background: form.is_featured ? '#6366f1' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s', position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: 3, left: form.is_featured ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: form.is_featured ? '#fff' : '#fff', transition: 'left 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Featured (shown on landing page)</span>
          </label>

          <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.9rem' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', border: 'none', color: '#000', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}>
              {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              {saving ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const doDelete = async () => {
    if (!confirm('Delete this product?')) return;
    setDeleting(true);
    try { await onDelete(product.id); } catch (e) { toast.error(e.message); setDeleting(false); }
  };
  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 50, height: 50, borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(product.image_url || product.image)
              ? <img src={product.image_url || product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              : <Package size={20} color="rgba(255,255,255,0.2)" />
            }
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{product.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{product.weight}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{product.company}</td>
      <td style={{ padding: '1rem 1.25rem' }}>
        <span style={{ padding: '3px 10px', borderRadius: '50px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '0.75rem', fontWeight: 600 }}>{product.product_categories?.name || '—'}</span>
      </td>
      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#f2cc0d', fontSize: '0.95rem' }}>{formatCurrencyINR(product.price)}</td>
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700 }}>
          <Star size={13} fill="#fbbf24" /> {product.rating}
        </div>
      </td>
      <td style={{ padding: '1rem 1.25rem' }}>
        {product.is_active
          ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}><CheckCircle size={14} /> Active</span>
          : <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}><XCircle size={14} /> Inactive</span>
        }
      </td>
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onEdit(product)} style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}><Edit3 size={13} /> Edit</button>
          <button onClick={doDelete} disabled={deleting} style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>{deleting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />} Delete</button>
        </div>
      </td>
    </tr>
  );
}

export const AdminProducts = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | product obj
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all products including inactive ones via admin
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.from('products').select('*, product_categories(name)').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch {
      // fallback
      const p = await fetchProducts();
      setProducts(p || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    !search || [p.name, p.company].some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (form) => {
    if (modal === 'add') { await createProduct(form, user?.id); toast.success('Product created!'); }
    else { await updateProduct(modal.id, form, user?.id); toast.success('Product updated!'); }
    await load();
  };

  return (
    <div style={{ animation: 'adminFadeIn 0.4s ease' }}>
      <style>{`@keyframes adminFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {modal && <ProductModal product={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}

      {/* Panel */}
      <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justify: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}><Package size={20} color="#6366f1" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Products</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{products.length} total items</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.6rem 1rem 0.6rem 36px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', width: '200px', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
            </div>
            <button onClick={load} style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex' }}><RefreshCw size={16} /></button>
            <button onClick={() => setModal('add')} style={{ padding: '0.6rem 1.1rem', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', border: 'none', borderRadius: '10px', color: '#000', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 15px rgba(242,204,13,0.3)' }}><Plus size={16} /> Add Product</button>
          </div>
        </div>

        {/* Table */}
        {loading
          ? <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading products…</div>
          : filtered.length === 0
            ? <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <Package size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>No products found</p>
              </div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Product', 'Brand', 'Type', 'Price', 'Rating', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => <ProductRow key={p.id} product={p} onEdit={setModal} onDelete={async id => { await deleteProduct(id, user?.id); toast.success('Deleted'); await load(); }} />)}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
};
