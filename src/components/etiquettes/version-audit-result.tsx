"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface AuditCtrl {
  typeControle: string;
  statut: string;
  justification?: string;
  suggestionIa?: string;
}

export type AuditResultat =
  | { ok: true; overallStatus: string; controls: AuditCtrl[] }
  | { ok: false; error?: string };

/** Inline result of re-auditing a version against today's rules (versioning). */
export function VersionAuditResult({ resultat }: { resultat: AuditResultat }) {
  if (!resultat.ok) {
    return (
      <div className="border-t border-stone-100 p-4">
        <p className="text-sm text-amber-700">
          Audit IA indisponible{resultat.error ? ` : ${resultat.error}` : ""}.
        </p>
      </div>
    );
  }

  const conforme = resultat.overallStatus === "PASS";
  return (
    <div className="border-t border-stone-100 p-4">
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-bold",
          conforme ? "text-emerald-700" : "text-orange-700"
        )}
      >
        {conforme ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <AlertTriangle className="size-4" />
        )}
        Ré-audit (règles actuelles) : {conforme ? "Conforme" : "Attention requise"}
      </div>
      <div className="mt-2 space-y-1.5">
        {resultat.controls.map((c, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px] font-bold",
                c.statut === "PASS"
                  ? "border-emerald-200 text-emerald-700"
                  : c.statut === "FAIL"
                    ? "border-red-200 text-red-700"
                    : "border-orange-200 text-orange-700"
              )}
            >
              {c.statut}
            </Badge>
            <div className="text-stone-700">
              <span className="font-semibold">{c.typeControle}</span>
              {c.justification ? ` — ${c.justification}` : ""}
              {c.suggestionIa ? (
                <span className="text-stone-500"> → {c.suggestionIa}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VersionAuditResult;
