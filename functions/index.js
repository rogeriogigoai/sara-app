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
});

exports.analyzeTireImage = functions.runWith({ timeoutSeconds: 300 }).https.onCall(async (data, context) => {
    console.log("Iniciando analyzeTireImage com o modelo:", MODEL_NAME);

    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");
    if (!data.image) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem foi fornecida.");
    
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        // --- PROMPT FINAL, MAIS ESTRUTURADO E DIRETO ---
        const prompt = `Sua tarefa é analisar a imagem de um pneu e extrair informações. Siga estas regras estritamente:
1.  Localize o código DOT.
2.  A partir dos últimos quatro dígitos do código DOT, identifique a semana de fabricação (os dois primeiros desses quatro dígitos) e o ano de fabricação (os dois últimos desses quatro dígitos).
3.  Identifique o código DOT completo.
4.  Identifique a marca do pneu.
5.  Identifique a condição do pneu ("Novo", "Bom", "Desgastado", "Danificado").
6.  Retorne SOMENTE um objeto JSON válido com as chaves "dot", "brand", "condition", "week", e "year".
Exemplo de saída para um DOT terminado em 4119: {"dot": "DOT XYZ 4119", "brand": "Pirelli", "condition": "Bom", "week": "41", "year": "19"}.
Se qualquer informação não for legível, use o valor "N/A".`;
        
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
