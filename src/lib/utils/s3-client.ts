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

/** Article code at the head of a folder name: "TA7372 - Malin comme un chimpanzé" → "TA7372". */
function codeDuDossier(segment: string): string | null {
    const match = segment.match(/^[A-Za-z]+\d+/);
    return match ? match[0].toUpperCase() : null;
}

/**
 * A product's `codePf` carries one extra trailing digit for the packaging
 * variant, where the MinIO folder holds the base article code. Measured on the
 * live bucket (2026-09-07): 50 codes match a folder exactly, 99 match it minus
 * that digit, 3 have no folder at all.
 *
 * Whole tokens are compared on purpose. The previous implementation searched the
 * bare digits anywhere in the key, so "TA737" reached
 * "TM7372 - LIGHT MY FIRE/ETNM737V5 - Light my fire.pdf" — the BAT of an
 * unrelated product, which the audit then merged into this one's verdict.
 */
function correspondAuCode(codeDossier: string, codePf: string): boolean {
    const code = codePf.trim().toUpperCase();
    return codeDossier === code || codeDossier === code.slice(0, -1);
}

export interface BatFiles {
    /** Folders the files were read from — surfaced so the user can see the source. */
    dossiers: string[];
    keys: string[];
}

/**
 * Locates a product's label files in MinIO, matching on the folder segment only.
 * PDFs are returned when the folder has any; otherwise every file in it, so a
 * folder holding only `.ai` sources still shows up.
 */
export async function findBatFiles(codePf: string): Promise<BatFiles> {
    try {
        const dossiers = new Set<string>();
        const trouves: string[] = [];

        for (const key of await listAllKeys()) {
            const segments = key.split("/");
            if (segments.length < 2) continue;

            const dossier = segments[segments.length - 2];
            const code = codeDuDossier(dossier);
            if (!code || !correspondAuCode(code, codePf)) continue;

            dossiers.add(dossier);
            trouves.push(key);
        }

        const pdfs = trouves.filter((k) => k.toLowerCase().endsWith(".pdf"));
        return { dossiers: [...dossiers], keys: pdfs.length > 0 ? pdfs : trouves };
    } catch (e) {
        console.error("Error scanning bucket:", e);
        return { dossiers: [], keys: [] };
    }
}

/** Keys only, for callers that don't need to know which folder they came from. */
export async function findFileKeysByPrefix(codePf: string): Promise<string[]> {
    return (await findBatFiles(codePf)).keys;
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
