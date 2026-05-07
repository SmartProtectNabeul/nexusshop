import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useContext } from 'react';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import CreditsPage from './pages/CreditsPage';
import SubmitAppPage from './pages/SubmitAppPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';
import ForbiddenPage from './pages/ForbiddenPage';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { canAccessAdmin } from './lib/accessControl';
import { Toaster } from 'react-hot-toast';

function AccessGate({ children, requiredRoles = [], allowAccess }) {
  const location = useLocation();
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{
          reason: 'login_required',
          from: location,
          requiredRoles,
        }}
      />
    );
  }

  const hasRole = requiredRoles.length === 0 || requiredRoles.includes(user.role);
  const isAllowed = typeof allowAccess === 'function' ? allowAccess(user) : hasRole;

  if (!isAllowed) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{
          reason: 'forbidden',
          from: location,
          requiredRoles,
        }}
      />
    );
  }

  return children;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route
            path="/credits"
            element={(
              <AccessGate>
                <CreditsPage />
              </AccessGate>
            )}
          />
          <Route
            path="/submit-app"
            element={(
              <AccessGate requiredRoles={['DEVELOPER']}>
                <SubmitAppPage />
              </AccessGate>
            )}
          />
          <Route
            path="/admin"
            element={(
              <AccessGate requiredRoles={['ADMIN']} allowAccess={canAccessAdmin}>
                <AdminPage />
              </AccessGate>
            )}
          />
          <Route
            path="/settings"
            element={(
              <AccessGate>
                <SettingsPage />
              </AccessGate>
            )}
          />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: '#0b1220',
            color: '#f8fafc',
            border: '1px solid #1f2937',
          },
        }}
      />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
