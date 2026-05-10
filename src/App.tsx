import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { Session } from '@supabase/supabase-js';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Login from './pages/Login';
import { CartProvider } from './contexts/CartContext';
import { supabase } from './lib/supabase';
import { getUserRoleFromUser, type UserRole } from './lib/auth';

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const PortalCliente = lazy(() => import('./pages/customer/PortalCliente'));
const PortalEntregador = lazy(() => import('./pages/delivery/PortalEntregador'));

function ProtectedRoute({ role, session, children }: { role: UserRole[]; session: Session | null; children: ReactElement }) {
  const location = useLocation();
  const currentRole = getUserRoleFromUser(session?.user);

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!role.includes(currentRole)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const sessionRole = useMemo(() => getUserRoleFromUser(session?.user), [session]);

  return (
    <CartProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12">Carregando...</div>}>
          <Routes>
            {/* Public Store Layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/success" element={<CheckoutSuccess />} />
              <Route path="/login" element={<Login isLogged={!!session?.user} sessionRole={sessionRole} />} />
            </Route>

            {/* Admin and Portals Layout (No Footer/Navbar) */}
            <Route path="/admin/dashboard" element={<ProtectedRoute role={['admin']} session={session}><Dashboard /></ProtectedRoute>} />
            <Route path="/portal-cliente" element={<ProtectedRoute role={['customer', 'admin']} session={session}><PortalCliente /></ProtectedRoute>} />
            <Route path="/portal-entregador" element={<ProtectedRoute role={['delivery', 'admin']} session={session}><PortalEntregador /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
  );
}

