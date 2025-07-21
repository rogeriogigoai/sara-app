import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import imageCompression from 'browser-image-compression';

// --- (Helpers, Tipos, Ícones) ---
interface TireData { position: string; dot: string; brand: string; condition: string; week: string; year: string; imageUrl?: string; file?: File; }
const TIRE_POSITIONS = ['Dianteiro Esquerdo', 'Dianteiro Direito', 'Traseiro Esquerdo', 'Traseiro Direito', 'Estepe'];
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});
const normalizePlate = (plate: string) => plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const CameraIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );

const RegisterVehicle = () => {
    const { user } = useAuth();
    const db = getFirestore();
    const storage = getStorage();
    const navigate = useNavigate();
    const [tires, setTires] = useState<Record<string, Partial<TireData>>>({});
    const [currentTireIndex, setCurrentTireIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [iaLoading, setIaLoading] = useState<'plate' | 'tire' | false>(false);
    const [platePhotoUrl, setPlatePhotoUrl] = useState<string | null>(null);

    const validationSchema = Yup.object({
        plate: Yup.string().transform(val => normalizePlate(val)).min(7, 'A placa deve ter 7 caracteres').required('A placa é obrigatória')
            .test('is-unique', 'Esta placa já está cadastrada.', async (value) => {
                if (!value || value.length !== 7) return true;
                try {
                    const q = query(collection(db, "vehicles"), where("plate", "==", value));
                    const querySnapshot = await getDocs(q);
                    return querySnapshot.empty;
                } catch { return false; }
            }),
    });

    const callAnalysisFunction = async (functionName: string, imageBase64: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuário não autenticado.");
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`https://us-central1-sara-v10.cloudfunctions.net/${functionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ data: { image: imageBase64 } })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro do servidor: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return result.data;
    };

    const handlePlateFileChange = async (file: File, setFieldValue: Function, validateField: Function) => {
        setIaLoading('plate');
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1280 });
            setPlatePhotoUrl(URL.createObjectURL(compressedFile));
            const imageBase64 = await toBase64(compressedFile);
            const result = await callAnalysisFunction('analyzePlateImage', imageBase64);
            if (result.plateText && result.plateText !== 'N/A') {
                setFieldValue('plate', normalizePlate(result.plateText));
                setTimeout(() => validateField('plate'), 100);
            } else { alert('Não foi possível ler a placa. Digite manualmente.'); }
        } catch (error) { console.error("--- ERRO DETALHADO (PLACA) ---", error); alert("Ocorreu um erro ao processar a imagem. Verifique o console."); }
        finally { setIaLoading(false); }
    };
    
    const handleTireFileChange = async (file: File) => {
        const position = TIRE_POSITIONS[currentTireIndex];
        setIaLoading('tire');
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1280 });
            setTires(prev => ({ ...prev, [position]: { ...prev[position], file: compressedFile, imageUrl: URL.createObjectURL(compressedFile) }}));
            const imageBase64 = await toBase64(compressedFile);
            const result = await callAnalysisFunction('analyzeTireImage', imageBase64);
            setTires(prev => ({ ...prev, [position]: { ...prev[position], ...result } }));
        } catch (error) { console.error("--- ERRO DETALHADO (PNEU) ---", error); alert("A IA não conseguiu analisar o pneu. Verifique o console."); }
        finally { setIaLoading(false); }
    };

    const handleSubmit = async (values: { plate: string }) => {
        if (Object.values(tires).filter(t => t && t.file).length !== TIRE_POSITIONS.length) {
            alert('Por favor, cadastre as imagens de todos os 5 pneus.'); return;
        }
        setLoading(true);
        const finalPlate = normalizePlate(values.plate);
        try {
            const tiresToSave = await Promise.all(
                TIRE_POSITIONS.map(async (pos) => {
                    const tire = tires[pos] as TireData;
                    if (!tire.file) throw new Error(`Arquivo faltando para o pneu ${pos}`);
                    const storageRef = ref(storage, `tires/${finalPlate}/${pos}_${Date.now()}`);
                    const snapshot = await uploadBytes(storageRef, tire.file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    return { position: pos, week: tire.week, year: tire.year, dot: tire.dot, brand: tire.brand, condition: tire.condition, imageUrl: downloadURL };
                })
            );
            await addDoc(collection(db, 'vehicles'), {
                plate: finalPlate, createdAt: serverTimestamp(), createdBy: user?.uid, currentTires: tiresToSave,
            });
            alert('Veículo cadastrado com sucesso!');
            navigate('/');
        } catch (error) { console.error("Erro ao cadastrar veículo:", error); alert('Ocorreu um erro ao cadastrar.'); }
        finally { setLoading(false); }
    };

    const currentPosition = TIRE_POSITIONS[currentTireIndex];
    const currentTireData = tires[currentPosition];
    const areAllTiresScanned = Object.values(tires).filter(t => t && t.file).length === TIRE_POSITIONS.length;

    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Cadastrar Novo Veículo</h1>
            <p className="text-gray-400 mt-2">Siga os passos para registrar um veículo e seus 5 pneus na frota.</p>
            <Formik initialValues={{ plate: '' }} validationSchema={validationSchema} onSubmit={handleSubmit} validateOnBlur>
                {({ setFieldValue, errors, touched, validateField, values }) => {
                    const isPlateValidForNextStep = !errors.plate && normalizePlate(values.plate).length === 7;
                    return (
                        <Form className="mt-8 space-y-8">
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                <h2 className="text-xl font-semibold text-gray-300 mb-4">1. Identificação do Veículo</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <div>
                                        <label htmlFor="plate" className="block text-sm font-medium text-gray-400 mb-1"> Placa do Veículo </label>
                                        <div className="flex items-center gap-2">
                                            <Field id="plate" name="plate" className="flex-grow w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500 uppercase" placeholder="AAA0A00"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFieldValue('plate', normalizePlate(e.target.value)) }}
                                            />
                                            <label htmlFor="plate-file-upload" className={`cursor-pointer bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md transition-colors ${iaLoading ? 'opacity-50' : ''}`}>
                                                <CameraIcon />
                                                <input id="plate-file-upload" type="file" accept="image/*" className="hidden" disabled={!!iaLoading} onChange={(e) => e.target.files && handlePlateFileChange(e.target.files[0], setFieldValue, validateField)} />
                                            </label>
                                        </div>
                                        {errors.plate && touched.plate && <div className="text-red-400 text-xs mt-2">{errors.plate}</div>}
                                    </div>
                                    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-700 rounded-md min-h-[100px]">
                                        {iaLoading === 'plate' && <div className="text-blue-400">Analisando...</div>}
                                        {platePhotoUrl && !iaLoading && <img src={platePhotoUrl} alt="Placa do Veículo" className="max-h-32 rounded-md"/>}
                                        {!platePhotoUrl && !iaLoading && <p className="text-gray-500">Preview da foto da placa</p>}
                                    </div>
                                </div>
                            </div>
                            <div className={`bg-gray-800 p-6 rounded-lg shadow-lg transition-opacity duration-500 ${!isPlateValidForNextStep ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                <h2 className="text-xl font-semibold text-gray-300 mb-4">2. Registro dos Pneus</h2>
                                {!isPlateValidForNextStep ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <p>Por favor, insira uma placa de veículo válida e única para continuar.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-center p-2 mb-4 text-lg font-bold text-center text-indigo-800 bg-indigo-100 rounded-md ring-2 ring-indigo-400">{currentPosition}</div>
                                        <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-600 rounded-lg md:flex-row md:space-x-6">
                                            <div className="relative flex-shrink-0 w-48 h-48 mb-4 bg-gray-700 rounded-lg md:mb-0">
                                                {currentTireData?.imageUrl && <img src={currentTireData.imageUrl} alt="Pneu" className="object-cover w-full h-full rounded-lg" />}
                                                {iaLoading === 'tire' && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg"><div className="w-8 h-8 border-4 border-white rounded-full border-t-transparent animate-spin"></div></div>}
                                            </div>
                                            <div className="flex-grow w-full space-y-3">
                                                <input type="file" accept="image/*" onChange={(e) => e.target.files && handleTireFileChange(e.target.files[0])} disabled={!!iaLoading} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50"/>
                                                <div className="p-3 bg-gray-700/50 rounded-md text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                                                    <p><strong>DOT:</strong> {currentTireData?.dot || '...'}</p>
                                                    <p><strong>Marca:</strong> {currentTireData?.brand || '...'}</p>
                                                    <p><strong>Semana:</strong> {currentTireData?.week || '...'}</p>
                                                    <p><strong>Ano:</strong> {currentTireData?.year || '...'}</p>
                                                    <p className="col-span-2"><strong>Condição:</strong> {currentTireData?.condition || '...'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-4">
                                            <button type="button" onClick={() => setCurrentTireIndex(c => Math.max(0, c - 1))} disabled={currentTireIndex === 0 || !!iaLoading} className="px-4 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50">Anterior</button>
                                            <button type="button" onClick={() => setCurrentTireIndex(c => Math.min(TIRE_POSITIONS.length - 1, c + 1))} disabled={currentTireIndex === TIRE_POSITIONS.length - 1 || !!iaLoading} className="px-4 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50">Próximo</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isPlateValidForNextStep && areAllTiresScanned && (
                                <div className="flex justify-end pt-5">
                                    <button type="submit" disabled={!!iaLoading || loading} className="w-full md:w-auto inline-flex justify-center px-8 py-4 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500">
                                        {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                                    </button>
                                </div>
                            )}
                        </Form>
                    )
                }}
            </Formik>
        </div>
    );
};

export default RegisterVehicle;
