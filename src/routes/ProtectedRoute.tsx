import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredPermission: number;
}

const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { permissionLevel, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  // LÓGICA CORRIGIDA
  if (permissionLevel !== null && permissionLevel >= requiredPermission) {
    return children; // Se tem permissão, renderiza a página solicitada
  } else {
    // Se não tem permissão, redireciona para a página inicial (Dashboard)
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
