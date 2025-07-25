import { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
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
    const [loading, setLoading] = useState(false);
    const [iaLoading, setIaLoading] = useState<'plate' | 'tire' | false>(false);
    const [platePhotoUrl, setPlatePhotoUrl] = useState<string | null>(null);
    const [tireFiles, setTireFiles] = useState<Record<string, File>>({});
    const [currentTireIndex, setCurrentTireIndex] = useState(0);

    const callAnalysisFunction = async (functionName: string, imageBase64: string) => { /* ... (código existente) ... */ };
    const handlePlateFileChange = async (file: File, setFieldValue: Function, validateField: Function) => { /* ... (código existente) ... */ };
    const handleTireFileChange = async (file: File, formikHelpers: any) => { /* ... (código existente) ... */ };

    // FUNÇÃO DE SUBMIT CORRIGIDA E COM LOGS
    const handleSubmit = async (values: any) => {
        console.log("Botão 'Finalizar Cadastro' clicado. Verificando condições...");
        if (Object.values(tireFiles).length !== TIRE_POSITIONS.length) {
            alert('Por favor, certifique-se de que uma foto foi enviada para cada um dos 5 pneus.');
            console.error("Tentativa de submit falhou: Nem todos os 5 pneus têm um arquivo de imagem associado.", tireFiles);
            return;
        }
        
        setLoading(true);
        console.log("Iniciando processo de salvamento...");
        const finalPlate = normalizePlate(values.plate);
        try {
            const tiresToSave = await Promise.all(
                values.tires.map(async (tire: any) => {
                    const tireFile = tireFiles[tire.position];
                    if (!tireFile) throw new Error(`Arquivo de imagem faltando para o pneu ${tire.position}`);
                    
                    console.log(`Fazendo upload da imagem para: ${tire.position}`);
                    const storageRef = ref(storage, `tires/${finalPlate}/${tire.position}_${Date.now()}`);
                    const snapshot = await uploadBytes(storageRef, tireFile);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    const { imageUrl, ...rest } = tire; // Remove a URL local temporária
                    return { ...rest, imageUrl: downloadURL }; // Adiciona a URL permanente do Storage
                })
            );

            console.log("Todos os uploads concluídos. Salvando no Firestore...");
            await addDoc(collection(db, 'vehicles'), {
                plate: finalPlate,
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
                currentTires: tiresToSave,
            });

            alert('Veículo cadastrado com sucesso!');
            navigate('/');
        } catch (error) {
            console.error("ERRO CRÍTICO ao cadastrar veículo:", error);
            alert('Ocorreu um erro ao cadastrar. Verifique o console para mais detalhes.');
        } finally {
            setLoading(false);
            console.log("Processo de salvamento finalizado.");
        }
    };

    // --- (JSX completo e correto abaixo) ---
    return (
        <div className="text-white">
            <h1 className="text-3xl font-bold">Cadastrar Novo Veículo</h1>
            <p className="text-gray-400 mt-2">Siga os passos para registrar um veículo e seus 5 pneus na frota.</p>
            <Formik
                initialValues={{
                    plate: '',
                    tires: TIRE_POSITIONS.map(pos => ({
                        position: pos, dot: '', brand: '', week: '', year: '', condition: 'Bom', imageUrl: ''
                    }))
                }}
                validationSchema={Yup.object({
                    plate: Yup.string().transform(val => normalizePlate(val)).min(7, 'A placa é obrigatória e deve ter 7 caracteres.').required('A placa é obrigatória')
                        .test('is-unique', 'Esta placa já está cadastrada.', async (value) => {
                            if (!value || value.length !== 7) return true;
                            try {
                                const q = query(collection(db, "vehicles"), where("plate", "==", value));
                                const querySnapshot = await getDocs(q);
                                return querySnapshot.empty;
                            } catch { return false; }
                        }),
                    tires: Yup.array().of(
                        Yup.object().shape({
                            week: Yup.string().matches(/^[0-9]{2}$/, 'Semana inválida (WW)').required('Obrigatório'),
                            year: Yup.string().matches(/^[0-9]{2}$/, 'Ano inválido (YY)').required('Obrigatório'),
                        })
                    )
                })}
                onSubmit={handleSubmit}
            >
                {(formikProps) => {
                    const { values, setFieldValue, errors, touched, validateField } = formikProps;
                    const currentTireData = values.tires[currentTireIndex];
                    const isPlateValidForNextStep = !errors.plate && normalizePlate(values.plate).length === 7;
                    const areAllTiresRegistered = values.tires.every(t => t.week && t.year && tireFiles[t.position]);

                    return (
                        <Form className="mt-8 space-y-8">
                            {/* ... (JSX da placa) ... */}
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
                            
                            {/* ... (JSX dos pneus) ... */}
                            <div className={`bg-gray-800 p-6 rounded-lg shadow-lg transition-opacity duration-500 ${!isPlateValidForNextStep ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                <h2 className="text-xl font-semibold text-gray-300 mb-4">2. Registro dos Pneus</h2>
                                {!isPlateValidForNextStep ? (
                                    <div className="text-center text-gray-500 py-10"><p>Por favor, insira uma placa de veículo válida e única para continuar.</p></div>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-center p-2 mb-4 text-lg font-bold text-center text-indigo-800 bg-indigo-100 rounded-md ring-2 ring-indigo-400">{TIRE_POSITIONS[currentTireIndex]}</div>
                                        <div className="flex flex-col md:flex-row gap-6 items-start">
                                            <div className="flex-shrink-0 flex flex-col items-center">
                                                <div className="relative w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center">
                                                    {currentTireData.imageUrl ? <img src={currentTireData.imageUrl} alt="Pneu" className="w-full h-full object-cover rounded-lg"/> : <span className="text-gray-400 text-center px-2">Clique abaixo para fotografar</span>}
                                                    {iaLoading === 'tire' && <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center"><div className="w-8 h-8 border-4 border-white rounded-full border-t-transparent animate-spin"></div></div>}
                                                </div>
                                                <input
                                                    key={currentTireIndex}
                                                    id="tire-photo-upload"
                                                    type="file"
                                                    className="hidden"
                                                    disabled={iaLoading}
                                                    onChange={(e) => e.target.files && handleTireFileChange(e.target.files[0], formikProps)}
                                                />
                                                <label htmlFor="tire-photo-upload" className={`mt-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md transition-colors ${iaLoading ? 'opacity-50' : ''}`}><CameraIcon /></label>
                                            </div>
                                            <div className="flex-grow grid grid-cols-2 gap-4">
                                                <div><label>DOT</label><Field name={`tires[${currentTireIndex}].dot`} className="w-full bg-gray-700 p-2 rounded mt-1"/></div>
                                                <div><label>Marca</label><Field name={`tires[${currentTireIndex}].brand`} className="w-full bg-gray-700 p-2 rounded mt-1"/></div>
                                                <div><label>Semana (WW)</label><Field name={`tires[${currentTireIndex}].week`} className="w-full bg-gray-700 p-2 rounded mt-1"/><ErrorMessage name={`tires[${currentTireIndex}].week`} component="div" className="text-red-400 text-xs"/></div>
                                                <div><label>Ano (YY)</label><Field name={`tires[${currentTireIndex}].year`} className="w-full bg-gray-700 p-2 rounded mt-1"/><ErrorMessage name={`tires[${currentTireIndex}].year`} component="div" className="text-red-400 text-xs"/></div>
                                                <div className="col-span-2"><label>Condição</label><Field as="select" name={`tires[${currentTireIndex}].condition`} className="w-full bg-gray-700 p-2 rounded mt-1"><option>Bom</option><option>Novo</option><option>Desgastado</option><option>Danificado</option></Field></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-4">
                                            <button type="button" onClick={() => setCurrentTireIndex(i => Math.max(0, i - 1))} disabled={currentTireIndex === 0}>Anterior</button>
                                            <button type="button" onClick={() => setCurrentTireIndex(i => Math.min(TIRE_POSITIONS.length - 1, i + 1))} disabled={currentTireIndex === TIRE_POSITIONS.length - 1}>Próximo</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isPlateValidForNextStep && areAllTiresRegistered && (
                                <div className="flex justify-end pt-5">
                                    <button type="submit" disabled={loading || iaLoading} className="w-full md:w-auto inline-flex justify-center px-8 py-4 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500">
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
