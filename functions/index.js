const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("firebase-functions/logger/compat");

admin.initializeApp({ projectId: "sara-v10" });
const db = admin.firestore();

// ... (código das funções de análise de imagem)

exports.manageUser = functions.https.onCall(async (data, context) => {
    // --- LINHA DE DEPURAÇÃO ADICIONADA ---
    console.log("Dados recebidos pela função manageUser:", JSON.stringify(data, null, 2));

    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Você precisa estar autenticado.");

    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().permission != 5) {
        throw new functions.https.HttpsError("permission-denied", "Você não tem permissão para gerenciar usuários.");
    }

    const { uid, email, name, password, permission, status, re } = data;

    try {
        if (uid) { // --- ATUALIZAÇÃO ---
            await admin.auth().updateUser(uid, {
                email: email,
                displayName: name,
                disabled: status === 'Inativo',
            });
            if (password) {
                await admin.auth().updateUser(uid, { password: password });
            }
            await db.collection('users').doc(uid).update({
                name, email, re, permission, status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, uid: uid };
        } else { // --- CRIAÇÃO ---
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: name,
                disabled: status === 'Inativo',
            });
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
