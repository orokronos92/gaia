import { Mistral } from "@mistralai/mistralai";
import mammoth from "mammoth";
import * as xlsx from "xlsx";
import { db } from "@/db";
import { produits, fichesEtiquettes, fichesDegustation } from "@/db/schema";
import { RAGService } from "../knowledge/RAGService";
import crypto from "crypto";

// Lazy init — évite les crashs à l'import de module dans Next.js App Router
let _mistral: Mistral | null = null;
function getMistralClient(): Mistral {
    if (!_mistral) {
        _mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY ?? "" });
    }
    return _mistral;
}

export interface ImportResult {
    ficheId: string;
    produitId: string;
    ficheDegustationId: string | null;
    status: "SUCCESS" | "WARNING" | "ERROR";
    message: string;
    parsedFields: Record<string, any>;
}

export interface ImportDocuments {
    docxBuffer?: ArrayBuffer;
    xlsxBuffer?: ArrayBuffer;
    pdfBuffer?: ArrayBuffer;
    fichierNom?: string; // nom original du fichier importé
}

export class ImportWorker {

    // ─── Extracteurs de texte brut ────────────────────────────────────────────

    // Glyphes de case à cocher résiduels (bruit Word) à retirer des libellés :
    // ☐ U+2610, ☑ U+2611, ☒ U+2612, □ U+25A1, 🞎 U+1F78E, 🞏 U+1F78F.
    private static readonly CHECKBOX_GLYPHS = /[☐-☒□\u{1F78E}\u{1F78F}]/gu;

    private static async extractDocxText(buffer: ArrayBuffer): Promise<string> {
        // On passe par convertToHtml (et non extractRawText) pour préserver le
        // surlignage : dans les FD JDG le surligneur sert de "case cochée".
        // Seul le texte surligné (jaune OU vert) est une valeur sélectionnée.
        // Les deux couleurs sont mappées vers <mark> — on ne distingue pas la teinte.
        const { value: html } = await mammoth.convertToHtml(
            { buffer: Buffer.from(buffer) },
            {
                styleMap: [
                    "highlight[color='yellow'] => mark",
                    "highlight[color='green'] => mark",
                ],
            }
        );

        let text = html
            // Marqueurs de sélection — un seul marqueur pour jaune et vert.
            .replace(/<mark[^>]*>/g, "⟦SÉLECTIONNÉ⟧")
            .replace(/<\/mark>/g, "⟦/SÉLECTIONNÉ⟧")
            // Sauts de ligne : fins de bloc et <br> deviennent des newlines.
            .replace(/<\/(p|h[1-6]|li|tr)>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            // Strip de tous les tags HTML restants.
            .replace(/<[^>]+>/g, "")
            // Suppression des glyphes de case à cocher résiduels.
            .replace(ImportWorker.CHECKBOX_GLYPHS, "");

        // Décodage des entités HTML (&amp; en dernier pour éviter le double-décodage).
        text = text
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&");

        // Recoller les marqueurs au libellé après retrait des glyphes/espaces parasites :
        // "⟦SÉLECTIONNÉ⟧ non ⟦/SÉLECTIONNÉ⟧" → "⟦SÉLECTIONNÉ⟧non⟦/SÉLECTIONNÉ⟧".
        text = text
            .replace(/⟦SÉLECTIONNÉ⟧\s+/g, "⟦SÉLECTIONNÉ⟧")
            .replace(/\s+⟦\/SÉLECTIONNÉ⟧/g, "⟦/SÉLECTIONNÉ⟧")
            // Compactage des lignes vides multiples.
            .replace(/\n{3,}/g, "\n\n");

        return `[DOCUMENT WORD - FICHE DÉGUSTATION]\n${text}`;
    }

    private static extractXlsxText(buffer: ArrayBuffer): string {
        const workbook = xlsx.read(buffer, { type: "buffer" });
        let text = "[DOCUMENT EXCEL - RECETTE / INGRÉDIENTS]\n";
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            text += `\nFeuille: ${sheetName}\n`;
            text += rows
                .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ""))
                .map(row => row.join("\t"))
                .join("\n");
        }
        return text;
    }

    private static async extractPdfText(buffer: ArrayBuffer): Promise<string> {
        try {
            // Utilisation de pdf2json à la place de pdf-parse qui crashe sous Next.js 16/Turbopack
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const PDFParser = require("pdf2json");
            const pdfParser = new PDFParser(null, 1); // 1 = raw text content

            return new Promise((resolve) => {
                pdfParser.on("pdfParser_dataError", (errData: any) => {
                    console.error("[ImportWorker] Échec pdf2json:", errData?.parserError);
                    resolve("[DOCUMENT PDF - échec de lecture, contenu non disponible]");
                });
                
                pdfParser.on("pdfParser_dataReady", () => {
                    let text = pdfParser.getRawTextContent() || "";
                    // pdf2json renvoie parfois des retours à la ligne encodés
                    text = text.replace(/%E2%80%99/g, "'").replace(/%20/g, " ");
                    resolve(`[DOCUMENT PDF - FICHE TECHNIQUE / RECETTE]\n${text}`);
                });

                pdfParser.parseBuffer(Buffer.from(buffer));
            });
        } catch (e: any) {
            console.error("[ImportWorker] Exception extraction PDF:", e.message);
            return "[DOCUMENT PDF - exception lors de la lecture, contenu non disponible]";
        }
    }

    // ─── Construction du prompt Mistral ─────────────────────────────────────

    private static buildExtractionPrompt(combinedText: string, ragContext: string): string {
        return `Tu es un agent d'extraction de données pour Les Jardins de Gaïa, spécialisé dans les fiches produit de thés et infusions bio.

CONTEXTE RÉGLEMENTAIRE INTERNE (utilise-le pour valider et enrichir) :
---
${ragContext}
---

Ton rôle: extraire, normaliser et enrichir les données du/des document(s) fourni(s) (Word, Excel et/ou PDF).
Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans commentaire, sans explication.

SCHÉMA JSON ATTENDU :
{
  "codeArticle": "string (ex: MT265) ou null",
  "designation": "string (nom commercial du produit) ou null",
  "typePlante": "string (ex: Thé vert, Mélange de plantes, Rooibos...) ou null",
  "aromatise": boolean,
  "fournisseur": "string (ex: Création Maison) ou null",
  "codeArticleFournisseur": "string ou null",
  "designationFournisseur": "string ou null",
  "origine": "string (pays ou région PMI) ou null",
  "producteur": "string ou null",
  "infoProducteur": "string (infos producteur du bloc 'Informations PMI') ou null",
  "typeProducteur": "string (type de producteur, ex: coopérative) ou null",
  "origineMpa": "string (origine de la matière première agricole / MPA) ou null",
  "floId": "string (numéro FLO si présent) ou null",
  "epoqueRecolte": "string (ex: Printemps) ou null",
  "techniqueRecolte": "string ou null",
  "organismeCertificateur": "string ou null",
  "grade": "string (granulométrie) ou null",
  "volumineux": boolean ou null,
  "plusieursInfusions": boolean ou null,
  "nomLatin": "string ou null",
  "allergenesMp": "'oui' ou 'non' ou null — allergènes présents dans la matière première",
  "allegationsMp": "valeur brute du champ allégations du doc (ex: 'oui, sur le mélange final') ou null",
  "labelsMP": ["liste des labels matières premières cochés: AB, MH, WFTO, Demeter, FLO, IGP, FFL, Elephant friendly..."],
  "labelsClient": ["liste des labels produit fini cochés: AB, MH, WFTO, Demeter..."],
  "dateDegustation": "string (ex: 29/07/2025) ou null",
  "degustateur": ["tableau des dégustateurs sélectionnés, ex: Aurélie, Patrice — un ou plusieurs noms"],
  "numeroDeLot": "string ou null",
  "momentDegustation": "string (ex: matin, à tout moment) ou null",
  "parametresInfusion": {
    "poids": "string (ex: 2 g) ou null",
    "temperature": "string (ex: 95°C) ou null",
    "duree": "string (ex: 2-3 mn) ou null"
  },
  "feuillesSechesAspect": "string (notes aspect feuilles sèches) ou null",
  "feuillesSechesCouleur": "string (couleurs feuilles sèches) ou null",
  "feuillesSechesSenteur": "string (senteur feuilles sèches) ou null",
  "feuillesInfuseesAspect": "string (aspect feuilles infusées) ou null",
  "feuillesInfuseesCouleur": "string (couleur feuilles infusées) ou null",
  "feuillesInfuseesSenteur": "string (senteur feuilles infusées) ou null",
  "infusionAspectCouleur": "string (aspect/couleur de l'infusion en tasse) ou null",
  "infusionParfum": "string (parfum, arôme de l'infusion) ou null",
  "saveurBouche": "string (attaque, saveur en bouche, finale) ou null",
  "sousDesignation": "string (libellé 2 / sous désignation) ou null",
  "ingredientsSuggestion": "string (liste simplifiée des composants clés avant QUID, ex: 'Huile essentielle orange sanguine – gingembre - hibiscus') ou null",
  "ingredientsTexte": "string (liste complète des ingrédients avec % QUID si présents) ou null",
  "allergenes": "string (ex: Aucun, ou liste des allergènes présents)",
  "allegationsPossibles": [
    { "libelle": "ex: Tonifiant / vitalité", "nbTasses": "ex: 2 tasses par jour", "description": "contexte ou null" }
  ],
  "temperatureRecommandee": "string (température recommandée sur l'étiquette, ex: 95°C) ou null",
  "tempsRecommande": "string (temps recommandé sur l'étiquette, ex: 2-3min) ou null",
  "gamme": "string (grande famille produit: Rares & Précieux, Grand Classiques, Les Militants...) ou null",
  "conditionnementsOptions": [ { "gamme": "string", "format": "string", "grammage": "string" } ],
  "conditionnement": "string (ex: Vrac 100g, Sachets x20, tube métal...) ou null",
  "declinaisons": "string (déclinaisons prévues ex: 'infusette cristal JDG courant 2026') ou null",
  "poidsNet": "string (ex: 100 g) ou null",
  "tempsInfusion": "string (durée en minutes) ou null",
  "tempInfusion": "string (température en °C) ou null",
  "commentaires": "string (suggestions, observations qualité) ou null",
  "dateMiseMarche": "string (date ou description) ou null"
}

RÈGLES DE SÉLECTION (IMPORTANT) :
Les passages entourés de ⟦SÉLECTIONNÉ⟧...⟦/SÉLECTIONNÉ⟧ sont les valeurs cochées dans la fiche (équivalent d'une case cochée par surlignage). Quand une liste d'options est présente, retiens UNIQUEMENT les options marquées SÉLECTIONNÉ. Plusieurs options d'une même liste peuvent être sélectionnées (ex : plusieurs dégustateurs, plusieurs labels, plusieurs conditionnements). Si aucune option d'une liste n'est marquée, retourne null pour ce champ. Ignore tout symbole de case à cocher résiduel.

RÈGLES D'ENRICHISSEMENT :
- Si les % QUID sont dans l'Excel, intègre-les dans "ingredientsTexte" (ex: "Thé vert bio* 90%, citron* 10%")
- Pour "aromatise": true si arôme naturel ou artificiel détecté dans les ingrédients
- Pour les listes d'options, n'extraire que les valeurs marquées ⟦SÉLECTIONNÉ⟧ (voir RÈGLES DE SÉLECTION)
- "conditionnementsOptions": retiens TOUS les conditionnements ET gammes marqués SÉLECTIONNÉ comme un tableau d'objets {gamme, format, grammage}. Mets la gamme cochée DANS l'entrée correspondante (champ "gamme"), jamais dans un champ séparé. Une gamme seule sans format/grammage précisé donne une entrée avec format/grammage à null. Les déclinaisons futures (ex 'courant 2026') vont dans le champ "declinaisons" séparé, PAS dans conditionnementsOptions.
- "degustateur": tableau de noms (un ou plusieurs dégustateurs marqués SÉLECTIONNÉ)
- "infoProducteur" / "typeProducteur" / "origineMpa": à chercher dans le bloc "Informations PMI" (champs "Info producteur", "Type de producteur", "Origine MPA" = origine de la matière première agricole)
- "allegationsPossibles": extraire TOUTES les options du FD (section Remarque), chacune avec son libellé et nb de tasses
- "ingredientsSuggestion": liste simplifiée avant la liste QUID (souvent libellée 'Liste d'ingrédient :')
- "declinaisons": texte sur des déclinaisons prévues (infusette, etc.)
- Pour les notes organoleptiques, recopier fidèlement le contenu textuel des dégustateurs
- Si un champ n'est pas trouvé dans les documents, mettre null (jamais inventer)

DOCUMENTS À ANALYSER :
${combinedText.substring(0, 22000)}`;
    }

    // ─── Orchestration principale ────────────────────────────────────────────

    public static async processImport(
        docs: ImportDocuments,
        userId?: string
    ): Promise<ImportResult> {
        console.log("[ImportWorker] Démarrage de l'extraction multi-format...");

        if (!docs.docxBuffer && !docs.xlsxBuffer && !docs.pdfBuffer) {
            throw new Error("Au moins un document est requis (DOCX, XLSX ou PDF).");
        }

        // 1. Extraction du texte brut de chaque document fourni
        const textParts: string[] = [];

        if (docs.docxBuffer && docs.docxBuffer.byteLength > 0) {
            console.log("[ImportWorker] Extraction DOCX...");
            textParts.push(await this.extractDocxText(docs.docxBuffer));
        }

        if (docs.xlsxBuffer && docs.xlsxBuffer.byteLength > 0) {
            console.log("[ImportWorker] Extraction XLSX...");
            textParts.push(this.extractXlsxText(docs.xlsxBuffer));
        }

        if (docs.pdfBuffer && docs.pdfBuffer.byteLength > 0) {
            console.log("[ImportWorker] Extraction PDF...");
            textParts.push(await this.extractPdfText(docs.pdfBuffer));
        }

        const combinedText = textParts.join("\n\n" + "─".repeat(60) + "\n\n");

        // 2. Contexte RAG (règles de dénomination et ingrédients)
        const ragResults = await RAGService.searchContext(
            "Règles dénomination légale liste des ingrédients QUID allergènes",
            3
        );
        const ragContext = RAGService.formatContextForPrompt(ragResults);

        // 3. Appel Mistral Large
        console.log("[ImportWorker] Appel Mistral Large pour extraction structurée...");
        const prompt = this.buildExtractionPrompt(combinedText, ragContext);

        const response = await getMistralClient().chat.complete({
            model: "mistral-large-latest",
            messages: [
                {
                    role: "system",
                    content: "Tu es un extracteur JSON strict. Retourne UNIQUEMENT du JSON valide correspondant au schéma demandé. Jamais de markdown, jamais de texte hors JSON.",
                },
                { role: "user", content: prompt },
            ],
            maxTokens: 3000,
            temperature: 0.05,
        });

        const rawOutput = (response.choices?.[0]?.message?.content as string) ?? "{}";

        // 4. Parsing sécurisé du JSON
        let p: Record<string, any> = {};
        try {
            let clean = rawOutput.trim();
            if (clean.startsWith("```json")) clean = clean.substring(7);
            if (clean.startsWith("```")) clean = clean.substring(3);
            if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
            p = JSON.parse(clean.trim());
        } catch (e) {
            console.error("[ImportWorker] Échec parsing JSON Mistral:", rawOutput);
            throw new Error(`Mistral a retourné un JSON invalide. Réponse brute: ${rawOutput.substring(0, 200)}`);
        }

        // 5. Écriture en base — Produit
        // Les IDs sont gérés via returning() pour les produits
        const fichesEtiquetteId = crypto.randomUUID();

        // Helper pour forcer le type string ou null (évite les erreurs SQL si l'IA retourne un boolean par erreur)
        const ensureString = (val: any): string | null => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'boolean') return null; // Un boolean dans un champ varchar/text est souvent une erreur de l'IA (checkbox mal interprétée)
            return String(val);
        };

        const produitValues = {
            codePf: ensureString(p.codeArticle) || `IMP-${Date.now()}`,
            gamme: ensureString(p.gamme) || "Inconnue",
            denominationFr: ensureString(p.designation) || "Nouveau Produit",
            typeTheFr: ensureString(p.typePlante) || "",
            estAromatise: p.aromatise ?? false,
            origine: ensureString(p.origine) || null,
            producteurJardin: ensureString(p.producteur) || null,
            conditionnement: ensureString(p.conditionnement) || null,
            sousDesignationFr: ensureString(p.sousDesignation) || null,
            poidsNet: ensureString(p.poidsNet) || null,
            tempsInfusion: ensureString(p.tempsRecommande || p.tempsInfusion) || null,
            tempInfusion: ensureString(p.temperatureRecommandee || p.tempInfusion) || null,
            plusieursInfusions: p.plusieursInfusions ?? false,
            fournisseur: ensureString(p.fournisseur) || null,
            codeArticleFournisseur: ensureString(p.codeArticleFournisseur) || null,
            designationFournisseur: ensureString(p.designationFournisseur) || null,
            floId: ensureString(p.floId) || null,
            epoqueRecolte: ensureString(p.epoqueRecolte) || null,
            techniqueRecolte: ensureString(p.techniqueRecolte) || null,
            organismeCertificateur: ensureString(p.organismeCertificateur) || null,
            grade: ensureString(p.grade) || null,
            volumineux: p.volumineux ?? null,
            nomLatin: ensureString(p.nomLatin) || null,
            infoProducteur: ensureString(p.infoProducteur) || null,
            typeProducteur: ensureString(p.typeProducteur) || null,
            origineMpa: ensureString(p.origineMpa) || null,
            allergenesMp: ensureString(p.allergenesMp) || null,
            allegationsMp: ensureString(p.allegationsMp) || null,
            labelsMP: Array.isArray(p.labelsMP) ? p.labelsMP : [],
            labelsClient: Array.isArray(p.labelsClient) ? p.labelsClient : [],
            conditionnementsOptions: Array.isArray(p.conditionnementsOptions) && p.conditionnementsOptions.length > 0
                ? p.conditionnementsOptions
                : null,
            declinaisons: ensureString(p.declinaisons) || null,
            ingredientsSuggestion: ensureString(p.ingredientsSuggestion) || null,
            allegationsPossibles: Array.isArray(p.allegationsPossibles) && p.allegationsPossibles.length > 0
                ? p.allegationsPossibles
                : null,
            dateMiseMarche: ensureString(p.dateMiseMarche) || null,
            commentaires: ensureString(p.commentaires) || null,
            misAJourLe: new Date(),
        };

        const [upsertedProduit] = await db.insert(produits)
            .values({
                id: crypto.randomUUID(),
                ...produitValues,
            })
            .onConflictDoUpdate({
                target: produits.codePf,
                set: produitValues
            })
            .returning({ id: produits.id });

        const produitId = upsertedProduit.id;

        // 6. Écriture en base — Fiche étiquette
        await db.insert(fichesEtiquettes).values({
            id: fichesEtiquetteId,
            produitId: produitId,
            statut: "DRAFT",
            creePar: userId || null,
            ingredientsFr: p.ingredientsTexte || "",
            allergenes: p.allergenes || "Aucun",
            // Allégations : on pré-remplit avec la première option si elle existe
            allegationsSanteFr: Array.isArray(p.allegationsPossibles) && p.allegationsPossibles.length > 0
                ? p.allegationsPossibles.map((a: any) => `${a.libelle} (${a.nbTasses})`).join(' | ')
                : (p.allegations || ""),
            // allegationChoisie et nbTassesAllegation sont null à l'import — Marie choisira
            allegationChoisie: null,
            nbTassesAllegation: null,
        });

        // 7. Écriture en base — Fiche dégustation
        let ficheDegustationId: string | null = null;
        const hasDegtData = p.dateDegustation
            || (Array.isArray(p.degustateur) && p.degustateur.length > 0)
            || p.feuillesSechesAspect
            || p.saveurBouche || p.infusionParfum || p.infusionAspectCouleur;

        if (hasDegtData) {
            ficheDegustationId = crypto.randomUUID();
            await db.insert(fichesDegustation).values({
                id: ficheDegustationId,
                produitId,
                dateDegustation: p.dateDegustation || null,
                degustateur: Array.isArray(p.degustateur) && p.degustateur.length > 0 ? p.degustateur : null,
                numeroDeLot: p.numeroDeLot || null,
                momentDegustation: p.momentDegustation || null,
                poidsInfuse: p.parametresInfusion?.poids || null,
                temperatureDegustation: p.parametresInfusion?.temperature || null,
                tempsDegustation: p.parametresInfusion?.duree || null,
                feuillesSechesAspect: p.feuillesSechesAspect || null,
                feuillesSechesCouleur: p.feuillesSechesCouleur || null,
                feuillesSechesSenteur: p.feuillesSechesSenteur || null,
                feuillesInfuseesAspect: p.feuillesInfuseesAspect || null,
                feuillesInfuseesCouleur: p.feuillesInfuseesCouleur || null,
                feuillesInfuseesSenteur: p.feuillesInfuseesSenteur || null,
                infusionAspectCouleur: p.infusionAspectCouleur || null,
                infusionParfum: p.infusionParfum || null,
                saveurBouche: p.saveurBouche || null,
                fichierSourceNom: docs.fichierNom || null,
            });
            console.log(`[ImportWorker] Fiche dégustation créée → id: ${ficheDegustationId}`);
        }

        console.log(`[ImportWorker] Import réussi → produitId: ${produitId}`);

        return {
            ficheId: fichesEtiquetteId,
            produitId,
            ficheDegustationId,
            status: "SUCCESS",
            message: `Extraction IA terminée. ${textParts.length} document(s) analysé(s).${ficheDegustationId ? " Fiche dégustation créée." : ""}`,
            parsedFields: p,
        };
    }
}
