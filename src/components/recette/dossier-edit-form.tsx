"use client";

import { cn } from "@/lib/utils";

function ChampInput({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
    </div>
  );
}

const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const titre = "text-[10px] font-bold uppercase tracking-widest text-stone-400";

/**
 * Edit form for the "Données complémentaires" card (editable-fiche étape 2):
 * mixed produit + fiche + dégustation fields, plus the special types
 * (estAromatise toggle, labelsClient as a comma list).
 */
export function DossierEditForm({
  draft,
  setField,
}: {
  draft: Record<string, string>;
  setField: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className={titre}>Identité</h4>
        <div className={grid}>
          <ChampInput label="FLO ID" value={draft.floId} onChange={(v) => setField("floId", v)} />
          <ChampInput label="Nom latin" value={draft.nomLatin} onChange={(v) => setField("nomLatin", v)} />
          <ChampInput label="Date mise en marché" value={draft.dateMiseMarche} onChange={(v) => setField("dateMiseMarche", v)} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className={titre}>Certification & labels</h4>
        <div className={grid}>
          <ChampInput label="Labels client (séparés par des virgules)" value={draft.labelsClient} onChange={(v) => setField("labelsClient", v)} placeholder="AB, WFTO" className="sm:col-span-2" />
          <ChampInput label="Organisme certificateur" value={draft.organismeCertificateur} onChange={(v) => setField("organismeCertificateur", v)} />
          <div className="space-y-1">
            <label className={`block ${titre}`}>Aromatisé / parfumé</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setField("estAromatise", "true")}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  draft.estAromatise === "true"
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                    : "border-stone-200 text-stone-500"
                )}
              >
                Aromatisé
              </button>
              <button
                type="button"
                onClick={() => setField("estAromatise", "false")}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  draft.estAromatise !== "true"
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                    : "border-stone-200 text-stone-500"
                )}
              >
                Nature
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className={titre}>Sourcing</h4>
        <div className={grid}>
          <ChampInput label="Fournisseur" value={draft.fournisseur} onChange={(v) => setField("fournisseur", v)} />
          <ChampInput label="Numéro de lot" value={draft.numeroDeLot} onChange={(v) => setField("numeroDeLot", v)} />
          <ChampInput label="Jardin" value={draft.producteurJardin} onChange={(v) => setField("producteurJardin", v)} />
          <ChampInput label="Producteur" value={draft.infoProducteur} onChange={(v) => setField("infoProducteur", v)} />
          <ChampInput label="Type producteur" value={draft.typeProducteur} onChange={(v) => setField("typeProducteur", v)} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className={titre}>Allégations</h4>
        <div className={grid}>
          <ChampInput label="Allégation choisie" value={draft.allegationChoisie} onChange={(v) => setField("allegationChoisie", v)} />
          <ChampInput label="Nb tasses (allégation)" value={draft.nbTassesAllegation} onChange={(v) => setField("nbTassesAllegation", v)} />
        </div>
      </div>
    </div>
  );
}

export default DossierEditForm;
