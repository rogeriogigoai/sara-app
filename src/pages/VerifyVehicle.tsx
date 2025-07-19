import { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable, type HttpsCallableOptions } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import imageCompression from 'browser-image-compression';

// --- Tipos e Constantes ---
interface TireData { position: string; dot: string; brand: string; condition: string; week: string; year: string; imageUrl?: string; file?: File; }
const TIRE_POSITIONS = ['Dianteiro Esquerdo', 'Dianteiro Direito', 'Traseiro Esquerdo', 'Traseiro Direito', 'Estepe'];
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});
const normalizePlate = (plate: string) => plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

// --- Componentes de UI ---
const TireInfoCard = ({ tire, highlight }: { tire: any, highlight?: string }) => (
    <div className={`bg-gray-700 rounded-lg p-4 text-sm border-2 ${highlight === 'fraud' ? 'border-red-500 shadow-lg shadow-red-500/20' : highlight === 'ok' ? 'border-green-500' : 'border-gray-600'}`}>
        <p className="font-bold text-white">{tire.position}</p>
        <div className="mt-2 space-y-1 text-gray-300">
            {tire.brand && <p>Marca: <span className="font-mono">{tire.brand}</span></p>}
            <p>Fabricação: <span className="font-mono bg-yellow-500/20 px-1 rounded">Semana {tire.week} / Ano {tire.year}</span></p>
        </div>
    </div>
);

const ScanInterface = ({ title, onScan, onFinish, loading, scannedData, iaLoading }: { title: string, onScan: Function, onFinish: Function, loading: boolean, scannedData: Record<string, Partial<TireData>>, iaLoading: boolean }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const isFinished = Object.keys(scannedData).length === TIRE_POSITIONS.length;
    const currentPosition = TIRE_POSITIONS[currentIndex];

    const handleFileSelected = async (file: File) => {
        const nextIndex = await onScan(file, currentIndex);
        if (nextIndex && nextIndex < TIRE_POSITIONS.length) {
            setCurrentIndex(nextIndex);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <div className="mt-8 bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-center p-2 mb-4 text-lg font-bold text-center text-indigo-800 bg-indigo-100 rounded-md ring-2 ring-indigo-400">
                    {isFinished ? "Todos os pneus escaneados" : `Fotografar: ${currentPosition}`}
                </div>
                <div className="flex flex-col items-center">
                    <label htmlFor="scan-upload" className={`w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-600 ${iaLoading && 'opacity-50 animate-pulse'}`}>
                        <input id="scan-upload" type="file" accept="image/*" className="hidden" disabled={iaLoading} onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])} />
                        {scannedData[currentPosition]?.imageUrl ? <img src={scannedData[currentPosition].imageUrl} className="w-full h-full object-cover rounded-lg"/> : <span className="text-gray-400 text-center">Clique para fotografar</span>}
                    </label>
                    {iaLoading && <p className="mt-2 text-blue-400">Analisando imagem...</p>}
                </div>
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Progresso:</h3>
                    <div className="grid grid-cols-5 gap-2 text-center">
                        {TIRE_POSITIONS.map((pos, index) => (
                            <div key={pos} className={`p-2 rounded ${scannedData[pos] ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'} ${index === currentIndex && !isFinished ? 'ring-2 ring-blue-400' : ''}`}>{index + 1}</div>
                        ))}
                    </div>
                </div>
                {isFinished && (
                    <div className="mt-8 text-center">
                        <button onClick={() => onFinish()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg">
                            {loading ? 'Processando...' : 'Finalizar e Processar'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const VerifyVehicle = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [vehicle, setVehicle] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'search' | 'validation_scanning' | 'validation_results' | 'update_scanning'>('search');
    const [scannedTires, setScannedTires] = useState<Record<string, Partial<TireData>>>({});
    const [newTires, setNewTires] = useState<Record<string, Partial<TireData>>>({});
    const [validationResult, setValidationResult] = useState<any>(null);
    const [iaLoading, setIaLoading] = useState(false);

    const db = getFirestore();
    const functions = getFunctions();
    
    useEffect(() => { setStep('search'); setVehicle(null); setScannedTires({}); setNewTires({}); setError(null); }, [location]);
    
    const handleSearch = async (values: { plate: string }) => {
        setLoading(true); setError(null); setVehicle(null);
        try {
            const q = query(collection(db, 'vehicles'), where("plate", "==", normalizePlate(values.plate)));
            const snapshot = await getDocs(q);
            if (snapshot.empty) setError("Veículo não encontrado.");
            else setVehicle({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } catch (err) { setError("Erro ao buscar veículo."); console.error(err); }
        finally { setLoading(false); }
    };
    
    const handleScan = async (file: File, index: number, targetStateSetter: Function) => {
        const position = TIRE_POSITIONS[index];
        setIaLoading(true);
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1280 });
            const imageUrl = URL.createObjectURL(compressedFile);
            const imageBase64 = await toBase64(compressedFile);
            const analyzeTireImage = httpsCallable(functions, 'analyzeTireImage');
            const result = await analyzeTireImage({ image: imageBase64 });
            targetStateSetter((prev: any) => ({ ...prev, [position]: { ...(result.data as TireData), position, imageUrl, file: compressedFile } }));
            return index + 1;
        } catch (error) { 
            alert("A IA não conseguiu analisar o pneu.");
            console.error(error);
            return index;
        } finally {
            setIaLoading(false);
        }
    };
    
    const processValidation = async () => {
        if (!vehicle) return;
        setLoading(true);
        try {
            const originalTireKeys = new Set(vehicle.currentTires.map((t: TireData) => `${t.week}-${t.year}`));
            let hasFraud = false;
            const changes: any[] = [];

            for (const position of TIRE_POSITIONS) {
                const scannedTire = scannedTires[position] as TireData;
                const scannedKey = `${scannedTire.week}-${scannedTire.year}`;
                changes.push({ ...scannedTire, status: originalTireKeys.has(scannedKey) ? 'ok' : 'fraud' });
                if (!originalTireKeys.has(scannedKey)) hasFraud = true;
            }

            const result = { status: hasFraud ? 'fraude' : 'ok', changes };
            setValidationResult(result);
            if (hasFraud) {
                // CORREÇÃO: Limpando o objeto antes de salvar
                const cleanFoundTires = changes.map(({ file, ...rest }) => rest);
                
                await addDoc(collection(db, "alerts"), {
                    vehicleId: vehicle.id, plate: vehicle.plate, type: "fraude", severity: "critica", status: "pendente",
                    details: { foundTires: cleanFoundTires, originalTires: vehicle.currentTires },
                    createdAt: serverTimestamp(), createdBy: user?.uid,
                });
            }
            setStep('validation_results');
        } catch (err) { console.error(err); alert("Erro ao processar validação. Verifique o console."); }
        finally { setLoading(false); }
    };
    
    const handleFinalUpdate = async () => {
        if (!vehicle || Object.values(newTires).length < TIRE_POSITIONS.length) {
            alert("É necessário escanear todos os 5 pneus novos."); return;
        }
        setLoading(true);
        try {
            const tiresToSave = await Promise.all(
                TIRE_POSITIONS.map(async (pos) => {
                    const tire = newTires[pos] as TireData;
                    if (!tire.file) throw new Error(`Arquivo faltando para o pneu ${pos}`);
                    const storageRef = ref(storage, `tires/${vehicle.plate}/${pos}_${Date.now()}`);
                    const snapshot = await uploadBytes(storageRef, tire.file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    return { position: pos, week: tire.week, year: tire.year, dot: tire.dot, brand: tire.brand, condition: tire.condition, imageUrl: downloadURL };
                })
            );
            await updateDoc(doc(db, "vehicles", vehicle.id), { currentTires: tiresToSave });
            alert("Veículo atualizado com sucesso!");
            navigate("/");
        } catch (err) { console.error(err); alert("Erro ao atualizar o veículo. Verifique o console."); }
        finally { setLoading(false); }
    };

    // --- RENDERIZAÇÃO ---
    if (step === 'validation_scanning') return <ScanInterface title={`Etapa 1: Validar Pneus de ${vehicle?.plate}`} onScan={(file: File, index: number) => handleScan(file, index, setScannedTires)} onFinish={processValidation} loading={loading} scannedData={scannedTires} iaLoading={iaLoading} />;
    if (step === 'update_scanning') return <ScanInterface title={`Etapa 2: Registrar Pneus Novos de ${vehicle?.plate}`} onScan={(file: File, index: number) => handleScan(file, index, setNewTires)} onFinish={handleFinalUpdate} loading={loading} scannedData={newTires} iaLoading={iaLoading} />;
    if (step === 'validation_results') return (
        <div>
            <h1 className="text-3xl font-bold">Resultados da Validação</h1>
            <div className={`mt-4 p-4 rounded-lg text-center font-bold text-lg ${validationResult.status === 'fraude' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {validationResult.status === 'fraude' ? 'ALERTA DE FRAUDE DETECTADO!' : 'VALIDAÇÃO OK! Nenhum pneu irregular encontrado.'}
            </div>
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Pneus Encontrados:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {validationResult.changes.map((tire: any) => <TireInfoCard key={tire.position} tire={tire} highlight={tire.status} />)}
                </div>
            </div>
            <div className="mt-8 flex gap-4">
                <button onClick={() => setStep('search')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Verificar Outro Veículo</button>
                {validationResult.status !== 'fraude' && (
                    <button onClick={() => setStep('update_scanning')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Prosseguir para Etapa 2: Registrar Pneus Novos</button>
                )}
            </div>
        </div>
    );

    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Verificar Veículo</h1>
            <p className="text-gray-400 mt-2">Digite a placa para buscar o veículo e iniciar a validação.</p>
            <Formik initialValues={{ plate: '' }} validationSchema={Yup.object({ plate: Yup.string().required('A placa é obrigatória') })} onSubmit={handleSearch}>
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
                            <button onClick={() => setStep('validation_scanning')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg">
                                Iniciar Etapa 1: Validar Pneus
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyVehicle;
