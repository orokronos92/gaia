"use server"

import { z } from "zod"

import { auth } from "@/auth"
import { getBatTextInputForFiche } from "@/db/queries/audit"
import { controlerBat, type FaceBat } from "@/lib/audit/visual/controles-bat"
import { runTextRobot, type BatTextCheck } from "@/lib/audit/visual/text-robot"
import { countByStatus, overallStatus } from "@/lib/audit/synthesis"
import type { ControlStatus } from "@/lib/audit/types"
import { analyserBat } from "@/lib/utils/pdf-bat"
import { extractPdfText } from "@/lib/utils/pdf-text"

/** Un BAT dépasse rarement 5 Mo ; au-delà, c'est une erreur de fichier. */
const TAILLE_MAX = 15 * 1024 * 1024
const FACES_MAX = 6

const EntreeSchema = z.object({ ficheId: z.string().uuid() })

export interface FaceRefusee {
  nom: string
  raison: string
}

export interface ControleGraphismeResult {
  ok: boolean
  error?: string
  /** Faces réellement lues. */
  faces?: string[]
  /** Faces écartées, et pourquoi — un contrôle silencieux serait pire que rien. */
  refusees?: FaceRefusee[]
  overallStatus?: ControlStatus
  counts?: Record<ControlStatus, number>
  checks?: BatTextCheck[]
}

/**
 * Auto-contrôle d'un BAT avant envoi à la Qualité.
 *
 * Fabrice dessine les étiquettes ; Marie les contrôle. Entre les deux, une
 * étiquette est déjà partie chez l'imprimeur sans son titre. Cet écran lui rend
 * les contrôles que le code sait faire seul — texte, tailles, graisses,
 * positions — sur un fichier qu'il n'a pas encore envoyé.
 *
 * Trois propriétés délibérées :
 *   - **aucun modèle appelé** : ni jeton consommé, ni attente, ni verdict
 *     d'IA à relire. Ce qui est rendu est mesuré ;
 *   - **rien n'est écrit** : ni fichier stocké, ni journal, ni statut de fiche.
 *     Un brouillon reste un brouillon, et le contrôle peut être relancé sans
 *     laisser de trace dans le dossier ;
 *   - **le verdict de la Qualité reste entier** : cet écran débroussaille,
 *     il ne valide pas.
 */
export async function controleGraphismeAction(
  formData: FormData
): Promise<ControleGraphismeResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

  const parsed = EntreeSchema.safeParse({ ficheId: formData.get("ficheId") })
  if (!parsed.success) return { ok: false, error: "Sélectionnez le produit auquel comparer le BAT." }

  const data = await getBatTextInputForFiche(parsed.data.ficheId)
  if (!data) return { ok: false, error: "Fiche introuvable." }

  const fichiers = formData.getAll("faces").filter((f): f is File => f instanceof File && f.size > 0)
  if (fichiers.length === 0) return { ok: false, error: "Ajoutez au moins une face au format PDF." }
  if (fichiers.length > FACES_MAX) {
    return { ok: false, error: `Trop de faces (${fichiers.length}) — ${FACES_MAX} au maximum.` }
  }

  const faces: FaceBat[] = []
  const textes: string[] = []
  const refusees: FaceRefusee[] = []

  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX) {
      refusees.push({ nom: fichier.name, raison: "fichier trop volumineux (15 Mo maximum)" })
      continue
    }
    try {
      const buffer = Buffer.from(await fichier.arrayBuffer())
      textes.push(await extractPdfText(buffer))
      faces.push({ nom: fichier.name, analyse: await analyserBat(buffer) })
    } catch {
      refusees.push({ nom: fichier.name, raison: "PDF illisible — export d'impression attendu" })
    }
  }

  if (faces.length === 0) {
    return { ok: false, error: "Aucune face lisible.", refusees }
  }

  const checks = [
    ...runTextRobot(textes.join("\n\n"), data.input),
    ...controlerBat(faces, { ...data.input, estDemeter: data.estDemeter, codePf: data.codePf }),
  ]

  return {
    ok: true,
    faces: faces.map((f) => f.nom),
    refusees,
    overallStatus: overallStatus(checks),
    counts: countByStatus(checks),
    checks,
  }
}
