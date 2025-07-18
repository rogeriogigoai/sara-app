import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable, type HttpsCallableOptions } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// --- Tipos e Constantes ---
interface TireData {
    position: string;
    dot: string;
    brand: string;
    condition: string;
    week: string;
    year: string;
}
const TIRE_POSITIONS = ['Dianteiro Esquerdo', 'Dianteiro Direito', 'Traseiro Esquerdo', 'Traseiro Direito', 'Estepe'];
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

// --- Componentes de UI ---
const TireInfoCard = ({ tire, highlight }: { tire: TireData, highlight?: string }) => (
    <div className={`bg-gray-700 rounded-lg p-4 text-sm border-2 ${highlight === 'fraud' ? 'border-red-500 shadow-lg shadow-red-500/20' : highlight === 'ok' ? 'border-green-500' : 'border-gray-600'}`}>
        <p className="font-bold text-white">{tire.position}</p>
        <div className="mt-2 space-y-1 text-gray-300">
            <p>DOT: <span className="font-mono">{tire.dot}</span></p>
            <p>Marca: <span className="font-mono">{tire.brand}</span></p>
            <p>Fabricação: <span className="font-mono bg-yellow-500/20 px-1 rounded">Semana {tire.week} / Ano {tire.year}</span></p>
            <p>Condição: <span className="font-mono">{tire.condition}</span></p>
        </div>
    </div>
);

const VerifyVehicle = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationStep, setVerificationStep] = useState<'search' | 'scanning' | 'results'>('search');
    const [scannedTires, setScannedTires] = useState<Record<string, Partial<TireData>>>({});
    const [currentTireIndex, setCurrentTireIndex] = useState(0);
    const [iaLoading, setIaLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ status: 'ok' | 'rodizio' | 'fraude', changes: any[] }>({ status: 'ok', changes: [] });
    
    const db = getFirestore();
    const functions = getFunctions();
    const normalizePlate = (plate: string) => plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const handleSearch = async (values: { plate: string }) => {
        setLoading(true);
        setError(null);
        setVehicle(null);
        const finalPlate = normalizePlate(values.plate);

        try {
            const q = query(collection(db, 'vehicles'), where("plate", "==", finalPlate));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError(`Nenhum veículo encontrado com a placa ${finalPlate}.`);
            } else {
                const vehicleDoc = querySnapshot.docs[0];
                setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() });
            }
        } catch (err) {
            setError("Ocorreu um erro ao buscar o veículo.");
        } finally {
            setLoading(false);
        }
    };

    const handleTireScan = async (file: File) => {
        const position = TIRE_POSITIONS[currentTireIndex];
        setIaLoading(true);
        try {
            const options: HttpsCallableOptions = { timeout: 300000 };
            const analyzeTireImage = httpsCallable(functions, 'analyzeTireImage', options);
            const imageBase64 = await toBase64(file);
            const result = await analyzeTireImage({ image: imageBase64 });
            const analysis = result.data as TireData;
            setScannedTires(prev => ({ ...prev, [position]: { ...analysis, position } }));
            // Avança para o próximo pneu automaticamente
            if (currentTireIndex < TIRE_POSITIONS.length - 1) {
                setCurrentTireIndex(currentTireIndex + 1);
            } else {
                // Último pneu escaneado
            }
        } catch (error) {
            alert("A IA não conseguiu analisar o pneu. Por favor, tente uma foto mais nítida.");
        } finally {
            setIaLoading(false);
        }
    };

    const processVerification = async () => {
        if (!vehicle) return;
        setLoading(true);

        const originalTireKeys = new Set(vehicle.currentTires.map((t: TireData) => `${t.week}-${t.year}`));
        const scannedTireKeys = Object.values(scannedTires).map((t: any) => `${t.week}-${t.year}`);
        
        let hasFraud = false;
        const changes = [];
        
        for (const scannedTire of Object.values(scannedTires) as TireData[]) {
            if (!originalTireKeys.has(`${scannedTire.week}-${scannedTire.year}`)) {
                hasFraud = true;
                changes.push({ ...scannedTire, status: 'fraud' });
            } else {
                changes.push({ ...scannedTire, status: 'ok' });
            }
        }

        if (hasFraud) {
            setVerificationResult({ status: 'fraude', changes });
            await addDoc(collection(db, "alerts"), {
                vehicleId: vehicle.id,
                plate: vehicle.plate,
                type: "fraude",
                severity: "critica",
                status: "pendente",
                details: {
                    foundTires: changes,
                    originalTires: vehicle.currentTires
                },
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
            });
        } else if (JSON.stringify(scannedTireKeys.sort()) !== JSON.stringify(Array.from(originalTireKeys).sort())) {
             // Esta condição é simplista, uma melhor seria verificar as posições
             setVerificationResult({ status: 'rodizio', changes });
             const vehicleRef = doc(db, "vehicles", vehicle.id);
             await updateDoc(vehicleRef, { currentTires: Object.values(scannedTires) });
        } else {
            setVerificationResult({ status: 'ok', changes });
        }
        
        setVerificationStep('results');
        setLoading(false);
    };

    // --- RENDERIZAÇÃO ---

    if (verificationStep === 'scanning' && vehicle) {
        const currentPosition = TIRE_POSITIONS[currentTireIndex];
        const isFinished = Object.keys(scannedTires).length === TIRE_POSITIONS.length;

        return (
            <div>
                <h1 className="text-3xl font-bold">Verificando: <span className="text-blue-400">{vehicle.plate}</span></h1>
                <p className="text-gray-400 mt-2">Fotografe cada pneu na posição indicada.</p>
                <div className="mt-8 bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-center p-2 mb-4 text-lg font-bold text-center text-indigo-800 bg-indigo-100 rounded-md ring-2 ring-indigo-400">
                        {isFinished ? "Verificação Concluída" : `Fotografar: ${currentPosition}`}
                    </div>
                    {/* UI de Scan */}
                    <div className="flex flex-col items-center">
                        <label htmlFor="tire-scan-upload" className={`w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-600 ${iaLoading && 'opacity-50 cursor-not-allowed'}`}>
                            {scannedTires[currentPosition]?.imageUrl ? <img src={scannedTires[currentPosition]?.imageUrl} className="w-full h-full object-cover rounded-lg"/> : <span className="text-gray-400">Clique para fotografar</span>}
                            <input id="tire-scan-upload" type="file" accept="image/*" className="hidden" disabled={iaLoading} onChange={(e) => e.target.files && handleTireScan(e.target.files[0])}/>
                        </label>
                        {iaLoading && <p className="mt-2 text-blue-400">Analisando...</p>}
                    </div>
                     {/* Lista de Pneus Escaneados */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">Pneus Verificados:</h3>
                        <div className="grid grid-cols-5 gap-2 text-center">
                            {TIRE_POSITIONS.map((pos, index) => (
                                <div key={pos} className={`p-2 rounded ${scannedTires[pos] ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'} ${index === currentTireIndex && !isFinished ? 'ring-2 ring-blue-400' : ''}`}>
                                    {index + 1}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isFinished && (
                        <div className="mt-8 text-center">
                            <button onClick={processVerification} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg">
                                {loading ? 'Processando...' : 'Finalizar e Ver Resultados'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (verificationStep === 'results' && vehicle) {
         return (
            <div>
                <h1 className="text-3xl font-bold">Resultados da Verificação</h1>
                <div className={`mt-4 p-4 rounded-lg text-center font-bold text-lg ${verificationResult.status === 'fraude' ? 'bg-red-500/20 text-red-400' : verificationResult.status === 'rodizio' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                    {verificationResult.status === 'fraude' && 'ALERTA DE FRAUDE DETECTADO!'}
                    {verificationResult.status === 'rodizio' && 'Rodízio Detectado. As posições foram atualizadas.'}
                    {verificationResult.status === 'ok' && 'Sucesso! Todos os pneus estão corretos.'}
                </div>
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Pneus Encontrados na Verificação:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {verificationResult.changes.map((tire: any) => (
                            <TireInfoCard key={tire.position} tire={tire} highlight={tire.status} />
                        ))}
                    </div>
                </div>
                <div className="mt-8">
                     <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Voltar para o Dashboard
                    </button>
                </div>
            </div>
         )
    }

    // --- RENDERIZAÇÃO DA BUSCA ---
    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Verificar Veículo</h1>
            <p className="text-gray-400 mt-2">Digite a placa para buscar o veículo e iniciar a verificação dos pneus.</p>
            <Formik
                initialValues={{ plate: '' }}
                validationSchema={Yup.object({ plate: Yup.string().required('A placa é obrigatória') })}
                onSubmit={handleSearch}
            >
                <Form className="mt-8 flex items-start gap-4">
                    <div className="flex-grow"><Field name="plate" className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500 uppercase" placeholder="Digite a placa..."/></div>
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md">{loading ? 'Buscando...' : 'Buscar'}</button>
                </Form>
            </Formik>
            <div className="mt-10">
                {error && <p className="text-center text-red-400">{error}</p>}
                {vehicle && (
                    <div className="bg-gray-800 p-6 rounded-lg animate-fade-in">
                        <h2 className="text-2xl font-bold text-green-400">Veículo Encontrado: {vehicle.plate}</h2>
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-4">Pneus Registrados Atualmente:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vehicle.currentTires.map((tire: any) => (<TireInfoCard key={tire.position} tire={tire} />))}
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <button onClick={() => setVerificationStep('scanning')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg">
                                Iniciar Verificação dos 5 Pneus
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyVehicle;
