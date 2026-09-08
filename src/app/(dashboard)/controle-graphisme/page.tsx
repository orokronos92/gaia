import { listerFichesPourControle } from "@/db/queries/fiches"
import { ControleGraphismeClient } from "./_components/controle-graphisme-client"

/**
 * Contrôle graphisme — l'auto-contrôle d'un BAT avant envoi à la Qualité.
 *
 * Emplacement provisoire : Fabrice aura son propre espace. En attendant, l'écran
 * vit dans le menu principal pour être utilisable dès maintenant, ce qui est le
 * seul intérêt d'un outil d'auto-contrôle.
 */
export default async function ControleGraphismePage() {
  const fiches = await listerFichesPourControle()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Contrôle graphisme
        </h1>
        <p className="text-sm text-stone-500">
          Vérifiez un BAT avant de l&apos;envoyer à la Qualité. Mesure directe du PDF —
          aucune IA appelée, aucun fichier conservé.
        </p>
      </header>

      <ControleGraphismeClient fiches={fiches} />
    </div>
  )
}
