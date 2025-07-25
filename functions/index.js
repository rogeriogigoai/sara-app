const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("firebase-functions/logger/compat");

admin.initializeApp({ projectId: "sara-v10" });
const db = admin.firestore();
const genAI = new (require("@google/generative-ai").GoogleGenerativeAI)(functions.config().gemini.key);
const MODEL_NAME = "gemini-1.5-flash";

function extractJson(text) {
    const match = text.match(/{[\s\S]*}/);
    if (!match) { console.error("Nenhum JSON encontrado na resposta da IA:", text); return null; }
    try { return JSON.parse(match[0]); } catch (e) { console.error("Falha ao fazer parse do JSON da IA:", e); return null; }
}

exports.analyzePlateImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    const imageBase64 = data.image;
    if (!imageBase64) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        // --- PROMPT CORRIGIDO E MAIS ROBUSTO ---
        const prompt = `Sua tarefa é analisar a imagem de uma placa de veículo. Siga estas regras estritamente:
1.  Extraia APENAS o texto alfanumérico da placa.
2.  Retorne SOMENTE um objeto JSON válido com uma única chave "plateText".
Exemplo de saída: {"plateText": "BRA2E19"}.
Se não for possível ler a placa, retorne {"plateText": "N/A"}.`;
        const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const jsonData = extractJson(text);
        if (!jsonData) throw new functions.https.HttpsError("internal", "A resposta da IA para a placa não continha um JSON válido.");
        return jsonData;
    } catch (error) {
        console.error("ERRO CRÍTICO em analyzePlateImage:", error);
        throw new functions.https.HttpsError("internal", "Erro ao analisar a imagem com a IA.");
    }
});

exports.analyzeTireImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    const imageBase64 = data.image;
    if (!imageBase64) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const prompt = `Sua tarefa é analisar a imagem de um pneu e extrair informações. Siga estas regras estritamente: 1. Localize o código DOT. 2. A partir dos últimos quatro dígitos do código DOT, identifique a semana de fabricação ('week') e o ano de fabricação ('year'). 3. Identifique o código DOT completo ('dot'). 4. Identifique a marca do pneu ('brand'). 5. Identifique a condição do pneu ('condition': "Novo", "Bom", "Desgastado", "Danificado"). 6. Retorne SOMENTE um objeto JSON válido com as chaves "dot", "brand", "condition", "week", e "year". Se qualquer informação não for legível, use o valor "N/A".`;
        const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const jsonData = extractJson(text);
        if (!jsonData) throw new functions.https.HttpsError("internal", "A resposta da IA para o pneu não continha um JSON válido.");
        return jsonData;
    } catch (error) {
        console.error("ERRO CRÍTICO em analyzeTireImage:", error);
        throw new functions.https.HttpsError("internal", "Erro ao analisar a imagem do pneu com a IA.");
    }
});

exports.manageUser = functions.https.onCall(async (data, context) => {
    // ... (código existente que já funciona)
});
