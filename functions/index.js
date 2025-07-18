const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors")({ origin: true }); // Importa e configura o CORS

admin.initializeApp();

const geminiApiKey = functions.config().gemini.key;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Função para analisar PLACAS, agora com CORS manual
exports.analyzePlateImage = functions.runWith({ timeoutSeconds: 300 }).https.onRequest((req, res) => {
    // Envolve a função com o middleware do CORS
    cors(req, res, async () => {
        functions.logger.info("Iniciando analyzePlateImage (onRequest)...", { structuredData: true });

        // A autenticação é verificada manualmente em funções https.onRequest
        if (!req.auth) {
            functions.logger.error("Requisição não autenticada.");
            res.status(403).send("Permissão negada. Você precisa estar autenticado.");
            return;
        }
        functions.logger.info(`Usuário autenticado: ${req.auth.uid}`);
        
        const imageBase64 = req.body.data.image;
        if (!imageBase64) {
            functions.logger.error("Nenhuma imagem fornecida no corpo da requisição.");
            res.status(400).send("Nenhuma imagem foi fornecida.");
            return;
        }

        try {
            functions.logger.info("Preparando para chamar a API do Gemini para placa.");
            const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            const prompt = `Analise a imagem da placa de um veículo. Extraia apenas o texto da placa. Retorne um objeto JSON com uma única chave "plateText". Por exemplo, para uma placa 'BRA2E19', a resposta deve ser {"plateText": "BRA2E19"}. Se não conseguir ler, retorne {"plateText": "N/A"}`;
            const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
            
            functions.logger.info("Enviando requisição para o Gemini...");
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            functions.logger.info(`Resposta recebida do Gemini: ${text}`);
            const cleanJsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonData = JSON.parse(cleanJsonString);

            functions.logger.info("Análise da placa concluída com sucesso.");
            res.status(200).send({ data: jsonData });
        } catch (error) {
            functions.logger.error("ERRO CRÍTICO em analyzePlateImage:", error);
            res.status(500).send("Erro interno ao analisar a imagem com a IA.");
        }
    });
});

// A função de pneus será atualizada depois.
exports.analyzeTireImage = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        res.status(200).send({ data: { dot: "TESTE-CORS", brand: "TESTE-CORS", condition: "TESTE-CORS" }});
    });
});
