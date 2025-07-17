// src/firebase.ts
// Este arquivo inicializa e exporta os serviços do Firebase para serem usados em todo o aplicativo.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// ATENÇÃO: Substitua este objeto pelas credenciais do seu projeto no Console do Firebase
// Você pode encontrar isso em: Configurações do Projeto > Geral > Seus aplicativos > Configuração do SDK
const firebaseConfig = {
  apiKey: "AIzaSyBUpYj1C_b7AJtcK-e1FY3tOscBvaeGYp4",
  authDomain: "sara-v10.firebaseapp.com",
  projectId: "sara-v10",
  storageBucket: "sara-v10.firebasestorage.app",
  messagingSenderId: "418480038701",
  appId: "1:418480038701:web:2885d4e780c9a515d0e9a4",
  measurementId: "G-X05YKNE8VH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços que vamos usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase a todo vapor!"); // Mensagem para confirmar que a inicialização ocorreu
