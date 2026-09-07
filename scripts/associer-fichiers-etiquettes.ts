/**
 * Backfill for `fichiers_etiquettes` — turns the naming heuristic into stored data.
 *
 * Reads every product, resolves its label files in MinIO by base article code,
 * and writes the links. Rows a human set (`origine = MANUEL`) are preserved.
 * Safe to re-run: it replaces automatic links, it never deletes a product.
 *
 * Usage:  npx tsx scripts/associer-fichiers-etiquettes.ts [--dry-run]
 */

import "dotenv/config";

import { db } from "../src/db";
import { produits } from "../src/db/schema";
import { remplacerAssociationsAuto } from "../src/db/queries/fichiers-etiquettes";
import { resoudreFichiersProduit } from "../src/lib/utils/s3-client";

async function main() {
    const dryRun = process.argv.includes("--dry-run");
    const tous = await db.select({ id: produits.id, codePf: produits.codePf }).from(produits);

    let avecBat = 0;
    let sansFichier = 0;
    let totalLiens = 0;
    const ambigus: string[] = [];
    const orphelins: string[] = [];

    for (const produit of tous) {
        const fichiers = await resoudreFichiersProduit(produit.codePf);

        if (fichiers.length === 0) {
            sansFichier += 1;
            orphelins.push(produit.codePf);
            continue;
        }

        const dossiers = new Set(fichiers.map((f) => f.dossier));
        if (dossiers.size > 1) ambigus.push(`${produit.codePf} → ${[...dossiers].join(" | ")}`);

        if (fichiers.some((f) => f.type === "BAT")) avecBat += 1;
        totalLiens += fichiers.length;

        if (!dryRun) await remplacerAssociationsAuto(produit.id, fichiers);
    }

    process.stdout.write(
        [
            dryRun ? "\n--- SIMULATION (aucune écriture) ---" : "\n--- ASSOCIATIONS ÉCRITES ---",
            `produits traités      : ${tous.length}`,
            `liens                 : ${totalLiens}`,
            `produits avec un BAT  : ${avecBat}`,
            `produits sans fichier : ${sansFichier}`,
            "",
            `à arbitrer — plusieurs dossiers (${ambigus.length}) :`,
            ...ambigus.map((l) => `  ${l}`),
            "",
            `sans aucun fichier (${orphelins.length}) :`,
            `  ${orphelins.join(", ")}`,
            "",
        ].join("\n")
    );
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
        process.exit(1);
    });
