import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredPermission: number; // Agora requer um nível de permissão
}

const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { permissionLevel, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Verifica se o nível de permissão do usuário é igual ou superior ao necessário
  if (permissionLevel !== null && permissionLevel >= requiredPermission) {
    return children;
  } else {
    // Se não tiver permissão, redireciona para o Dashboard
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
