/**
 * SPEC-01 — disposable demo page for the provenance system.
 * Remove once ProvenanceBadge / ChampTrace are wired into the Dossier Produit
 * tab (specs 02 & 03). Serves as the static "Storybook" for the 3 states.
 */
import type { Provenance } from "@/lib/provenance";
import { ProvenanceBadge } from "@/components/provenance/ProvenanceBadge";
import { ChampTrace } from "@/components/provenance/ChampTrace";

const STATES: { provenance: Provenance; source?: string }[] = [
  { provenance: "EXTRAIT", source: "Thé vert Sencha bio - Chine" },
  { provenance: "CALCULE" },
  { provenance: "VALIDE", source: "Validé le 05/06/2026" },
];

export default function ProvenanceDemoPage() {
  return (
    <div className="flex-1 space-y-10 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-emerald-50">
          Système de provenance
        </h2>
        <p className="mt-2 text-muted-foreground">
          Trois états : <strong>Word</strong> (à vérifier), <strong>IA</strong>{" "}
          (à valider), <strong>Validé</strong> (figé). Survolez un badge pour la
          source.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
          ProvenanceBadge — tailles sm / xs
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          {STATES.map(({ provenance, source }) => (
            <ProvenanceBadge
              key={`sm-${provenance}`}
              provenance={provenance}
              source={source}
              size="sm"
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {STATES.map(({ provenance, source }) => (
            <ProvenanceBadge
              key={`xs-${provenance}`}
              provenance={provenance}
              source={source}
              size="xs"
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
          ChampTrace — champ Dossier Produit
        </h3>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
          <ChampTrace
            label="Dénomination"
            provenance="EXTRAIT"
            source="Thé vert Sencha bio"
          >
            Thé vert Sencha bio
          </ChampTrace>
          <ChampTrace label="Poids net" provenance="CALCULE">
            100 g
          </ChampTrace>
          <ChampTrace
            label="Origine"
            provenance="VALIDE"
            source="Validé le 05/06/2026"
          >
            Chine — Zhejiang
          </ChampTrace>
        </div>
      </section>
    </div>
  );
}
