import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
