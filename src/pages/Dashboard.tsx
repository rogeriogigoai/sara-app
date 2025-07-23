import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({ vehicleCount: 0, fraudAlerts: 0, verificationCount: 0 });
  const [recentVehicles, setRecentVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const location = useLocation();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
        const fraudQuery = query(collection(db, 'alerts'), where('type', '==', 'fraude'), where('status', '==', 'pendente'));
        const fraudSnapshot = await getDocs(fraudQuery);
        const verificationsSnapshot = await getDocs(collection(db, 'verifications'));
        
        setStats({
          vehicleCount: vehiclesSnapshot.size,
          fraudAlerts: fraudSnapshot.size,
          verificationCount: verificationsSnapshot.size
        });

        const recentVehiclesQuery = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'), limit(10));
        const recentVehiclesSnapshot = await getDocs(recentVehiclesQuery);
        setRecentVehicles(recentVehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [db, location]);

  const StatCard = ({ title, value, color, isLoading }: { title: string, value: number, color: string, isLoading: boolean }) => (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      {isLoading ? <div className="h-9 mt-2 bg-gray-700 rounded w-1/2 animate-pulse"></div> : <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>}
    </div>
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data indisponível';
    return timestamp.toDate().toLocaleDateString('pt-BR');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard SARA</h1>
      <p className="text-gray-400">Bem-vindo, <span className="font-semibold text-gray-200">{user?.displayName || user?.email}</span>!</p>
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-300">Visão Geral da Frota</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Alertas de Fraude Pendentes" value={stats.fraudAlerts} color="text-red-500" isLoading={loading} />
          <StatCard title="Verificações Realizadas" value={stats.verificationCount} color="text-blue-500" isLoading={loading} />
          <StatCard title="Total de Veículos na Frota" value={stats.vehicleCount} color="text-green-500" isLoading={loading} />
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-300">Atividades Recentes</h2>
        <div className="mt-4 bg-gray-800 rounded-lg shadow-lg">
          {loading ? (
            <p className="p-4 text-center text-gray-400">Carregando atividades...</p>
          ) : recentVehicles.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Nenhuma atividade recente encontrada.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {recentVehicles.map(vehicle => (
                <li key={vehicle.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <Link to={`/verify-vehicle?plate=${vehicle.plate}`} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Novo Cadastro: {vehicle.plate}</p>
                      <p className="text-xs text-gray-400">Registrado em: {formatDate(vehicle.createdAt)}</p>
                    </div>
                    <span className="text-blue-400 text-xs font-semibold">VERIFICAR</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
