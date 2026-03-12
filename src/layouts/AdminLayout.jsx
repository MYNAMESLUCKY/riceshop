import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Settings, History, LogOut, Menu, X, ChevronRight,
  Bell, Wheat
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/users', label: 'Users & Roles', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/activity', label: 'Activity Logs', icon: History },
];

const PAGE_TITLES = {
  '/admin': 'Dashboard Overview',
  '/admin/products': 'Product Management',
  '/admin/orders': 'Order Management',
  '/admin/users': 'Users & Roles',
  '/admin/settings': 'System Settings',
  '/admin/activity': 'Activity Logs',
};

export const AdminLayout = () => {
  const { signOut, profile } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Admin';
  const initials = (profile?.full_name || 'Admin').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#050505', fontFamily: "'Outfit','Inter',sans-serif" }}>

      {/* == SIDEBAR == */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(4px)' }}
        />
      )}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: '260px', zIndex: 50,
        background: 'linear-gradient(180deg, #0d0d0d 0%, #080808 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
        transition: 'transform 0.35s cubic-bezier(0.25,0.8,0.25,1)',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-110%)',
        boxShadow: '4px 0 40px rgba(0,0,0,0.8)',
      }} className="admin-sidebar-drawer">

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(242,204,13,0.35)' }}>
              <Wheat size={20} color="#000" />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Golden<span style={{ color: '#f2cc0d' }}>Admin</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '4px 6px', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Profile Card */}
        <div style={{ background: 'rgba(242,204,13,0.06)', border: '1px solid rgba(242,204,13,0.15)', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', fontSize: '1rem', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.72rem', color: '#f2cc0d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Administrator</div>
          </div>
        </div>

        {/* Label */}
        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.75rem' }}>Navigation</div>

        {/* Nav Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                color: isActive ? '#f2cc0d' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(242,204,13,0.1)' : 'transparent',
                fontWeight: isActive ? 700 : 500, fontSize: '0.92rem',
                border: isActive ? '1px solid rgba(242,204,13,0.2)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 15px rgba(242,204,13,0.08)' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={signOut}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', width: '100%', fontWeight: 600, fontSize: '0.92rem', transition: 'all 0.2s', fontFamily: 'inherit' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Static desktop sidebar (always visible) */}
      <aside style={{
        width: '260px', flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
        background: 'linear-gradient(180deg, #0d0d0d 0%, #080808 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
        boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
      }} className="admin-sidebar-desktop">

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(242,204,13,0.35)' }}>
            <Wheat size={20} color="#000" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Golden<span style={{ color: '#f2cc0d' }}>Admin</span></span>
        </div>

        <div style={{ background: 'rgba(242,204,13,0.06)', border: '1px solid rgba(242,204,13,0.15)', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', fontSize: '1rem', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.72rem', color: '#f2cc0d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Administrator</div>
          </div>
        </div>

        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.75rem' }}>Navigation</div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                color: isActive ? '#f2cc0d' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(242,204,13,0.1)' : 'transparent',
                fontWeight: isActive ? 700 : 500, fontSize: '0.92rem',
                border: isActive ? '1px solid rgba(242,204,13,0.2)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 15px rgba(242,204,13,0.08)' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={signOut}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', width: '100%', fontWeight: 600, fontSize: '0.92rem', transition: 'all 0.2s', fontFamily: 'inherit' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* == MAIN AREA == */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Header */}
        <header style={{
          height: '70px', flexShrink: 0,
          background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="admin-hamburger"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex' }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>{pageTitle}</h1>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>GoldenGrains Admin Panel</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex', position: 'relative' }}>
              <Bell size={18} />
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#ef4444', borderRadius: '50%', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
            </button>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#f2cc0d,#e07b00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000', fontSize: '0.85rem' }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: 'radial-gradient(ellipse at top, #0f0f0f 0%, #050505 70%)' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 769px) { .admin-sidebar-drawer { display: none !important; } .admin-hamburger { display: none !important; } }
        @media (max-width: 768px) { .admin-sidebar-desktop { display: none !important; } }
      `}</style>
    </div>
  );
};
