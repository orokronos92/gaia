import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getMatieresPremieres } from "@/db/queries/matieres-premieres"

import { LigneMatiere } from "./_components/ligne-matiere"

/**
 * The raw-material reference — the join that is missing everywhere else.
 *
 * The recipe says "TN592 SORWATHE OP1", the label says "Thé noir*". Nothing
 * linked the two, which is why the audit's ingredient check fails on every
 * product, why a substitution cannot be judged, and why the organic asterisks
 * cannot be generated. The table fills itself as recipes are imported; the legal
 * name is answered once per material, here.
 */
export default async function MatieresPage() {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const matieres = await getMatieresPremieres()
    const aQualifier = matieres.filter((m) => !m.denominationLegale).length

    return (
        <>
            <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-8">
                <h2 className="text-xl font-medium text-emerald-950 mb-1">Matières premières</h2>
                <p className="text-sm text-stone-500">
                    La fiche recette nomme les matières comme la R&amp;D les connaît. L&apos;étiquette
                    doit porter leur dénomination légale. C&apos;est la seule chose qu&apos;aucun
                    document ne dit — elle se renseigne une fois par matière.
                </p>

                {matieres.length > 0 && (
                    <p className="text-sm text-stone-600 mt-4">
                        {matieres.length} matière{matieres.length > 1 ? "s" : ""} connue
                        {matieres.length > 1 ? "s" : ""}
                        {aQualifier > 0 && (
                            <>
                                {" · "}
                                <span className="text-amber-700 font-medium">
                                    {aQualifier} à qualifier
                                </span>
                            </>
                        )}
                    </p>
                )}
            </div>

            {matieres.length === 0 ? (
                <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-12 text-center">
                    <p className="text-stone-600 font-medium">Aucune matière première enregistrée</p>
                    <p className="text-sm text-stone-400 mt-2 max-w-md mx-auto">
                        La liste se remplit automatiquement à chaque import de fiche recette, à partir
                        de la colonne « CODE ARTICLE ».
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {matieres.map((m) => (
                        <LigneMatiere key={m.id} matiere={m} />
                    ))}
                </div>
            )}
        </>
    )
}
