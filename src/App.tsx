import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { AuthProvider } from './app/AuthContext';
import ProtectedRoute from './app/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import WorkerJobsPage from './pages/worker/WorkerJobsPage';
import WorkerJobDetailPage from './pages/worker/WorkerJobDetailPage';

// 임시 페이지
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminJobDetailPage from './pages/admin/AdminJobDetailPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route path="/admin/jobs" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminJobsPage />
              </ProtectedRoute>
            } />

            <Route path="/admin/jobs/:jobId" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminJobDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/worker/jobs" element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerJobsPage />
              </ProtectedRoute>
            } />

            <Route path="/worker/jobs/:jobId" element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerJobDetailPage />
              </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
