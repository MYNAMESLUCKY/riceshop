import React, { useEffect, useState, useCallback } from 'react';
import { Users, RefreshCw, Search, Shield, Truck, User as UserIcon } from 'lucide-react';
import { fetchAllUsers, updateUserRole } from '../../lib/db';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const ROLE_META = {
  admin:    { color: '#f2cc0d', bg: 'rgba(242,204,13,0.12)', icon: Shield },
  delivery: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: Truck },
  user:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: UserIcon },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.user;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '50px', background: m.bg, color: m.color, fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${m.color}30` }}>
      <Icon size={11} /> {role?.toUpperCase() || 'USER'}
    </span>
  );
}

function UserRow({ userData, onRoleChange, currentUserId }) {
  const [saving, setSaving] = useState(false);
  const isSelf = userData.id === currentUserId;
  const initials = (userData.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const change = async (role) => {
    if (role === userData.role) return;
    setSaving(true);
    try { await onRoleChange(userData.id, role); } finally { setSaving(false); }
  };

  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', fontSize: '0.9rem', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>{userData.full_name || 'Unnamed'}</div>
            {isSelf && <span style={{ fontSize: '0.68rem', color: '#f2cc0d', fontWeight: 700, background: 'rgba(242,204,13,0.1)', padding: '1px 6px', borderRadius: '50px', border: '1px solid rgba(242,204,13,0.2)' }}>You</span>}
          </div>
        </div>
      </td>
      <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>{userData.phone_number || '—'}</td>
      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(userData.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
      <td style={{ padding: '1rem 1.25rem' }}><RoleBadge role={userData.role} /></td>
      <td style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.keys(ROLE_META).map(role => {
            const m = ROLE_META[role];
            const active = userData.role === role;
            return (
              <button key={role} onClick={() => change(role)} disabled={saving || isSelf || active}
                style={{ padding: '5px 12px', borderRadius: '8px', background: active ? m.bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? m.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? m.color : 'rgba(255,255,255,0.4)', cursor: (saving || isSelf || active) ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize',
                  opacity: (isSelf && !active) ? 0.3 : 1
                }}
              >
                {saving && !active ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> : role}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

export const AdminUsers = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await fetchAllUsers() || []); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId, role) => {
    try { await updateUserRole(userId, role, user?.id); toast.success('Role updated!'); await load(); }
    catch (e) { toast.error(e.message); }
  };

  const displayUsers = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (search) return (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || (u.phone_number || '').includes(search);
    return true;
  });

  const roleCounts = { all: users.length, ...Object.fromEntries(Object.keys(ROLE_META).map(r => [r, users.filter(u => u.role === r).length])) };

  return (
    <div style={{ animation: 'adminFadeIn 0.4s ease' }}>
      <style>{`@keyframes adminFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ background: 'linear-gradient(145deg,rgba(14,14,14,0.96),rgba(8,8,8,0.99))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}><Users size={20} color="#3b82f6" /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Users & Roles</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{users.length} registered users</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {/* Role filter */}
            {['all', ...Object.keys(ROLE_META)].map(r => {
              const m = ROLE_META[r];
              const active = filterRole === r;
              return (
                <button key={r} onClick={() => setFilterRole(r)}
                  style={{ padding: '4px 12px', borderRadius: '50px', border: `1px solid ${active ? (m?.color || '#f2cc0d') : 'rgba(255,255,255,0.1)'}`, background: active ? (m ? m.bg : 'rgba(242,204,13,0.1)') : 'transparent', color: active ? (m?.color || '#f2cc0d') : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize' }}
                >
                  {r} ({roleCounts[r] || 0})
                </button>
              );
            })}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input type="text" placeholder="Search name…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '0.55rem 1rem 0.55rem 32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none', width: '170px', fontFamily: 'inherit', fontSize: '0.82rem' }}
              />
            </div>
            <button onClick={load} style={{ padding: '0.55rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex' }}><RefreshCw size={15} /></button>
          </div>
        </div>

        {/* Table */}
        {loading
          ? <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading users…</div>
          : displayUsers.length === 0
            ? <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}><Users size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} /><p>No users found</p></div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['User', 'Phone', 'Joined', 'Current Role', 'Change Role'].map(h => (
                        <th key={h} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayUsers.map(u => <UserRow key={u.id} userData={u} onRoleChange={handleRoleChange} currentUserId={user?.id} />)}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
};
