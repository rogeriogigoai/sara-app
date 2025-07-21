const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

require("firebase-functions/logger/compat");

admin.initializeApp({ projectId: "sara-v10" });
const db = admin.firestore();
const genAI = new (require("@google/generative-ai").GoogleGenerativeAI)(functions.config().gemini.key);
const MODEL_NAME = "gemini-1.5-flash";

function extractJson(text) {
    const match = text.match(/{[\s\S]*}/);
    if (!match) { console.error("Nenhum JSON encontrado:", text); return null; }
    try { return JSON.parse(match[0]); } catch (e) { console.error("Falha no parse do JSON:", e); return null; }
}

const handleAnalysisRequest = async (req, res, prompt) => {
    cors(req, res, async () => {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(403).send('Unauthorized');
        }
        try {
            const idToken = req.headers.authorization.split('Bearer ')[1];
            await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            return res.status(403).send('Unauthorized');
        }
        
        const imageBase64 = req.body.data.image;
        if (!imageBase64) {
            return res.status(400).send("Nenhuma imagem foi fornecida.");
        }
        
        try {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text();
            const jsonData = extractJson(text);
            if (!jsonData) throw new Error("A resposta da IA não continha um JSON válido.");
            return res.status(200).send({ data: jsonData });
        } catch (error) {
            console.error("ERRO CRÍTICO na análise da IA:", error);
            return res.status(500).send("Erro interno ao analisar a imagem.");
        }
    });
};

exports.analyzePlateImage = functions.https.onRequest((req, res) => {
    const prompt = `Analise a imagem da placa de um veículo. Extraia apenas o texto da placa. Retorne um objeto JSON com uma única chave "plateText". Exemplo: {"plateText": "BRA2E19"}. Se não conseguir ler, retorne {"plateText": "N/A"}`;
    handleAnalysisRequest(req, res, prompt);
});

exports.analyzeTireImage = functions.https.onRequest((req, res) => {
    const prompt = `Sua tarefa é analisar a imagem de um pneu e extrair informações. Siga estas regras estritamente: 1. Localize o código DOT. 2. A partir dos últimos quatro dígitos do código DOT, identifique a semana de fabricação (os dois primeiros desses quatro dígitos) e o ano de fabricação (os dois últimos desses quatro dígitos). 3. Identifique o código DOT completo. 4. Identifique a marca do pneu. 5. Identifique a condição do pneu ("Novo", "Bom", "Desgastado", "Danificado"). 6. Retorne SOMENTE um objeto JSON válido com as chaves "dot", "brand", "condition", "week", e "year". Exemplo de saída para um DOT terminado em 4119: {"dot": "DOT XYZ 4119", "brand": "Pirelli", "condition": "Bom", "week": "41", "year": "19"}. Se qualquer informação não for legível, use o valor "N/A".`;
    handleAnalysisRequest(req, res, prompt);
});

exports.manageUser = functions.https.onCall(async (data, context) => {
    console.log("Dados recebidos pela função manageUser:", JSON.stringify(data, null, 2));
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");

    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().permission != 5) {
        throw new functions.https.HttpsError("permission-denied", "Você não tem permissão para gerenciar usuários.");
    }

    const { uid, email, name, password, permission, status, re } = data;
    try {
        if (uid) {
            await admin.auth().updateUser(uid, { email, displayName: name, disabled: status === 'Inativo' });
            if (password) await admin.auth().updateUser(uid, { password });
            await db.collection('users').doc(uid).update({ name, email, re, permission, status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            return { success: true, uid };
        } else {
            const userRecord = await admin.auth().createUser({ email, password, displayName: name, disabled: status === 'Inativo' });
            await db.collection('users').doc(userRecord.uid).set({
                name, email, re, permission, status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, uid: userRecord.uid };
        }
    } catch (error) {
        console.error("ERRO CRÍTICO em manageUser:", error);
        throw new functions.https.HttpsError("internal", "Ocorreu um erro ao gerenciar o usuário.");
    }
});
