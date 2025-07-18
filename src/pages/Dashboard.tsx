import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom'; // Importado para forçar a atualização

const Dashboard = () => {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({ vehicleCount: 0, fraudAlerts: 0, maintenanceAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const location = useLocation(); // Hook para detectar a mudança de rota

  useEffect(() => {
    console.log("Dashboard montado ou rota mudou. Buscando estatísticas...");
    const fetchStats = async () => {
      setLoading(true); // Reinicia o loading a cada busca
      try {
        // 1. Contar Veículos
        const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
        const vehicleCount = vehiclesSnapshot.size;
        console.log(`Veículos encontrados: ${vehicleCount}`);

        // 2. Contar Alertas de Fraude PENDENTES
        const fraudQuery = query(collection(db, 'alerts'), where('type', '==', 'fraude'), where('status', '==', 'pendente'));
        const fraudSnapshot = await getDocs(fraudQuery);
        const fraudAlerts = fraudSnapshot.size;
        console.log(`Alertas de fraude pendentes: ${fraudAlerts}`);
        
        // 3. Contar Alertas de Manutenção PENDENTES
        const maintenanceQuery = query(collection(db, 'alerts'), where('type', '==', 'manutencao'), where('status', '==', 'pendente'));
        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        const maintenanceAlerts = maintenanceSnapshot.size;
        console.log(`Alertas de manutenção pendentes: ${maintenanceAlerts}`);

        setStats({ vehicleCount, fraudAlerts, maintenanceAlerts });
      } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [db, location]); // Adicionado 'location' para re-executar a busca a cada navegação

  const StatCard = ({ title, value, color, isLoading }: { title: string, value: number, color: string, isLoading: boolean }) => (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      {isLoading ? (
        <div className="h-9 mt-2 bg-gray-700 rounded w-1/2 animate-pulse"></div>
      ) : (
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard SARA</h1>
      <p className="text-gray-400">
        Bem-vindo, <span className="font-semibold text-gray-200">{user?.displayName || user?.email}</span>!
        <span className="ml-4 px-3 py-1 text-sm font-semibold text-blue-200 bg-blue-600/50 rounded-full">{role}</span>
      </p>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-300">Visão Geral da Frota</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Alertas de Fraude Pendentes" value={stats.fraudAlerts} color="text-red-500" isLoading={loading} />
          <StatCard title="Alertas de Manutenção Pendentes" value={stats.maintenanceAlerts} color="text-yellow-500" isLoading={loading} />
          <StatCard title="Total de Veículos na Frota" value={stats.vehicleCount} color="text-green-500" isLoading={loading} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
