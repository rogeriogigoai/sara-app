import { useState, useCallback } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { getFirestore, collection, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore';

// --- Componente de Comparação Visual COMPLETO ---
const VerificationDetailCard = ({ verification }: { verification: DocumentData }) => {
    return (
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Detalhes da Verificação</h2>
                    <p className="text-gray-400">Realizada em: {new Date(verification.createdAt.seconds * 1000).toLocaleString('pt-BR')}</p>
                </div>
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${verification.status === 'fraude' ? 'bg-red-500/20 text-red-400' : verification.status === 'rodizio' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                    Resultado: {verification.status}
                </span>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2 text-center">Pneus Registrados (Antes)</h3>
                    <div className="space-y-4">
                        {verification.originalTires.map((tire: any) => (
                            <div key={tire.position} className="bg-gray-700 p-3 rounded-lg flex items-center gap-4">
                                <img src={tire.imageUrl} alt={tire.position} className="w-24 h-24 object-cover rounded-md" />
                                <div>
                                    <p className="font-bold">{tire.position}</p>
                                    <p className="text-sm">Semana {tire.week} / Ano {tire.year}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2 text-center">Pneus Encontrados (Durante)</h3>
                    <div className="space-y-4">
                        {verification.scannedTires.map((tire: any) => (
                            <div key={tire.position} className={`p-3 rounded-lg flex items-center gap-4 border-2 ${tire.status === 'fraud' ? 'border-red-500' : 'border-transparent'}`}>
                                <img src={tire.imageUrl} alt={tire.position} className="w-24 h-24 object-cover rounded-md" />
                                <div>
                                    <p className="font-bold">{tire.position}</p>
                                    <p className="text-sm">Semana {tire.week} / Ano {tire.year}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerificationsHistory = () => {
    const [verifications, setVerifications] = useState<DocumentData[]>([]);
    const [selectedVerification, setSelectedVerification] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const db = getFirestore();

    const normalizePlate = (plate: string) => plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const handleSearch = useCallback(async (values: { plate: string }) => {
        setLoading(true);
        setError(null);
        setVerifications([]);
        setSelectedVerification(null);
        const finalPlate = normalizePlate(values.plate);

        try {
            const q = query(collection(db, 'verifications'), where("plate", "==", finalPlate), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setError(`Nenhuma verificação encontrada para a placa ${finalPlate}.`);
            } else {
                setVerifications(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        } catch (err) {
            setError("Ocorreu um erro ao buscar o histórico.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [db]);
    
    if (selectedVerification) {
        return (
            <div className="text-white">
                <button onClick={() => setSelectedVerification(null)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
                    &larr; Voltar para a Lista
                </button>
                <VerificationDetailCard verification={selectedVerification} />
            </div>
        )
    }

    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Histórico de Verificações</h1>
            <p className="text-gray-400 mt-2">Busque por uma placa para ver todas as verificações já realizadas.</p>
            <Formik
                initialValues={{ plate: '' }}
                validationSchema={Yup.object({ plate: Yup.string().required('A placa é obrigatória') })}
                onSubmit={handleSearch}
            >
                <Form className="mt-8 flex items-start gap-4">
                    <div className="flex-grow"><Field name="plate" className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500 uppercase" placeholder="Digite a placa..." /></div>
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md">{loading ? 'Buscando...' : 'Buscar'}</button>
                </Form>
            </Formik>
            <div className="mt-10">
                {error && <p className="text-center text-red-400">{error}</p>}
                {loading && <p className="text-center">Buscando...</p>}
                {verifications.length > 0 && (
                    <div className="bg-gray-800 rounded-lg">
                        <ul className="divide-y divide-gray-700">
                            {verifications.map(veri => (
                                <li key={veri.id} onClick={() => setSelectedVerification(veri)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-700/50">
                                    <div>
                                        <p className="font-semibold">Data: {new Date(veri.createdAt.seconds * 1000).toLocaleString('pt-BR')}</p>
                                        <p className="text-sm text-gray-400">Placa: {veri.plate}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${veri.status === 'fraude' ? 'bg-red-500/20 text-red-400' : veri.status === 'rodizio' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                        {veri.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerificationsHistory;
