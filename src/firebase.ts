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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços que vamos usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase a todo vapor!"); // Mensagem para confirmar que a inicialização ocorreu
