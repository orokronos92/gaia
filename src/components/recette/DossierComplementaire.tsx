"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Pencil, Check, X, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChampTrace } from "@/components/provenance/ChampTrace";
import { ArbitrerBadge } from "@/components/provenance/ArbitrerBadge";
import { EmptyState } from "@/components/atoms/empty-state";
import { DossierEditForm } from "@/components/recette/dossier-edit-form";
import { updateDossierAction } from "@/app/actions/fiche-champs";

export interface DossierComplementaireProps {
  ficheId: string;
  produitId: string;
  degustationId?: string | null;
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

function Bloc({
  titre,
  vide,
  messageVide,
  children,
}: {
  titre: string;
  vide?: boolean;
  messageVide?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {titre}
      </h4>
      {vide ? (
        <EmptyState label={messageVide ?? "Non renseigné."} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
      )}
    </div>
  );
}

/**
 * "Données complémentaires & arbitrages" (SPEC-03 §6) — now editable per card
 * (editable-fiche étape 2). Read mode keeps the traced display; edit mode shows
 * a mixed form (produit + fiche + dégustation) saved via updateDossierAction.
 */
export function DossierComplementaire(props: DossierComplementaireProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const seed = (): Record<string, string> => ({
    floId: props.floId ?? "",
    nomLatin: props.nomLatin ?? "",
    dateMiseMarche: props.dateMiseMarche ?? "",
    organismeCertificateur: props.organismeCertificateur ?? "",
    fournisseur: props.fournisseur ?? "",
    producteurJardin: props.producteurJardin ?? "",
    infoProducteur: props.infoProducteur ?? "",
    typeProducteur: props.typeProducteur ?? "",
    allegationChoisie: props.allegationChoisie ?? "",
    nbTassesAllegation: props.nbTassesAllegation ?? "",
    numeroDeLot: props.numeroDeLot ?? "",
    labelsClient: (props.labelsClient ?? []).filter(Boolean).join(", "),
    estAromatise: props.estAromatise ? "true" : "false",
  });
  const [draft, setDraft] = useState<Record<string, string>>(seed);
  const setField = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const start = () => {
    setDraft(seed());
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      await updateDossierAction({
        ficheId: props.ficheId,
        produitId: props.produitId,
        degustationId: props.degustationId ?? null,
        champs: draft,
      });
      toast.success("Données complémentaires enregistrées.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error("Échec de l'enregistrement", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const labels = (props.labelsClient ?? []).filter(Boolean);
  const jardinsVsProducteur =
    hasVal(props.producteurJardin) && hasVal(props.infoProducteur);
  const hasIdentite =
    hasVal(props.floId) || hasVal(props.nomLatin) || hasVal(props.dateMiseMarche);
  const hasSourcing =
    hasVal(props.fournisseur) ||
    hasVal(props.numeroDeLot) ||
    hasVal(props.producteurJardin) ||
    hasVal(props.infoProducteur);
  const hasAllegations =
    hasVal(props.allegationChoisie) || hasVal(props.nbTassesAllegation);

  return (
    <Card className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white/80 shadow-sm backdrop-blur-xl">
      <CardHeader className="border-b border-stone-100 bg-stone-500/5 pb-4">
        <CardTitle className="flex items-center justify-between gap-2 text-lg font-light tracking-tight text-emerald-950">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="flex size-7 items-center justify-center rounded-lg border-none bg-stone-100 p-1"
            >
              <Layers className="size-4 text-stone-600" />
            </Badge>
            Données complémentaires & arbitrages
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving} className="h-7 gap-1.5 rounded-lg text-stone-500 hover:text-red-600">
                <X className="size-3.5" /> Annuler
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving} className="h-7 gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Enregistrer
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={start} className="h-7 gap-1.5 rounded-lg text-stone-500 hover:text-emerald-700">
              <Pencil className="size-3.5" /> Modifier
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        {editing ? (
          <DossierEditForm draft={draft} setField={setField} />
        ) : (
          <>
            <Bloc titre="Identité" vide={!hasIdentite} messageVide="Identité non renseignée.">
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

            <Bloc titre="Sourcing" vide={!hasSourcing} messageVide="Sourcing non renseigné.">
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
                <ChampTrace label="Jardins / Producteur" provenance="EXTRAIT" className="sm:col-span-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {hasVal(props.producteurJardin) && (
                      <span>
                        <span className="text-stone-400">Jardin :</span> {props.producteurJardin}
                      </span>
                    )}
                    {hasVal(props.infoProducteur) && (
                      <span>
                        <span className="text-stone-400">Producteur :</span> {props.infoProducteur}
                        {hasVal(props.typeProducteur) && ` (${props.typeProducteur})`}
                      </span>
                    )}
                    <ArbitrerBadge label={jardinsVsProducteur ? "une ou deux entités ?" : "à réconcilier"} />
                  </div>
                </ChampTrace>
              )}
            </Bloc>

            <Bloc titre="Allégations" vide={!hasAllegations} messageVide="Aucune allégation choisie pour ce produit.">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DossierComplementaire;
