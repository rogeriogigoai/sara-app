import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';

// --- COMPONENTE DE COMPARAÇÃO VISUAL (AGORA COM FOTOS) ---
const TireComparisonCard = ({ originalTire, foundTire }: { originalTire?: any, foundTire: any }) => {
    const isFraud = foundTire.status === 'fraud';
    const title = isFraud ? 'Pneu Irregular Encontrado' : 'Pneu Verificado';

    return (
        <div className={`bg-gray-800 rounded-lg p-4 ring-2 ${isFraud ? 'ring-red-500' : 'ring-gray-700'}`}>
            <h3 className="font-bold text-lg text-white text-center mb-4">{foundTire.position}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pneu Original */}
                <div>
                    <h4 className="font-semibold text-gray-400 mb-2 text-center">Registrado no Sistema</h4>
                    {originalTire && originalTire.imageUrl ? (
                        <>
                            <img src={originalTire.imageUrl} alt={`Original - ${originalTire.position}`} className="w-full h-40 object-cover rounded-md mb-2" />
                            <p className="text-sm text-center font-mono bg-gray-700 rounded px-1">Semana {originalTire.week} / Ano {originalTire.year}</p>
                        </>
                    ) : <div className="w-full h-40 bg-gray-700 rounded-md flex items-center justify-center text-gray-500"><span>Foto Indisponível</span></div>}
                </div>
                {/* Pneu Encontrado */}
                <div>
                    <h4 className={`font-semibold mb-2 text-center ${isFraud ? 'text-red-400' : 'text-green-400'}`}>{title}</h4>
                    <img src={foundTire.imageUrl} alt={`Verificado - ${foundTire.position}`} className="w-full h-40 object-cover rounded-md mb-2" />
                    <p className={`text-sm text-center font-mono rounded px-1 ${isFraud ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                        Semana {foundTire.week} / Ano {foundTire.year}
                    </p>
                </div>
            </div>
        </div>
    );
};


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
                const docSnap = await getDoc(doc(db, 'alerts', alertId));
                if (docSnap.exists()) {
                    setAlert({ id: docSnap.id, ...docSnap.data() });
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
            await updateDoc(doc(db, 'alerts', alertId), {
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

    const isFraudAlert = alert.type === 'fraude';
    const title = isFraudAlert ? "Comparativo da Fraude" : "Detalhes do Rodízio";
    const tiresToShow = alert.details.foundTires;

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
                <h2 className="text-2xl font-semibold mb-4">{title}</h2>
                <div className="space-y-6">
                    {tiresToShow.map((tire: any) => (
                        <TireComparisonCard 
                            key={tire.position}
                            foundTire={tire}
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
