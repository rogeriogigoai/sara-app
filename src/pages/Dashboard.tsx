import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, role } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard SARA</h1>
      <p className="text-gray-400">
        Bem-vindo, <span className="font-semibold text-gray-200">{user?.displayName || user?.email}</span>!
        <span className="ml-4 px-3 py-1 text-sm font-semibold text-blue-200 bg-blue-600/50 rounded-full">{role}</span>
      </p>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-300">Visão Geral</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card de KPI */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm font-medium">Alertas de Fraude</h3>
            <p className="text-3xl font-bold text-red-500 mt-2">0</p>
          </div>
          {/* Card de KPI */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm font-medium">Alertas de Manutenção</h3>
            <p className="text-3xl font-bold text-yellow-500 mt-2">0</p>
          </div>
          {/* Card de KPI */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm font-medium">Veículos na Frota</h3>
            <p className="text-3xl font-bold text-green-500 mt-2">1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
