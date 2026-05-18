
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// On va essayer d'importer le worker via tsx
// Note: Le worker utilise des imports ESM et des paths alias (@/)
// On va donc utiliser tsx pour lancer ce script.

async function testImport() {
    try {
        console.log("📂 Lecture du fichier MT265.docx...");
        const docxPath = path.join(process.cwd(), 'docs', 'FD - MT265 Maté sportif v0.docx');
        const docxBuffer = fs.readFileSync(docxPath);

        // On va importer dynamiquement le worker pour bénéficier de tsx
        const { ImportWorker } = require('./src/agents/imports/importWorker');

        console.log("🤖 Lancement de l'extraction Mistral...");
        const result = await ImportWorker.processImport({
            docxBuffer: docxBuffer.buffer.slice(docxBuffer.byteOffset, docxBuffer.byteOffset + docxBuffer.byteLength),
            fichierNom: 'FD - MT265 Maté sportif v0.docx'
        });

        console.log("✅ Résultat de l'import :");
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("❌ Erreur pendant le test d'import :", error);
    }
}

testImport();
