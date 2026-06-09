"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Clock,
  GitCompare,
  Bot,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { restaurerVersionAction, auditerVersionAction } from "@/app/actions/etiquettes";
import { VersionDiff } from "@/components/etiquettes/version-diff";
import {
  VersionAuditResult,
  type AuditResultat,
} from "@/components/etiquettes/version-audit-result";

interface VersionItem {
  id: string;
  numeroVersion: number;
  creeLe: string | Date;
  statut: string;
  resumeChangements: string | null;
  auteur: string | null;
  donneesSnapshot: unknown;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function Champ({ label, value }: { label: string; value: unknown }) {
  const v = typeof value === "string" && value.trim() !== "" ? value : "—";
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
        {label}
      </span>
      <span className="text-sm text-stone-700">{v}</span>
    </div>
  );
}

export function VersionsHistorique({ versions }: { versions: VersionItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [auditing, setAuditing] = useState<string | null>(null);
  const [audits, setAudits] = useState<Record<string, AuditResultat>>({});

  const auditer = async (versionId: string, num: number) => {
    setAuditing(versionId);
    try {
      const res = (await auditerVersionAction({ versionId })) as AuditResultat;
      setAudits((a) => ({ ...a, [versionId]: res }));
      if (res.ok) {
        toast.success(`Audit V${num} : ${res.overallStatus}`);
      } else {
        toast.error("Audit indisponible", { description: res.error });
      }
    } catch (e) {
      toast.error("Échec de l'audit", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setAuditing(null);
    }
  };

  // Toggle a version into the comparison (keep the last 2 picked).
  const toggleCompare = (id: string) =>
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)
    );

  const [vgId, vdId] = compare;
  const vg = versions.find((v) => v.id === vgId);
  const vd = versions.find((v) => v.id === vdId);

  const restaurer = async (versionId: string, num: number) => {
    if (
      !window.confirm(
        `Restaurer la version ${num} ?\n\nLe contenu actuel de l'étiquette sera remplacé par celui de cette version. Pense à « Sauvegarder » l'état actuel d'abord si tu veux le garder.`
      )
    ) {
      return;
    }
    setRestoring(versionId);
    try {
      await restaurerVersionAction({ versionId });
      toast.success(`Version ${num} restaurée`, {
        description: "Le contenu de l'étiquette a été remis dans cet état.",
      });
      router.refresh();
    } catch (e) {
      toast.error("Échec de la restauration", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRestoring(null);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white/50 px-6 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
          <History className="size-7" aria-hidden />
        </div>
        <h3 className="text-lg font-light tracking-tight text-emerald-950">
          Aucune version archivée
        </h3>
        <p className="mt-1 max-w-sm text-sm text-stone-500">
          Clique sur « Sauvegarder » en haut de la fiche pour figer l'état actuel
          comme une version (historique, comparaison, retour arrière).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {compare.length === 1 && (
        <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-2 text-sm text-emerald-700">
          Sélectionne une 2ᵉ version (« Comparer ») pour voir les différences.
        </p>
      )}
      {vg && vd && <VersionDiff a={vg} b={vd} />}

      {versions.map((v, i) => {
        const snap = (v.donneesSnapshot ?? {}) as {
          fiche?: Record<string, unknown>;
          produit?: Record<string, unknown>;
        };
        const fiche = snap.fiche ?? {};
        const produit = snap.produit ?? {};
        const isOpen = open === v.id;
        const courante = i === 0;

        return (
          <div
            key={v.id}
            className={cn(
              "rounded-2xl border bg-white/80 shadow-sm",
              courante ? "border-emerald-300" : "border-stone-200"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
                  V{v.numeroVersion}
                </Badge>
                {courante && (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px]">
                    plus récente
                  </Badge>
                )}
                <div>
                  <div className="font-semibold text-stone-800">
                    {(produit.denominationFr as string) || "—"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {dateFmt.format(new Date(v.creeLe))}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="size-3" /> {v.auteur || "—"}
                    </span>
                    <span>statut : {v.statut}</span>
                  </div>
                  {v.resumeChangements && (
                    <div className="mt-1 text-xs italic text-stone-500">
                      « {v.resumeChangements} »
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={compare.includes(v.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCompare(v.id)}
                  className={cn(
                    "gap-1.5",
                    compare.includes(v.id)
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-stone-200 text-stone-600"
                  )}
                >
                  <GitCompare className="size-4" />
                  Comparer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(isOpen ? null : v.id)}
                  className="gap-1.5 text-stone-500"
                >
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  Voir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => auditer(v.id, v.numeroVersion)}
                  disabled={!!auditing}
                  title="Ré-auditer cette version avec les règles actuelles"
                  className="gap-1.5 border-stone-200 text-stone-700 hover:text-emerald-700"
                >
                  {auditing === v.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                  Auditer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => restaurer(v.id, v.numeroVersion)}
                  disabled={!!restoring}
                  className="gap-1.5 border-stone-200 text-stone-700 hover:text-emerald-700"
                >
                  {restoring === v.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Restaurer
                </Button>
              </div>
            </div>

            {isOpen && (
              <div className="grid gap-2 border-t border-stone-100 bg-stone-50/50 p-4">
                <Champ label="Type de thé" value={produit.typeTheFr} />
                <Champ label="Origine" value={produit.origine} />
                <Champ label="Ingrédients (FR)" value={fiche.ingredientsFr} />
                <Champ label="Allégation choisie" value={fiche.allegationChoisie} />
                <Champ label="Allergènes" value={fiche.allergenes} />
                <Champ label="Texte commercial" value={fiche.texteCommercialFr} />
                <Champ label="Conservation" value={fiche.mentionConservation} />
                <Champ label="Fabricant" value={fiche.mentionFabricant} />
              </div>
            )}

            {audits[v.id] && <VersionAuditResult resultat={audits[v.id]} />}
          </div>
        );
      })}
    </div>
  );
}

export default VersionsHistorique;
