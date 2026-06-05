import { Layers } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChampTrace } from "@/components/provenance/ChampTrace";
import { ArbitrerBadge } from "@/components/provenance/ArbitrerBadge";

export interface DossierComplementaireProps {
  floId?: string | null;
  nomLatin?: string | null;
  dateMiseMarche?: string | null;
  labelsClient?: string[] | null;
  organismeCertificateur?: string | null;
  estAromatise?: boolean | null;
  fournisseur?: string | null;
  producteurJardin?: string | null;
  infoProducteur?: string | null;
  typeProducteur?: string | null;
  numeroDeLot?: string | null;
  allegationChoisie?: string | null;
  nbTassesAllegation?: string | null;
}

const hasVal = (v: string | null | undefined) =>
  !!v && !["/", "n/a", "néant", "-"].includes(v.trim().toLowerCase());

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {titre}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Additive Dossier block (SPEC-03 §6): surfaces fields not already shown on the
 * page, each traced via <ChampTrace>, plus the two business decisions left for
 * Marie to settle (marked <ArbitrerBadge>, distinct from the 3 provenances).
 */
export function DossierComplementaire(props: DossierComplementaireProps) {
  const labels = (props.labelsClient ?? []).filter(Boolean);
  const jardinsVsProducteur =
    hasVal(props.producteurJardin) && hasVal(props.infoProducteur);

  return (
    <Card className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white/80 shadow-sm backdrop-blur-xl">
      <CardHeader className="border-b border-stone-100 bg-stone-500/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-light tracking-tight text-emerald-950">
          <Badge
            variant="outline"
            className="flex size-7 items-center justify-center rounded-lg border-none bg-stone-100 p-1"
          >
            <Layers className="size-4 text-stone-600" />
          </Badge>
          Données complémentaires & arbitrages
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        <Bloc titre="Identité">
          {hasVal(props.floId) && (
            <ChampTrace label="FLO ID" provenance="EXTRAIT" source={props.floId!}>
              {props.floId}
            </ChampTrace>
          )}
          {hasVal(props.nomLatin) && (
            <ChampTrace label="Nom latin" provenance="EXTRAIT" source={props.nomLatin!}>
              <span className="italic">{props.nomLatin}</span>
            </ChampTrace>
          )}
          {hasVal(props.dateMiseMarche) && (
            <ChampTrace label="Date mise en marché" provenance="EXTRAIT">
              {props.dateMiseMarche}
            </ChampTrace>
          )}
        </Bloc>

        <Bloc titre="Certification & labels">
          {labels.length > 0 && (
            <ChampTrace label="Labels client" provenance="EXTRAIT">
              {labels.join(", ")}
            </ChampTrace>
          )}
          {hasVal(props.organismeCertificateur) && (
            <ChampTrace label="Organisme certificateur" provenance="EXTRAIT">
              {props.organismeCertificateur}
            </ChampTrace>
          )}
          <ChampTrace label="Aromatisé / parfumé" provenance="EXTRAIT">
            <div className="flex items-center gap-2">
              <span>{props.estAromatise ? "Aromatisé" : "Nature"}</span>
              <ArbitrerBadge label="distinction à confirmer" />
            </div>
          </ChampTrace>
        </Bloc>

        <Bloc titre="Sourcing">
          {hasVal(props.fournisseur) && (
            <ChampTrace label="Fournisseur" provenance="EXTRAIT">
              {props.fournisseur}
            </ChampTrace>
          )}
          {hasVal(props.numeroDeLot) && (
            <ChampTrace label="Numéro de lot" provenance="EXTRAIT">
              {props.numeroDeLot}
            </ChampTrace>
          )}
          {(hasVal(props.producteurJardin) || hasVal(props.infoProducteur)) && (
            <ChampTrace
              label="Jardins / Producteur"
              provenance="EXTRAIT"
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {hasVal(props.producteurJardin) && (
                  <span>
                    <span className="text-stone-400">Jardin :</span>{" "}
                    {props.producteurJardin}
                  </span>
                )}
                {hasVal(props.infoProducteur) && (
                  <span>
                    <span className="text-stone-400">Producteur :</span>{" "}
                    {props.infoProducteur}
                    {hasVal(props.typeProducteur) && ` (${props.typeProducteur})`}
                  </span>
                )}
                <ArbitrerBadge
                  label={jardinsVsProducteur ? "une ou deux entités ?" : "à réconcilier"}
                />
              </div>
            </ChampTrace>
          )}
        </Bloc>

        {(hasVal(props.allegationChoisie) || hasVal(props.nbTassesAllegation)) && (
          <Bloc titre="Allégations">
            {hasVal(props.allegationChoisie) && (
              <ChampTrace label="Allégation choisie" provenance="EXTRAIT">
                {props.allegationChoisie}
              </ChampTrace>
            )}
            {hasVal(props.nbTassesAllegation) && (
              <ChampTrace label="Nb tasses (allégation)" provenance="EXTRAIT">
                {props.nbTassesAllegation}
              </ChampTrace>
            )}
          </Bloc>
        )}
      </CardContent>
    </Card>
  );
}

export default DossierComplementaire;
