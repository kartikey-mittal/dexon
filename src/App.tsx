import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ChildDashboard from './components/child/ChildDashboard';
import ParentDashboard from './components/parent/ParentDashboard';
import AuthPage from './components/auth/AuthPage';

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/child"
          element={
            <ProtectedRoute allowedRole="child">
              <ChildDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent"
          element={
            <ProtectedRoute allowedRole="parent">
              <ParentDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;