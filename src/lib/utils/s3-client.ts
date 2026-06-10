import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
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

/**
 * Recherche le fichier de manière insensible à la casse 
 * et retourne sa vraie clé S3 (ex: "codePf" peut retrouver "CODEPF.pdf" ou "codePf.ai")
 */
export async function findFileKeysByPrefix(prefix: string): Promise<string[]> {
    try {
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;
        let allKeys: string[] = [];

        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken,
            });

            const response = await s3Client.send(command) as any;

            if (response.Contents) {
                const keys = response.Contents.map((item: any) => item.Key).filter((k: any): k is string => !!k);
                allKeys.push(...keys);
            }

            isTruncated = response.IsTruncated ?? false;
            continuationToken = response.NextContinuationToken;
        }

        const searchCode = prefix.toLowerCase();
        let matchedKeys: string[] = [];

        // 1. Stratégie exacte (ex: tb4041 présent tel quel + .pdf)
        const exactMatches = allKeys.filter(k => k.toLowerCase().includes(searchCode) && k.toLowerCase().endsWith('.pdf'));
        matchedKeys.push(...exactMatches);

        // 2. Stratégie du code de base (ex: le dossier contient 404, mais la BDD a 4041)
        const numMatch = searchCode.match(/\d{3,}/);
        if (numMatch) {
            const num = numMatch[0]; // ex: 4041
            // Si c'est 4 chiffres, on tente avec les 3 premiers (ex: 404)
            const baseNum = num.length > 3 ? num.substring(0, num.length - 1) : num;

            const baseMatches = allKeys.filter(k => k.toLowerCase().includes(baseNum) && k.toLowerCase().endsWith('.pdf'));
            baseMatches.forEach(bm => {
                if (!matchedKeys.includes(bm)) matchedKeys.push(bm);
            });
        }

        // 3. Fallback: n'importe quel fichier lié (AI compris) si aucun PDF trouvé
        if (matchedKeys.length === 0) {
            const fallbackMatches = allKeys.filter(k => k.toLowerCase().includes(searchCode));
            if (fallbackMatches.length > 0) matchedKeys.push(...fallbackMatches);
        }

        // Remove duplicates and return
        return Array.from(new Set(matchedKeys));

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
