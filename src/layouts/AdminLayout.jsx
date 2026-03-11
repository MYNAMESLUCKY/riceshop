import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AdminLayout = () => {
  const { signOut, profile } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="admin-layout" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Admin Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="logo" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Golden<span style={{color: 'var(--primary)'}}>Admin</span></span>
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(false)} style={{ display: 'md-none' }}>✕</button>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <Link to="/admin" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', textDecoration: 'none', padding: '0.75rem', borderRadius: '12px', transition: 'background 0.2s', backgroundColor: 'rgba(245,158,11,0.1)' }}>
            <LayoutDashboard size={20} color="var(--primary)" /> Dashboard
          </Link>
          <Link to="/admin/products" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', textDecoration: 'none', padding: '0.75rem', borderRadius: '12px', transition: 'color 0.2s' }}>
            <Package size={20} /> Products
          </Link>
          <Link to="/admin/orders" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', textDecoration: 'none', padding: '0.75rem', borderRadius: '12px', transition: 'color 0.2s' }}>
            <ShoppingCart size={20} /> Orders
          </Link>
          <Link to="/admin/users" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', textDecoration: 'none', padding: '0.75rem', borderRadius: '12px', transition: 'color 0.2s' }}>
            <Users size={20} /> Users & Roles
          </Link>
        </nav>
        
        <button onClick={signOut} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%' }}>
          <LogOut size={18} /> Logout
        </button>
      </aside>
      
      {/* Admin Main Content */}
      <main className="admin-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <LayoutDashboard size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Overview</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'none' }} className="hidden md:inline">Welcome, {profile?.full_name || 'Admin'}</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};
