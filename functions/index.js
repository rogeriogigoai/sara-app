const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const geminiApiKey = functions.config().gemini.key;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Função para analisar PNEUS
exports.analyzeTireImage = functions.runWith({ timeoutSeconds: 120 }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }
  const imageBase64 = data.image;
  if (!imageBase64) {
    throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const prompt = `Analise a imagem deste pneu de veículo e extraia as seguintes informações em um formato JSON. O JSON de saída deve ter EXATAMENTE as seguintes chaves: "dot", "brand", "condition". Para o número DOT, extraia o código completo que começa com "DOT". Para a marca, identifique o fabricante (ex: Michelin, Pirelli). Para a condição, use um dos seguintes valores: "Novo", "Bom", "Desgastado", "Danificado". Se um campo não for visível ou identificável, retorne o valor "N/A" para a chave correspondente.`;
    const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    const cleanJsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonData = JSON.parse(cleanJsonString);
    return jsonData;
  } catch (error) {
    console.error("Erro na analyzeTireImage:", error);
    throw new functions.https.HttpsError("internal", "Erro ao analisar a imagem do pneu com a IA.");
  }
});

// NOVA Função para analisar PLACAS
exports.analyzePlateImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    }
    const imageBase64 = data.image;
    if (!imageBase64) {
        throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const prompt = `Analise a imagem da placa de um veículo. Extraia apenas o texto da placa. Retorne um objeto JSON com uma única chave "plateText". Por exemplo, para uma placa 'BRA2E19', a resposta deve ser {"plateText": "BRA2E19"}. Se não conseguir ler, retorne {"plateText": "N/A"}`;
        const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        const cleanJsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonData = JSON.parse(cleanJsonString);
        return jsonData;
    } catch (error) {
        console.error("Erro na analyzePlateImage:", error);
        throw new functions.https.HttpsError("internal", "Erro ao analisar a imagem da placa com a IA.");
    }
});
