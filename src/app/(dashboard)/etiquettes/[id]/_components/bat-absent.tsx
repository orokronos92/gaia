import { FileQuestion, ImageOff, Printer } from "lucide-react"
import type { AbsenceBat } from "@/lib/conditionnement/absence-bat"

interface BatAbsentProps {
    absence: AbsenceBat
}

/**
 * Ce que la fiche montre quand le produit n'a pas de BAT — avec la raison,
 * pour qu'un vrac imprimé en interne ne passe pas pour un fichier perdu.
 */
export function BatAbsent({ absence }: BatAbsentProps) {
    const { Icone, titre, detail } =
        absence.type === "interne"
            ? { Icone: Printer, titre: "Étiquette imprimée en interne", detail: `Format « ${absence.format} » : aucun fichier du Graphisme n'est attendu.` }
            : absence.type === "manquant"
              ? { Icone: FileQuestion, titre: "Étiquette attendue, fichier absent", detail: `À demander au Graphisme : ${absence.references.join(", ")}.` }
              : { Icone: ImageOff, titre: "Aucun BAT associé à ce produit", detail: "La base ne donne aucune référence d'étiquette pour ce produit." }

    return (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 px-6 text-center">
            <Icone className="mb-2 h-8 w-8 text-stone-300" />
            <p className="text-sm font-medium text-stone-500">{titre}</p>
            <p className="mt-1 text-xs text-stone-400">{detail}</p>
        </div>
    )
}
