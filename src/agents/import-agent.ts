import { BaseAgent } from "./BaseAgent";
import { MistralProvider } from "./MistralProvider";

interface ImportAgentInput {
    wordContentRaw: string;
}

export interface AllegationOption {
    libelle: string;       // ex: "Tonifiant / vitalité"
    nbTasses: string;      // ex: "2 tasses par jour"
    description?: string;  // ex: "allégation tonique portée sur le maté"
}

export interface ImportAgentOutput {
    // ─── Identification ────────────────────────────────────────────────────────
    codeArticle: string | null;         // ex: MT265
    designation: string | null;         // Désignation JDG définitive
    typePlante: string | null;          // ex: Mélange de plantes
    aromatise: boolean;
    fournisseur: string | null;         // ex: Création Maison
    codeArticleFournisseur: string | null;
    designationFournisseur: string | null;
    // ─── PMI ────────────────────────────────────────────────────────────────
    origine: string | null;             // Pays / Région matière première
    producteur: string | null;
    floId: string | null;               // ex: Maté FLO - Triunfo
    epoqueRecolte: string | null;       // ex: Printemps
    techniqueRecolte: string | null;
    organismeCertificateur: string | null;
    grade: string | null;               // granulométrie
    volumineux: boolean | null;
    plusieursInfusions: boolean | null;
    nomLatin: string | null;
    infoProducteur: string | null;      // Informations complémentaires producteur
    typeProducteur: string | null;      // Coopérative, etc.
    origineMpa: string | null;          // Origine Matière Première Aromatique
    // ─── Allergènes & Allégations MP ────────────────────────────────────────
    allergenesMp: string | null;        // "oui" / "non" / null
    allegationsMp: string | null;       // "oui" / "non" / "oui, sur le mélange final" / null
    // ─── Labels ─────────────────────────────────────────────────────────────
    labelsMP: string[];                 // [\"AB\", \"FLO\", \"MH\"...]
    labelsClient: string[];             // [\"AB\", \"WFTO\"...]
    // ─── Dégustation meta ───────────────────────────────────────────────────
    dateDegustation: string | null;     // ex: 29/07/2025
    degustateur: string | null;         // ex: Aurélie
    numeroDeLot: string | null;
    momentDegustation: string | null;   // ex: à tout moment
    // ─── Paramètres d'infusion ──────────────────────────────────────────────
    parametresInfusion: {
        poids: string | null;           // ex: 2 g
        temperature: string | null;     // ex: 95°C
        duree: string | null;           // ex: 2-3 mn
    };
    // ─── Notes organoleptiques ──────────────────────────────────────────────
    feuillesSechesAspect: string | null;
    feuillesSechesCouleur: string | null;
    feuillesSechesSenteur: string | null;
    feuillesInfuseesAspect: string | null;
    feuillesInfuseesCouleur: string | null;
    feuillesInfuseesSenteur: string | null;
    infusionAspectCouleur: string | null;
    infusionParfum: string | null;
    saveurBouche: string | null;
    // ─── Produit fini / Étiquette ───────────────────────────────────────────
    sousDesignation: string | null;
    ingredientsSuggestion: string | null;  // liste simplifiée avant liste QUID
    ingredientsTexte: string | null;       // liste complète avec % QUID
    allergenes: string;
    allegationsPossibles: AllegationOption[];  // tableau des options proposées dans le FD
    // ─── Infusion produit fini ──────────────────────────────────────────────
    temperatureRecommandee: string | null;  // pour l'étiquette produit fini
    tempsRecommande: string | null;         // pour l'étiquette produit fini
    // ─── Conditionnement ────────────────────────────────────────────────────
    gamme: string | null;
    gammeConditionnement: string | null; // ex: Les Militants (gamme principale cochée)
    conditionnementsOptions: Record<string, any> | null; // toutes les gammes/formats cochés
    conditionnement: string | null;
    // ─── Déclinaisons ───────────────────────────────────────────────────────
    declinaisons: string | null;        // ex: "infusette cristal JDG courant 2026"
    // ─── Divers ─────────────────────────────────────────────────────────────
    commentaires: string | null;
    dateMiseMarche: string | null;      // ex: Tarif 2026 lancement fin 2025
}

/**
 * Agent 1 (PRD-04) - Extraction complète des fiches de dégustation JDG.
 */
export class ImportAgent extends BaseAgent {
    constructor() {
        const apiKey = process.env.MISTRAL_API_KEY;
        const provider = apiKey ? new MistralProvider(apiKey) : undefined;
        super("ImportAgent", provider);
    }

    async execute(input: ImportAgentInput): Promise<ImportAgentOutput> {
        const systemPrompt = `Tu es un assistant spécialisé dans l'extraction de données de fiches de dégustation des Jardins de Gaïa.
Extrais TOUTES les données du document et retourne UNIQUEMENT un objet JSON valide, sans markdown, sans commentaire, sans backticks.

Schéma JSON attendu :
{
  "codeArticle": "string (ex: MT265) ou null",
  "designation": "string (Désignation JDG définitive) ou null",
  "typePlante": "string (ex: Mélange de plantes, Thé vert...) ou null",
  "aromatise": boolean,
  "fournisseur": "string (ex: Création Maison) ou null",
  "codeArticleFournisseur": "string ou null",
  "designationFournisseur": "string ou null",
  "origine": "string (pays/région PMI) ou null",
  "producteur": "string ou null",
  "floId": "string (ex: Maté FLO - Triunfo) ou null",
  "epoqueRecolte": "string (ex: Printemps) ou null",
  "techniqueRecolte": "string ou null",
  "organismeCertificateur": "string ou null",
  "grade": "string (granulométrie) ou null",
  "volumineux": boolean ou null,
  "plusieursInfusions": boolean ou null,
  "nomLatin": "string ou null",
  "infoProducteur": "string (informations complémentaires sur le producteur) ou null",
  "typeProducteur": "string (ex: coopérative, indépendant...) ou null",
  "origineMpa": "string (Origine MPA) ou null",
  "allergenesMp": "string ('oui' / 'non') ou null — allergènes présents dans la matière première",
  "allegationsMp": "string (valeur brute du champ allégations du doc, ex: 'oui, sur le mélange final') ou null",
  "labelsMP": ["AB", "MH", "FLO", "Demeter", "WFTO", "Trust", "Wild", "IGP Darjeeling", "FFL", "Elephant friendly"... — uniquement ceux cochés],
  "labelsClient": ["AB", "MH", "Demeter", "WFTO"... — uniquement ceux cochés pour le produit fini],
  "dateDegustation": "string (ex: 29/07/2025) ou null",
  "degustateur": "string (ex: Aurélie) ou null",
  "numeroDeLot": "string ou null",
  "momentDegustation": "string (ex: matin, à tout moment) ou null",
  "parametresInfusion": {
    "poids": "string (ex: 2 g) ou null",
    "temperature": "string (ex: 95°C) ou null",
    "duree": "string (ex: 2-3 mn) ou null"
  },
  "feuillesSechesAspect": "string (notes aspect feuilles sèches) ou null",
  "feuillesSechesCouleur": "string ou null",
  "feuillesSechesSenteur": "string ou null",
  "feuillesInfuseesAspect": "string (notes aspect feuilles infusées) ou null",
  "feuillesInfuseesCouleur": "string ou null",
  "feuillesInfuseesSenteur": "string ou null",
  "infusionAspectCouleur": "string (aspect/couleur de l'infusion en tasse) ou null",
  "infusionParfum": "string (parfum/arôme de l'infusion) ou null",
  "saveurBouche": "string (saveur, attaque, finale) ou null",
  "sousDesignation": "string (libellé 2 / sous désignation) ou null",
  "ingredientsSuggestion": "string (liste simplifiée des arômes/composants clés avant formulation QUID, ex: 'Huile essentielle orange sanguine – gingembre - hibiscus') ou null",
  "ingredientsTexte": "string (liste complète des ingrédients avec % QUID si présents) ou null",
  "allergenes": "string (ex: Aucun, ou liste des allergènes présents)",
  "allegationsPossibles": [
    { "libelle": "string (ex: Tonifiant / vitalité)", "nbTasses": "string (ex: 2 tasses par jour)", "description": "string ou null" }
  ],
  "temperatureRecommandee": "string (température recommandée sur l'étiquette produit fini, ex: 95°C) ou null",
  "tempsRecommande": "string (temps recommandé sur l'étiquette produit fini, ex: 2-3min) ou null",
  "gamme": "string (grande famille: Rares & Précieux, Grand Classiques, Les Militants...) ou null",
  "gammeConditionnement": "string (gamme principale cochée) ou null",
  "conditionnementsOptions": { "gamme": "string", "format": "string", "grammage": "string" } ou null,
  "conditionnement": "string (ex: sachet 100g, tube métal...) ou null",
  "declinaisons": "string (déclinaisons prévues, ex: 'infusette cristal JDG courant 2026') ou null",
  "commentaires": "string (suggestions, commentaires dégustation) ou null",
  "dateMiseMarche": "string ou null"
}

RÈGLES CRITIQUES :
1. TYPES DE DONNÉES : Ne retourne JAMAIS de boolean (true/false) pour des champs marqués comme "string". Si l'info n'est pas claire, mets null. Un champ "producteur" ne doit pas être true, il doit contenir le nom ou être null.
2. CHECKBOXES : Extraire les checkboxes cochées (🞎 = non coché, cases cochées apparaissent avec une marque comme 🗹 ou un point).
3. FIDÉLITÉ : Pour les notes organoleptiques, recopier fidèlement le contenu textuel.
4. ALLEGATIONS : "allegationsPossibles": extraire TOUTES les options proposées dans le FD (souvent section Remarque), chacune avec son libellé et son nombre de tasses.
5. INGRÉDIENTS : "ingredientsSuggestion" est la liste courte/commerciale avant la formulation QUID.
6. Si un champ n'est pas trouvé, mettre null (jamais inventer).
7. "aromatise": true si arôme naturel ou artificiel présent dans les ingrédients.`;

        const userContent = `Voici le contenu de la fiche de dégustation :\n\n${input.wordContentRaw}`;

        try {
            const responseText = await this.generateResponse(systemPrompt, userContent);
            return this.parseJson<ImportAgentOutput>(responseText);
        } catch (e: any) {
            console.error("Echec au sein de l'ImportAgent:", e);
            throw e;
        }
    }
}
