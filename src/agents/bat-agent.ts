import { BaseAgent } from "./BaseAgent";
import { Mistral } from "@mistralai/mistralai";

interface BatVisionAgentInput {
    batValide: {
        denominationLegale: string;
        ingredientsFr: string;
        allegationsSanteFr: string;
        allergenes: string;
        mentionsObligatoires: string[];
    };
    imageReceievedBase64: string; // The BAT Image in base64 format (jpeg, png, webp)
    imageMediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface BatVisionOutput {
    status: "CONFORME" | "NON_CONFORME" | "A_VERIFIER";
    defautsDetectes: {
        type: "TEXTE" | "LOGO" | "TYPOGRAPHIE" | "AUTRE";
        description: string;
        severity: "CRITIQUE" | "MINEUR";
    }[];
    conclusion: string;
}

/**
 * Super Inspecteur BAT - Utilise Pixtral Large (Vision) pour valider la conformité texte et graphique.
 */
export class BatVisionAgent extends BaseAgent {
    private mistralClient: InstanceType<typeof Mistral>;

    constructor() {
        super("BatVisionAgent");
        const apiKey = process.env.MISTRAL_API_KEY ?? "";
        this.mistralClient = new Mistral({ apiKey });
    }

    async execute(input: BatVisionAgentInput): Promise<BatVisionOutput> {
        const systemPrompt = `Tu es l'Inspecteur BAT Ultime des Jardins de Gaïa, agissant comme un comité de relecture de 3 experts :
1. Expert Textes : Vérifie les mots, les pourcentages (QUID), et la moindre faute de frappe dans les ingrédients par rapport à la base.
2. Expert Conformité (Logos) : Vérifie la présence des logos obligatoires (Eurofeuille, Triman, poubelle barrée, logo AB) s'ils sont applicables, et leur bonne intégrité visuelle.
3. Expert Typographie (INCO) : Vérifie que l'allergène est bien mis en évidence (ex: gras ou majuscules).

On va te fournir l'image du "Bon à Tirer" (BAT) final et les "Données Vérité" de la base de données.
Compare-les avec une rigueur absolue. Si un "g" de gramme manque, si une majuscule manque dans l'ingrédient principal, c'est une erreur CRITIQUE.

RÉPOND STRICTEMENT AU FORMAT JSON SUIVANT, SANS AUCUN AUTRE TEXTE :
{
  "status": "CONFORME|NON_CONFORME|A_VERIFIER",
  "defautsDetectes": [
    { 
        "type": "TEXTE|LOGO|TYPOGRAPHIE|AUTRE", 
        "description": "Explication claire du défaut visuel ou textuel trouvé sur l'image par rapport à la base.",
        "severity": "CRITIQUE|MINEUR" 
    }
  ],
  "conclusion": "Synthèse globale des 3 experts."
}

Données Vérité (À retrouver EXACTEMENT sur l'image) :
${JSON.stringify(input.batValide, null, 2)}`;

        // Encode image as data URL for Pixtral
        const imageDataUrl = `data:${input.imageMediaType};base64,${input.imageReceievedBase64}`;

        try {
            const response = await this.mistralClient.chat.complete({
                model: "pixtral-large-latest",
                messages: [
                    {
                        role: "system",
                        content: "Tu es un extracteur JSON strict. Ne retourne QUE du JSON valide.",
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: systemPrompt,
                            },
                            {
                                type: "image_url",
                                imageUrl: { url: imageDataUrl },
                            },
                            {
                                type: "text",
                                text: "Analyse visuellement cette image du BAT et compare-la aux Données Vérité. Détecte les fautes de frappes et les logos manquants. Retourne UNIQUEMENT le JSON.",
                            },
                        ],
                    },
                ],
                maxTokens: 1500,
                temperature: 0.1,
            });

            const responseText =
                (response.choices?.[0]?.message?.content as string) ?? "";
            return this.parseJson<BatVisionOutput>(responseText);
        } catch (e: any) {
            console.error("Echec au sein du BatVisionAgent:", e);
            throw e;
        }
    }
}
