import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, orderBy, getDocs, type DocumentData } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data indisponível';
    const date = timestamp.toDate();
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ViewAlerts = () => {
    const [allAlerts, setAllAlerts] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(''); // Estado para o filtro
    const db = getFirestore();

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const alertsRef = collection(db, 'alerts');
                const q = query(alertsRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                setAllAlerts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Erro ao buscar alertas:", err);
                setError("Não foi possível carregar os alertas.");
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, [db]);

    // Lógica de filtro do lado do cliente
    const filteredAlerts = useMemo(() => {
        if (!searchTerm) {
            return allAlerts;
        }
        return allAlerts.filter(alert =>
            alert.plate?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, allAlerts]);

    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Central de Alertas</h1>
            <p className="text-gray-400 mt-2">Revise e gerencie todos os alertas gerados pelo sistema.</p>

            {/* --- NOVO CAMPO DE FILTRO --- */}
            <div className="my-6">
                <input
                    type="text"
                    placeholder="Filtrar por placa..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="mt-8 bg-gray-800 rounded-lg shadow-lg">
                {loading && <p className="p-4 text-center text-gray-400">Carregando alertas...</p>}
                {error && <p className="p-4 text-center text-red-400">{error}</p>}
                
                {!loading && filteredAlerts.length === 0 && (
                    <p className="p-6 text-center text-gray-500">
                        {searchTerm ? `Nenhum alerta encontrado para "${searchTerm}".` : "Nenhum alerta encontrado. A frota está em conformidade!"}
                    </p>
                )}

                {!loading && filteredAlerts.length > 0 && (
                    <ul className="divide-y divide-gray-700">
                        {filteredAlerts.map(alert => (
                            <li key={alert.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                                <Link to={`/alert/${alert.id}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                                            alert.type === 'fraude' ? 'bg-red-500/20 text-red-400' : 
                                            alert.type === 'rodizio' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-gray-500/20 text-gray-300'
                                        }`}>
                                            {alert.type}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-white">Placa: {alert.plate}</p>
                                            <p className="text-xs text-gray-400">{formatDate(alert.createdAt)}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-semibold ${
                                        alert.status === 'pendente' ? 'text-yellow-400' : 'text-green-400'
                                    }`}>
                                        {alert.status}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ViewAlerts;
