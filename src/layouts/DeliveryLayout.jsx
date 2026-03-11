import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Truck, MapPin, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const DeliveryLayout = () => {
  const { signOut, profile } = useAuthStore();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo" style={{ fontSize: '1.2rem' }}>
          <Truck color="#f59e0b" size={24} />
          Agent<span>Portal</span>
        </div>
        <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <LogOut size={20} />
        </button>
      </header>
      
      <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '90px' }}>
        <Outlet />
      </main>
      
      {/* Mobile-friendly bottom navigation typical for delivery agents */}
      <nav style={{ position: 'fixed', bottom: 0, width: '100%', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '1rem' }}>
        <Link to="/delivery" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', textDecoration: 'none', color: 'var(--primary)' }}>
          <Truck size={24} />
          <span style={{ fontSize: '0.8rem' }}>Deliveries</span>
        </Link>
        <Link to="/delivery/map" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', textDecoration: 'none', color: 'var(--text-secondary)' }}>
          <MapPin size={24} />
          <span style={{ fontSize: '0.8rem' }}>Map</span>
        </Link>
      </nav>
    </div>
  );
};
