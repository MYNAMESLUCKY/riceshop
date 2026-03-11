import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { isAllowedRole } from './lib/authz';

// Layouts
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { DeliveryLayout } from './layouts/DeliveryLayout';

// Pages
import { Home } from './pages/public/Home';
import { Login } from './pages/auth/Login';
import { Profile } from './pages/user/Profile';
import { Cart } from './pages/public/Cart';
import { Checkout } from './pages/public/Checkout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DeliveryDashboard } from './pages/delivery/DeliveryDashboard';

// Role-Based Route Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuthStore();
  
  if (loading) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (!isAllowedRole(user, profile, allowedRoles)) {
    return <Navigate to="/" replace />; // Unauthorized
  }
  
  return children;
};

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1d24', color: '#fff', border: '1px solid #2d333f' } }} />
      <Routes>
        {/* Public Routes - Main Layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          
          {/* User Protected Routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Route>

        {/* Admin Routes - Admin Layout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminDashboard />} />
          <Route path="users" element={<AdminDashboard />} />
        </Route>

        {/* Delivery Routes - Delivery Layout */}
        <Route path="/delivery" element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <DeliveryLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DeliveryDashboard />} />
          <Route path="map" element={<DeliveryDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
