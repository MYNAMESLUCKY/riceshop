import React, { useEffect, useState, useCallback } from 'react';
import { Settings, Plus, Save, RefreshCw, Trash2, ChevronRight, ChevronDown, MapPin, Navigation, Radius, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { fetchAdminSettings, upsertAdminSetting } from '../../lib/db';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const isEmpty = v => !v || !v.trim();
const tryParse = (str) => { try { return { ok: true, val: JSON.parse(str) }; } catch { return { ok: false }; } };
const prettify = (v) => { try { return JSON.stringify(v, null, 2); } catch { return '{}'; } };

// ── Haversine distance (km) between two lat/lng pairs ────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Store Location Card ───────────────────────────────────────
function StoreLocationCard({ settings, onSave }) {
  // Load existing stored value
  const stored = settings.find(s => s.key === 'store_location')?.value || {};

  const [address, setAddress] = useState(stored.address || '');
  const [lat, setLat] = useState(stored.lat || '');
  const [lng, setLng] = useState(stored.lng || '');
  const [radius, setRadius] = useState(stored.delivery_radius_km || 5);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapKey, setMapKey] = useState(0); // force iframe reload

  const hasCoords = lat && lng;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng)-0.05},${Number(lat)-0.05},${Number(lng)+0.05},${Number(lat)+0.05}&layer=mapnik&marker=${lat},${lng}`
    : null;

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported by your browser'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        setMapKey(k => k + 1);
        // Reverse geocode with Nominatim (free, no key needed)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch { setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`); }
        setLocating(false);
        toast.success('Location detected!', { icon: '📍' });
      },
      (err) => { setLocating(false); toast.error('Could not get location: ' + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!lat || !lng) { toast.error('Please set coordinates first (use "Detect Location" or enter manually)'); return; }
    setSaving(true);
    try {
      const payload = { address, lat: Number(lat), lng: Number(lng), delivery_radius_km: Number(radius) };
      await onSave('store_location', payload, 'Store physical location and delivery radius');
      toast.success('Store location saved!', { icon: '🏪' });
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const inpStyle = { width: '100%', padding: '0.72rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box', transition: 'border-color 0.2s' };

  return (
    <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.97),rgba(8,8,8,0.99))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 30px rgba(16,185,129,0.04)' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex' }}>
          <MapPin size={22} color="#10b981" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Store Location & Delivery Zone</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Set where your store is and how far you deliver</p>
        </div>
        {hasCoords && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '50px', padding: '5px 12px' }}>
            <CheckCircle size={13} color="#10b981" />
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Location set</span>
          </div>
        )}
      </div>

      <div style={{ padding: '1.75rem', display: 'grid', gridTemplateColumns: hasCoords ? '1fr 1fr' : '1fr', gap: '1.75rem' }}>
        {/* Left: inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Address */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Address</label>
            <input
              type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 42 MG Road, Andheri West, Mumbai 400053"
              style={inpStyle}
              onFocus={e => e.target.style.borderColor = '#10b981'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Lat / Lng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latitude</label>
              <input type="number" value={lat} onChange={e => { setLat(e.target.value); setMapKey(k => k + 1); }}
                placeholder="e.g. 19.0760" step="0.000001" style={inpStyle}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Longitude</label>
              <input type="number" value={lng} onChange={e => { setLng(e.target.value); setMapKey(k => k + 1); }}
                placeholder="e.g. 72.8777" step="0.000001" style={inpStyle}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
          </div>

          {/* Detect Location button */}
          <button
            type="button" onClick={detectLocation} disabled={locating}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', borderRadius: '12px', background: locating ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.1)', border: `1px solid ${locating ? 'rgba(255,255,255,0.1)' : 'rgba(16,185,129,0.3)'}`, color: locating ? 'rgba(255,255,255,0.3)' : '#10b981', cursor: locating ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.88rem', transition: 'all 0.2s' }}
            onMouseOver={e => { if (!locating) { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; } }}
            onMouseOut={e => { if (!locating) { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; } }}
          >
            {locating
              ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Detecting GPS…</>
              : <><Navigation size={16} /> Use My Current Location</>}
          </button>

          {/* Delivery Radius Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Radius</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(242,204,13,0.1)', border: '1px solid rgba(242,204,13,0.25)', borderRadius: '50px', padding: '4px 14px' }}>
                <Radius size={13} color="#f2cc0d" />
                <span style={{ fontWeight: 800, color: '#f2cc0d', fontSize: '0.9rem' }}>{radius} km</span>
              </div>
            </div>
            <input
              type="range" min="1" max="10" step="0.5" value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f2cc0d', cursor: 'pointer', height: '4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
              <span>1 km</span><span>5 km</span><span>10 km</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', margin: '8px 0 0', lineHeight: 1.5 }}>
              Orders outside <strong style={{ color: '#f2cc0d' }}>{radius} km</strong> from the store won't be accepted.
            </p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.85rem', borderRadius: '12px', background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#f2cc0d,#e07b00)', border: 'none', color: saving ? 'rgba(255,255,255,0.3)' : '#000', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: '0.9rem', boxShadow: !saving ? '0 6px 20px rgba(242,204,13,0.3)' : 'none', transition: 'all 0.2s' }}
          >
            {saving ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={15} /> Save Store Location</>}
          </button>

          {/* Info box */}
          {!hasCoords && (
            <div style={{ display: 'flex', gap: '10px', padding: '0.85rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px' }}>
              <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
                Click <strong style={{ color: '#fbbf24' }}>Use My Current Location</strong> to auto-fill coordinates, or enter them manually above. Your browser will ask for location permission.
              </p>
            </div>
          )}
        </div>

        {/* Right: Map preview */}
        {hasCoords && (
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Map Preview</label>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', height: '340px', background: 'rgba(0,0,0,0.3)' }}>
              <iframe
                key={mapKey}
                title="Store Location Map"
                width="100%" height="100%"
                style={{ display: 'block', border: 'none' }}
                src={mapSrc}
                loading="lazy"
                allowFullScreen
              />
              {/* Radius overlay label */}
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(242,204,13,0.25)' }}>
                <Radius size={13} color="#f2cc0d" />
                <span style={{ fontSize: '0.78rem', color: '#f2cc0d', fontWeight: 700 }}>{radius} km delivery radius</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`}
                target="_blank" rel="noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <Globe size={13} /> View full map
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingCard({ setting, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [valueStr, setValueStr] = useState(prettify(setting.value));
  const [desc, setDesc] = useState(setting.description || '');
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState(false);

  const validate = (str) => { const r = tryParse(str); setJsonError(!r.ok); };

  const save = async () => {
    const r = tryParse(valueStr);
    if (!r.ok) { toast.error('Invalid JSON – please fix before saving.'); return; }
    setSaving(true);
    try { await onSave(setting.key, r.val, desc); toast.success(`Setting "${setting.key}" saved!`); } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Header row */}
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(242,204,13,0.08)', border: '1px solid rgba(242,204,13,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Settings size={17} color="#f2cc0d" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', fontFamily: 'monospace' }}>{setting.key}</div>
          {setting.description && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{setting.description}</div>}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown size={16} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Description</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is this setting for?" style={{ width: '100%', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', fontFamily: 'inherit', fontSize: '0.88rem' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>JSON Value</label>
                {jsonError && <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>⚠ Invalid JSON</span>}
              </div>
              <textarea rows={5} value={valueStr} onChange={e => { setValueStr(e.target.value); validate(e.target.value); }}
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.4)', border: `1px solid ${jsonError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: jsonError ? '#fca5a5' : '#a5f3c0', outline: 'none', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', lineHeight: 1.6, boxShadow: jsonError ? '0 0 10px rgba(239,68,68,0.2)' : 'none' }}
              />
            </div>
            <button onClick={save} disabled={saving || jsonError} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '7px', padding: '0.6rem 1.25rem', borderRadius: '10px', background: saving || jsonError ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#f2cc0d,#e07b00)', border: 'none', color: saving || jsonError ? 'rgba(255,255,255,0.3)' : '#000', cursor: saving || jsonError ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.85rem', boxShadow: !saving && !jsonError ? '0 4px 12px rgba(242,204,13,0.25)' : 'none' }}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const AdminSettings = () => {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVal, setNewVal] = useState('{}');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSettings(await fetchAdminSettings() || []); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key, value, description) => {
    await upsertAdminSetting({ key, value, description, updatedBy: user?.id });
    await load();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) { toast.error('Key is required'); return; }
    const r = tryParse(newVal);
    if (!r.ok) { toast.error('Value must be valid JSON'); return; }
    setCreating(true);
    try {
      await upsertAdminSetting({ key, value: r.val, description: newDesc.trim(), updatedBy: user?.id });
      setNewKey(''); setNewDesc(''); setNewVal('{}'); setShowCreate(false);
      toast.success(`Setting "${key}" created!`);
      await load();
    } catch (e) { toast.error(e.message); } finally { setCreating(false); }
  };

  return (
    <div style={{ animation: 'adminFadeIn 0.4s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`@keyframes adminFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Store Location Card — always shown first */}
      <StoreLocationCard settings={settings} onSave={handleSave} />

      {/* Panel header */}
      <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(242,204,13,0.1)', border: '1px solid rgba(242,204,13,0.2)' }}><Settings size={20} color="#f2cc0d" /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>System Settings</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{settings.length} configuration entries</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={load} style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreate(s => !s)} style={{ padding: '0.6rem 1.1rem', background: showCreate ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#f2cc0d,#e07b00)', border: `1px solid ${showCreate ? 'rgba(255,255,255,0.15)' : 'transparent'}`, borderRadius: '10px', color: showCreate ? '#fff' : '#000', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: !showCreate ? '0 4px 15px rgba(242,204,13,0.3)' : 'none' }}>
            <Plus size={16} /> {showCreate ? 'Cancel' : 'New Setting'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(242,204,13,0.2)', borderRadius: '24px', padding: '1.75rem', boxShadow: '0 0 30px rgba(242,204,13,0.05)', animation: 'adminFadeIn 0.25s ease' }}>
          <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Create New Setting</h4>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Key / Name *</label>
                <input required value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. delivery_fee_rules" style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '0.88rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this control?" style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', fontFamily: 'inherit', fontSize: '0.88rem' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>JSON Value *</label>
              <textarea rows={4} value={newVal} onChange={e => setNewVal(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#a5f3c0', outline: 'none', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={creating} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0.7rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', border: 'none', color: '#000', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.9rem', opacity: creating ? 0.7 : 1 }}>
                {creating ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
                {creating ? 'Creating…' : 'Create Setting'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settings list */}
      <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <h4 style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Settings</h4>
        {loading
          ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>Loading…</div>
          : settings.length === 0
            ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
                <Settings size={36} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0 }}>No settings yet. Create one above.</p>
              </div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settings.map(s => <SettingCard key={s.key} setting={s} onSave={handleSave} />)}
              </div>
            )
        }
      </div>
    </div>
  );
};
