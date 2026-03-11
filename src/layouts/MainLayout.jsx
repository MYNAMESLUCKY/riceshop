import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag, Menu, MapPin, User } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export const MainLayout = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const cartCount = useCartStore((state) => state.getCartCount());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="container nav-container">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
            <MapPin color="#f59e0b" size={28} />
            Golden<span>Grain</span>
          </Link>
          
          {/* Main Navigation Links */}
          <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <a href="/#products" onClick={() => setMenuOpen(false)}>Shop</a>
            <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
          </div>
          
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/profile" className="btn btn-outline" style={{ border: 'none', padding: '0.4rem' }}>
              <User size={22} />
            </Link>
            <Link to="/cart" className="btn btn-outline" style={{ border: 'none', position: 'relative', padding: '0.4rem' }}>
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span style={{ 
                  background: 'var(--primary)', color: '#000', borderRadius: '50%', 
                  padding: '1px 6px', fontSize: '0.75rem', fontWeight: 700,
                  position: 'absolute', top: '0px', right: '0px'
                }}>
                  {cartCount}
                </span>
              )}
            </Link>
            {/* Mobile Menu Toggle Button */}
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={24} color={menuOpen ? 'var(--primary)' : 'var(--text-primary)'} />
            </button>
          </div>
        </div>
      </nav>

      <main style={{ flexGrow: 1, paddingTop: '80px' }}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo" style={{ marginBottom: '1rem' }}>
                <MapPin color="#f59e0b" size={24} />
                Golden<span>Grain</span>
              </div>
              <p>Your trusted partner for premium rice sourcing.</p>
            </div>
          </div>
          <div className="footer-bottom">
            &copy; {new Date().getFullYear()} GoldenGrain Premium Rice. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
