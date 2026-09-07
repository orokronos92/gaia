import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    ListObjectsV2Command,
    type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.MINIO_REGION || "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true, // Requis pour Minio
});

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "label-assets";

/** Every object key in the bucket, following pagination. */
async function listAllKeys(): Promise<string[]> {
    const allKeys: string[] = [];
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
        const response: ListObjectsV2CommandOutput = await s3Client.send(
            new ListObjectsV2Command({ Bucket: BUCKET_NAME, ContinuationToken: continuationToken })
        );

        for (const item of response.Contents ?? []) {
            if (item.Key) allKeys.push(item.Key);
        }

        isTruncated = response.IsTruncated ?? false;
        continuationToken = response.NextContinuationToken;
    }

    return allKeys;
}

/**
 * Base article code: alphabetic prefix + the first three digits.
 *
 * The fourth digit is a version, not a different article — JDG's own numbering.
 * Verified on the live bucket (2026-09-07): every code that collapses to the
 * same base belongs to the same product (TB4016/TB4017 are both White Monkey,
 * TB4041/2/6 are all Ché Chun), and 148 of the 151 real products resolve to one
 * folder and one only. Keeping the alphabetic prefix is what stops TA737 from
 * reaching "TM7372 - LIGHT MY FIRE" — an unrelated product whose files the old
 * digits-only search pulled straight into this one's audit.
 *
 * This assumes a three-digit base, which is the client's current convention and
 * not a law. The resolved folder is reported to the caller so an unexpected
 * match is visible rather than silent.
 */
export function codeDeBase(code: string): string | null {
    const match = code.trim().toUpperCase().match(/^([A-Z]+)(\d{3})/);
    return match ? `${match[1]}${match[2]}` : null;
}

/** Version marker carried by the file name ("ETCNA7372V5 - …" → "V5"), if any. */
function versionDuFichier(nomFichier: string): string | null {
    const premierJeton = nomFichier.split(/[\s\-_.]/)[0] ?? "";
    const match = premierJeton.match(/V(\d+)$/i);
    return match ? `V${match[1]}` : null;
}

/** One label file as found in the bucket, ready to be persisted against a product. */
export interface FichierResolu {
    cleS3: string;
    dossier: string;
    nomFichier: string;
    /** PDFs are the BAT the audit reads; anything else (.ai) is a design source. */
    type: "BAT" | "SOURCE";
    version: string | null;
}

/**
 * Resolves a product's label files from the bucket by base article code.
 *
 * This is the bootstrap for `fichiers_etiquettes`, and the suggester for files
 * that appear later — never the runtime source of truth. What the audit and the
 * fiche read is the stored link, so the client reorganising its codes costs one
 * remap instead of a permanent re-tuning of this rule.
 */
export async function resoudreFichiersProduit(codePf: string): Promise<FichierResolu[]> {
    const base = codeDeBase(codePf);
    if (!base) return [];

    try {
        const resolus: FichierResolu[] = [];

        for (const key of await listAllKeys()) {
            const segments = key.split("/");
            if (segments.length < 2) continue;

            const dossier = segments[segments.length - 2];
            const nomFichier = segments[segments.length - 1];
            const codeDossier = dossier.match(/^[A-Za-z]+\d+/)?.[0];
            if (!codeDossier || codeDeBase(codeDossier) !== base) continue;

            resolus.push({
                cleS3: key,
                dossier,
                nomFichier,
                type: nomFichier.toLowerCase().endsWith(".pdf") ? "BAT" : "SOURCE",
                version: versionDuFichier(nomFichier),
            });
        }

        return resolus;
    } catch (e) {
        console.error("Error scanning bucket:", e);
        return [];
    }
}

/**
 * Génère une URL temporaire signée pour accéder à un fichier privé
 */
export async function getPresignedUrl(fileKey: string, expiresInBytesSeconds = 3600): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
        });

        // La signature permet l'accès même si le bucket n'est pas public
        const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInBytesSeconds });
        return url;
    } catch (error) {
        console.error(`Erreur création presigned URL pour ${fileKey}:`, error);
        throw new Error("Impossible de générer le lien de fichier");
    }
}

/**
 * Récupère le contenu brut d'un objet MinIO (PDF du BAT, etc.) côté serveur.
 * Passe par l'API S3 (objet logique intègre) — ne JAMAIS lire le `part.1` sur
 * disque, qui n'est pas l'objet (header décalé, XRef invalide).
 */
export async function getObjectBuffer(fileKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
        throw new Error(`Objet S3 introuvable ou vide : ${fileKey}`);
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
}

/**
 * Génère une URL directe si le bucket est configuré en public (rapide)
 */
export function getPublicUrl(fileKey: string): string {
    const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
    return `${endpoint}/${BUCKET_NAME}/${fileKey}`;
} // utilitaire d'upload

/**
 * Utilitaire d'upload (pour l'avenir)
 */
export async function uploadFileToS3(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
    });

    await s3Client.send(command);
    return fileName;
}
