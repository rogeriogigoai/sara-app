import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { role, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se o usuário tem um perfil permitido, renderiza a página.
  // Caso contrário, redireciona para a página inicial (Dashboard).
  if (role && allowedRoles.includes(role)) {
    return children;
  } else {
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
