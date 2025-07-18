const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("firebase-functions/logger/compat");

admin.initializeApp();

const geminiApiKey = functions.config().gemini.key;
const genAI = new GoogleGenerativeAI(geminiApiKey);

const MODEL_NAME = "gemini-1.5-flash";

function extractJson(text) {
    const match = text.match(/{[\s\S]*}/);
    if (!match) {
        console.error("Nenhum bloco JSON encontrado no texto:", text);
        return null;
    }
    try {
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("Falha ao fazer parse do JSON extraído:", match[0], e);
        return null;
    }
}

exports.analyzePlateImage = functions.runWith({ timeoutSeconds: 300 }).https.onCall(async (data, context) => {
    // ... (código da placa permanece o mesmo)
    console.log("Iniciando analyzePlateImage com o modelo:", MODEL_NAME);
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    if (!data.image) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const prompt = `Analise a imagem da placa de um veículo. Extraia apenas o texto da placa. Retorne um objeto JSON com uma única chave "plateText". Exemplo: {"plateText": "BRA2E19"}. Se não conseguir ler, retorne {"plateText": "N/A"}`;
        const imagePart = { inlineData: { data: data.image, mimeType: "image/jpeg" } };
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        console.log("Resposta do Gemini (Placa):", text);
        const jsonData = extractJson(text);
        if (!jsonData) throw new functions.https.HttpsError("internal", "A resposta da IA para a placa não continha um JSON válido.");
        return jsonData;
    } catch (error) {
        console.error("ERRO CRÍTICO em analyzePlateImage:", error);
        throw new functions.https.HttpsError("internal", "Erro ao analisar a imagem da placa com a IA.");
    }
});

exports.analyzeTireImage = functions.runWith({ timeoutSeconds: 300 }).https.onCall(async (data, context) => {
    console.log("Iniciando analyzeTireImage com o modelo:", MODEL_NAME);

    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    if (!data.image) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
    
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        // PROMPT MELHORADO PARA CAPTURAR TODOS OS DADOS
        const prompt = `Analise a imagem deste pneu e extraia as seguintes informações: o código DOT completo, a marca do pneu, a condição ("Novo", "Bom", "Desgastado", "Danificado") e os dois últimos dígitos do ano e os dois dígitos da semana de fabricação (os últimos quatro dígitos do código DOT). Retorne um objeto JSON com as chaves "dot", "brand", "condition", "week" e "year". Se um campo não for visível ou identificável, retorne o valor "N/A". Exemplo de resposta: {"dot": "DOT 123 ABC 4119", "brand": "Michelin", "condition": "Bom", "week": "41", "year": "19"}.`;
        const imagePart = { inlineData: { data: data.image, mimeType: "image/jpeg" } };
        
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        console.log("Resposta do Gemini (Pneu):", text);

        const jsonData = extractJson(text);
        if (!jsonData) throw new functions.https.HttpsError("internal", "A resposta da IA para o pneu não continha um JSON válido.");
        
        return jsonData;
    } catch (error) {
        console.error("ERRO CRÍTICO em analyzeTireImage:", error);
        throw new functions.https.HttpsError("internal", "Erro ao analisar a imagem do pneu com a IA.");
    }
});
