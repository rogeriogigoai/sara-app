import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout'; // Importado

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import RegisterVehicle from '../pages/RegisterVehicle';
import VerifyVehicle from '../pages/VerifyVehicle';
import ViewAlerts from '../pages/ViewAlerts';

// Componente para agrupar as rotas que usam o layout principal
const AppLayout = () => (
  <MainLayout>
    <Outlet /> {/* As páginas filhas serão renderizadas aqui */}
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
        {/* Rota de Login (sem layout) */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Rotas Protegidas com o Layout Principal */}
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
        </Route>

        {/* Rota para qualquer outro caminho não encontrado */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
