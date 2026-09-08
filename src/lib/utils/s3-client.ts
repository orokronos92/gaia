import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    ListObjectsV2Command,
    HeadBucketCommand,
    CreateBucketCommand,
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

/**
 * Source documents live in their own bucket, deliberately.
 *
 * `label-assets` answers anonymous GETs *and* anonymous LIST — anyone knowing
 * the endpoint can enumerate it. A recette workbook is the full formulation, so
 * it goes somewhere that is private by birth rather than by policy patch.
 */
export const BUCKET_IMPORTS = process.env.MINIO_BUCKET_IMPORTS || "import-sources";

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
 * Base article code: alphabetic prefix + the three-digit article number.
 *
 * MOP-PRO-029 §2.1.2 and §2.1.3 (JDG, v.2, 26/01/2023): a finished-product code
 * is `<famille><n° article sur 3 chiffres><conditionnement>`, the last digit
 * naming a packaging format — 2 = 100 g, 6 = 50 g, 1 = 1,5 kg vrac, and so on.
 * So TB4016 and TB4017 are White Monkey in 50 g and in 1 kg, not two versions of
 * one thing; grouping on the article number is what puts a product's packagings
 * together. Label file names follow the same rule (§2.2.2, §2.2.3): the facing
 * label may omit the packaging digit, the back label carries it — hence
 * ETNA737V5 alongside ETCNA7372V5 in a single folder.
 *
 * Keeping the alphabetic prefix is what stops TA737 from reaching
 * "TM7372 - LIGHT MY FIRE" — an unrelated product whose files the old
 * digits-only search pulled straight into this one's audit.
 *
 * The three-digit article number is the client's documented convention, not a
 * law. The resolved folder is reported to the caller so an unexpected match is
 * visible rather than silent.
 */
export function codeDeBase(code: string): string | null {
    const match = code.trim().toUpperCase().match(/^([A-Z]+)(\d{3})/);
    return match ? `${match[1]}${match[2]}` : null;
}

/**
 * Version marker carried by the file name ("ETCNA7372V5 - …" → "V5").
 *
 * The last V-number of the code block wins: names like
 * "TV112_ETVN112V3 Lü Zhen…" repeat the article code first, so reading the
 * first match returns "V112" — the code, not the version. Heuristic by nature,
 * because the client's file naming has no enforced format.
 */
function versionDuFichier(nomFichier: string): string | null {
    const blocCode = nomFichier.split(" ")[0] ?? "";
    const matches = [...blocCode.matchAll(/V(\d+)/gi)];
    const dernier = matches.at(-1);
    return dernier ? `V${dernier[1]}` : null;
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
export async function getPresignedUrl(
    fileKey: string,
    expiresInBytesSeconds = 3600,
    bucket: string = BUCKET_NAME
): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
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
export async function getObjectBuffer(fileKey: string, bucket: string = BUCKET_NAME): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: bucket,
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

/** Buckets already confirmed to exist, so the check costs one call per process. */
const bucketsVerifies = new Set<string>();

/** Creates the bucket if it is missing — a fresh deployment has none. */
async function assurerBucket(bucket: string): Promise<void> {
    if (bucketsVerifies.has(bucket)) return;
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
        // 404 (absent) or 403 (no rights to probe): try to create, ignore "already there".
        try {
            await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
        } catch {
            // Another process won the race, or we lack the right — the upload will say.
        }
    }
    bucketsVerifies.add(bucket);
}

/** Stores a file and returns its key. No public policy is ever set here. */
export async function uploadFileToS3(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    bucket: string = BUCKET_NAME
): Promise<string> {
    await assurerBucket(bucket);

    await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
    }));

    return fileName;
}
