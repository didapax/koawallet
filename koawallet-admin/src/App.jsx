import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import Configuration from './pages/Configuration';
import CollectionCenters from './pages/CollectionCenters';
import PhysicalDeposits from './pages/PhysicalDeposits';
import PaymentMethods from './pages/PaymentMethods';
import Cashier from './pages/Cashier';
import Treasury from './pages/Treasury';
import './index.css';

import { hasPermission } from './utils/permissions';

// Higher order component for route protection
const ProtectedRoute = ({ children, isAuthenticated, role, path }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!hasPermission(role, path)) {
    // If authenticated but no permission, redirect to dashboard
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('admin_token');
  });

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('admin_role') || '';
  });

  const handleLogin = (data) => {
    if (typeof data === 'string') {
      // Fallback for old calls if any
      localStorage.setItem('admin_token', data);
    } else {
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_role', data.user.role || 'user');
      setUserRole(data.user.role || 'user');
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    setIsAuthenticated(false);
    setUserRole('');
  };

  // Global axios interceptor for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />
        } />

        <Route path="/" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/">
            <Dashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/users">
            <UserManagement />
          </ProtectedRoute>
        } />

        <Route path="/config" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/config">
            <Configuration />
          </ProtectedRoute>
        } />

        <Route path="/collection-centers" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/collection-centers">
            <CollectionCenters />
          </ProtectedRoute>
        } />

        <Route path="/physical-deposits" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/physical-deposits">
            <PhysicalDeposits />
          </ProtectedRoute>
        } />

        <Route path="/payment-methods" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/payment-methods">
            <PaymentMethods />
          </ProtectedRoute>
        } />

        <Route path="/cashier" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/cashier">
            <Cashier />
          </ProtectedRoute>
        } />

        <Route path="/treasury" element={
          <ProtectedRoute isAuthenticated={isAuthenticated} role={userRole} path="/treasury">
            <Treasury />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
