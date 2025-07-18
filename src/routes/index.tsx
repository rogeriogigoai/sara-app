import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import RegisterVehicle from '../pages/RegisterVehicle';
import VerifyVehicle from '../pages/VerifyVehicle';
import ViewAlerts from '../pages/ViewAlerts';
import AlertDetail from '../pages/AlertDetail'; // Importado

const AppLayout = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route element={user ? <AppLayout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route 
            path="/register-vehicle" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator']}>
                <RegisterVehicle />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/verify-vehicle" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator', 'auditor']}>
                <VerifyVehicle />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/view-alerts" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator', 'user', 'auditor']}>
                <ViewAlerts />
              </ProtectedRoute>
            } 
          />
          {/* NOVA ROTA DINÂMICA ADICIONADA AQUI */}
          <Route 
            path="/alert/:alertId" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'operator', 'user']}>
                <AlertDetail />
              </ProtectedRoute>
            } 
          />
        </Route>

        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
