import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { isAllowedRole } from './lib/authz';

const MainLayout = lazy(() => import('./layouts/MainLayout').then((module) => ({ default: module.MainLayout })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const DeliveryLayout = lazy(() => import('./layouts/DeliveryLayout').then((module) => ({ default: module.DeliveryLayout })));
const LandingPage = lazy(() => import('./pages/public/LandingPage').then((module) => ({ default: module.LandingPage })));
const ShopPage = lazy(() => import('./pages/public/ShopPage').then((module) => ({ default: module.ShopPage })));
const Login = lazy(() => import('./pages/auth/Login').then((module) => ({ default: module.Login })));
const Cart = lazy(() => import('./pages/public/Cart').then((module) => ({ default: module.Cart })));
const Checkout = lazy(() => import('./pages/public/Checkout').then((module) => ({ default: module.Checkout })));
const Profile = lazy(() => import('./pages/user/Profile').then((module) => ({ default: module.Profile })));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview').then((module) => ({ default: module.AdminOverview })));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts').then((module) => ({ default: module.AdminProducts })));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders').then((module) => ({ default: module.AdminOrders })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then((module) => ({ default: module.AdminSettings })));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity').then((module) => ({ default: module.AdminActivity })));
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard').then((module) => ({ default: module.DeliveryDashboard })));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f2cc0d', fontFamily: 'Outfit, sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAllowedRole(user, profile, allowedRoles)) return <Navigate to="/" replace />;
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
      <Suspense fallback={<div className="page-shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#f2cc0d' }}>Loading...</div>}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="activity" element={<AdminActivity />} />
          </Route>

          <Route path="/delivery" element={<ProtectedRoute allowedRoles={['delivery']}><DeliveryLayout /></ProtectedRoute>}>
            <Route index element={<DeliveryDashboard />} />
            <Route path="map" element={<DeliveryDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
