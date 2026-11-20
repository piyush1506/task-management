import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ProjectManagementPage from './pages/admin/ProjectManagementPage';
import TaskManagementPage from './pages/admin/TaskManagementPage';
import EmployeeManagementPage from './pages/admin/EmployeeManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import AdminFieldTrackingPage from './pages/admin/AdminFieldTrackingPage';

import EmployeeDashboardPage from './pages/employee/EmployeeDashboardPage';
import EmployeeTasksPage from './pages/employee/EmployeeTasksPage';
import EmployeeProjectsPage from './pages/employee/EmployeeProjectsPage';
import EmployeeFieldCheckInPage from './pages/employee/EmployeeFieldCheckInPage';

function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Protected Routes with AdminLayout */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="projects" element={<ProjectManagementPage />} />
            <Route path="tasks" element={<TaskManagementPage />} />
            <Route path="employees" element={<EmployeeManagementPage />} />
            <Route path="field-tracking" element={<AdminFieldTrackingPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Employee Protected Routes with EmployeeLayout */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <EmployeeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/employee/dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboardPage />} />
            <Route path="tasks" element={<EmployeeTasksPage />} />
            <Route path="projects" element={<EmployeeProjectsPage />} />
            <Route path="field-checkin" element={<EmployeeFieldCheckInPage />} />
          </Route>

          {/* Root & Catch-all */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
