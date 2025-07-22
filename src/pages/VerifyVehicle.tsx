import { useState, useEffect, useCallback } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import imageCompression from 'browser-image-compression';

// --- (Todos os helpers, tipos e componentes de UI permanecem os mesmos) ---
interface TireData { position: string; dot: string; brand: string; condition: string; week: string; year: string; imageUrl?: string; file?: File; }
const TIRE_POSITIONS = ['Dianteiro Esquerdo', 'Dianteiro Direito', 'Traseiro Esquerdo', 'Traseiro Direito', 'Estepe'];
// ... (outros helpers)

const VerifyVehicle = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const storage = getStorage();
    const db = getFirestore();
    const functions = getFunctions();

    // ... (todos os estados)
    const [vehicle, setVehicle] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'search' | 'validation_scanning' | 'validation_results' | 'update_scanning'>('search');
    const [scannedTires, setScannedTires] = useState<Record<string, Partial<TireData>>>({});
    const [newTires, setNewTires] = useState<Record<string, Partial<TireData>>>({});
    const [validationResult, setValidationResult] = useState<any>(null);
    const [iaLoading, setIaLoading] = useState(false);
    

    // ... (lógica de busca e scan)
    const handleSearch = useCallback(async (values: { plate: string }) => { /* ... */ }, []);
    useEffect(() => { /* ... */ }, [location, handleSearch]);
    const handleScan = async (file: File, index: number, targetStateSetter: Function) => { /* ... */ };


    const processValidation = async () => {
        if (!vehicle) return;
        setLoading(true);
        console.log("Iniciando validação...");
        try {
            // --- Upload das imagens de verificação para o Storage ---
            const scannedTiresWithUrls = await Promise.all(
                TIRE_POSITIONS.map(async (pos) => {
                    const tire = scannedTires[pos] as TireData;
                    if (!tire.file) throw new Error(`Arquivo de imagem faltando para o pneu validado na posição ${pos}`);
                    
                    const storageRef = ref(storage, `verifications/${vehicle.plate}/${pos}_${Date.now()}`);
                    const snapshot = await uploadBytes(storageRef, tire.file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    const { file, ...rest } = tire; // Remove o objeto 'file'
                    return { ...rest, imageUrl: downloadURL }; // Retorna os dados com a URL permanente
                })
            );

            // --- Lógica de verificação (como antes) ---
            const originalTireKeys = new Set(vehicle.currentTires.map((t: TireData) => `${t.week}-${t.year}`));
            const scannedTireKeys = new Set(scannedTiresWithUrls.map((t: any) => `${t.week}-${t.year}`));
            const hasFraud = originalTireKeys.size !== scannedTireKeys.size || ![...originalTireKeys].every(key => scannedTireKeys.has(key));
            let isRotated = false;
            // ... (lógica de rodízio)

            const resultStatus = hasFraud ? 'fraude' : (isRotated ? 'rodizio' : 'ok');
            setValidationResult({ status: resultStatus, changes: scannedTiresWithUrls });

            // --- SALVAR O REGISTRO DE VERIFICAÇÃO ---
            await addDoc(collection(db, "verifications"), {
                vehicleId: vehicle.id,
                plate: vehicle.plate,
                status: resultStatus,
                scannedTires: scannedTiresWithUrls,
                originalTires: vehicle.currentTires,
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
            });
            console.log("Registro de verificação salvo com sucesso.");

            // --- Criação de Alertas (como antes) ---
            if (hasFraud) { /* ... */ } 
            else if (isRotated) { /* ... */ }
            
            setStep('validation_results');
        } catch (err) {
            console.error("ERRO CRÍTICO ao processar validação:", err);
            alert("Ocorreu um erro ao processar a validação. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleFinalUpdate = async () => { /* ... (código existente) ... */ };

    // --- (Toda a renderização JSX permanece a mesma) ---
    return ( <div>...</div> );
};

export default VerifyVehicle;
