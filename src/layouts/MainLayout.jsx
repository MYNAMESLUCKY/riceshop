import React from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ShoppingBag, Menu, X, Wheat } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { NotificationsBell } from '../components/NotificationsBell';
import { InstallPrompt } from '../components/InstallPrompt';
import { useLenis } from '../hooks/useLenis';

export const MainLayout = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const cartCount = useCartStore((state) => state.getCartCount());
  const { user } = useAuthStore();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useLenis();

  React.useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navLinkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? '#f2cc0d' : 'var(--text-secondary)',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.95rem',
  });

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="container nav-container">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
            <div className="brand-mark">
              <Wheat size={18} color="#000" />
            </div>
            Golden<span>Grain</span>
          </Link>

          <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
            <NavLink to="/" end style={navLinkStyle}>Home</NavLink>
            <NavLink to="/shop" style={navLinkStyle}>Shop</NavLink>
            {user && <NavLink to="/profile" style={navLinkStyle}>My Orders</NavLink>}
          </div>

          <div className="nav-actions">
            <NotificationsBell />

            <Link to="/cart" className="icon-action" aria-label="View cart">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            {user ? (
              <Link to="/profile" className="profile-chip" aria-label="View profile">
                {(user.email || 'U')[0].toUpperCase()}
              </Link>
            ) : (
              <Link to="/login" className="btn btn-outline nav-login-link">Login</Link>
            )}

            <button className="mobile-menu-btn icon-action" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}

      <InstallPrompt />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          style={{ flexGrow: 1, paddingTop: '88px' }}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo" style={{ marginBottom: '1rem' }}>
                <div className="brand-mark" style={{ width: 28, height: 28 }}>
                  <Wheat size={15} color="#000" />
                </div>
                Golden<span>Grain</span>
              </div>
              <p>Farm-direct premium rice with dependable delivery, clear pricing, and a smoother mobile shopping experience.</p>
            </div>

            <div>
              <h4>Quick Links</h4>
              <div className="footer-link-list">
                {[['/', 'Home'], ['/shop', 'Shop'], ['/cart', 'Cart'], ['/profile', 'My Account']].map(([to, label]) => (
                  <Link key={to} to={to}>{label}</Link>
                ))}
              </div>
            </div>

            <div>
              <h4>Contact</h4>
              <div className="footer-contact-list">
                <span>Phone: +91 98765 43210</span>
                <span>Email: hello@goldengrain.in</span>
                <span>Location: Mumbai, India</span>
              </div>
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
