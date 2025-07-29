import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

// ... (outras importações)
import VehiclesList from '../pages/VehiclesList'; // Importado

const AppLayout = () => ( <MainLayout><Outlet /></MainLayout> );

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) { /* ... */ }
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route element={user ? <AppLayout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register-vehicle" element={ <ProtectedRoute requiredPermission={2}><RegisterVehicle /></ProtectedRoute> } />
          <Route path="/vehicles" element={ <ProtectedRoute requiredPermission={3}><VehiclesList /></ProtectedRoute> } /> {/* NOVA ROTA */}
          <Route path="/verify-vehicle" element={ <ProtectedRoute requiredPermission={2}><VerifyVehicle /></ProtectedRoute> } />
          <Route path="/verifications-history" element={ <ProtectedRoute requiredPermission={3}><VerificationsHistory /></ProtectedRoute> } />
          <Route path="/view-alerts" element={ <ProtectedRoute requiredPermission={1}><ViewAlerts /></ProtectedRoute> } />
          <Route path="/alert/:alertId" element={ <ProtectedRoute requiredPermission={1}><AlertDetail /></ProtectedRoute> } />
          <Route path="/manage-users" element={ <ProtectedRoute requiredPermission={5}><ManageUsers /></ProtectedRoute> } />
          <Route path="/profile" element={ <ProtectedRoute requiredPermission={1}><UserProfile /></ProtectedRoute> } />
        </Route>
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
