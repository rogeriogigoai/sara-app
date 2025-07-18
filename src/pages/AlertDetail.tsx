import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';

// Componente para a comparação visual lado a lado
const TireComparisonCard = ({ originalTire, fraudulentTire }: { originalTire?: any, fraudulentTire: any }) => (
    <div className="bg-gray-800 rounded-lg p-4 ring-1 ring-red-500/50">
        <h3 className="font-bold text-lg text-white text-center mb-4">{fraudulentTire.position}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pneu Original */}
            <div className="border-r border-gray-600 pr-4">
                <h4 className="font-semibold text-green-400 mb-2">Original Registrado</h4>
                {originalTire ? (
                    <>
                        <img src={originalTire.imageUrl} alt="Pneu Original" className="w-full h-40 object-cover rounded-md mb-2" />
                        <p className="text-sm text-gray-300">Marca: {originalTire.brand}</p>
                        <p className="text-sm text-gray-300 font-bold bg-green-500/20 px-1 rounded">Semana {originalTire.week} / Ano {originalTire.year}</p>
                    </>
                ) : <p className="text-gray-400">Dados não encontrados.</p>}
            </div>
            {/* Pneu Irregular */}
            <div>
                <h4 className="font-semibold text-red-400 mb-2">Irregular Encontrado</h4>
                <img src={fraudulentTire.imageUrl} alt="Pneu Irregular" className="w-full h-40 object-cover rounded-md mb-2" />
                <p className="text-sm text-gray-300">Marca: {fraudulentTire.brand}</p>
                <p className="text-sm text-gray-300 font-bold bg-red-500/20 px-1 rounded">Semana {fraudulentTire.week} / Ano {fraudulentTire.year}</p>
            </div>
        </div>
    </div>
);

const AlertDetail = () => {
    const { alertId } = useParams<{ alertId: string }>();
    const navigate = useNavigate();
    const [alert, setAlert] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [notes, setNotes] = useState('');
    const db = getFirestore();

    useEffect(() => {
        if (!alertId) return;
        const fetchAlert = async () => {
            try {
                const alertRef = doc(db, 'alerts', alertId);
                const docSnap = await getDoc(alertRef);
                if (docSnap.exists()) {
                    setAlert({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("Alerta não encontrado");
                }
            } catch (err) {
                console.error("Erro ao buscar detalhe do alerta:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlert();
    }, [alertId, db]);
    
    const handleResolve = async () => {
        if (!alertId) return;
        setResolving(true);
        try {
            const alertRef = doc(db, 'alerts', alertId);
            await updateDoc(alertRef, {
                status: 'resolvido',
                notes: notes,
                resolvedAt: serverTimestamp()
            });
            alert('Alerta resolvido com sucesso!');
            navigate('/view-alerts');
        } catch (error) {
            console.error("Erro ao resolver o alerta:", error);
            alert("Não foi possível resolver o alerta.");
        } finally {
            setResolving(false);
        }
    };

    if (loading) return <p>Carregando detalhes do alerta...</p>;
    if (!alert) return <p>Alerta não encontrado.</p>;

    const fraudulentTires = alert.details.foundTires.filter((t: any) => t.status === 'fraud');

    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Detalhes do Alerta</h1>
            <div className="mt-4 bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-400">Placa do Veículo</p>
                        <p className="text-2xl font-mono text-white">{alert.plate}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${alert.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                        {alert.status}
                    </span>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Comparativo da Fraude</h2>
                <div className="space-y-6">
                    {fraudulentTires.map((tire: any) => (
                        <TireComparisonCard 
                            key={tire.position}
                            fraudulentTire={tire}
                            originalTire={alert.details.originalTires.find((ot: any) => ot.position === tire.position)}
                        />
                    ))}
                </div>
            </div>
            
            {alert.status === 'pendente' && (
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold mb-4">Resolver Alerta</h2>
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="Adicione notas sobre a resolução (ex: Pneu trocado, motorista advertido)."
                        />
                        <button
                            onClick={handleResolve}
                            disabled={resolving}
                            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-colors disabled:bg-gray-500"
                        >
                            {resolving ? "Resolvendo..." : "Marcar como Resolvido"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertDetail;
