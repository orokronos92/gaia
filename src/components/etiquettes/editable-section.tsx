"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateFicheChampsAction } from "@/app/actions/fiche-champs";

/**
 * Per-card edit primitives (editable-fiche phase 2). A card keeps its own layout
 * and just composes these: `useEditableSection` drives the edit/save lifecycle,
 * <EditButtons/> renders Modifier / Enregistrer / Annuler, and <EditableText/>
 * shows the value (read) or an input (edit). Persistence goes through the
 * whitelisted Server Action — auth + Zod + audit log.
 */
export interface EditableSection {
  editing: boolean;
  saving: boolean;
  draft: Record<string, string>;
  start: () => void;
  cancel: () => void;
  setField: (key: string, value: string) => void;
  save: () => Promise<void>;
}

export function useEditableSection(opts: {
  ficheId: string;
  champs: Record<string, string | null>;
}): EditableSection {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const seed = (): Record<string, string> =>
    Object.fromEntries(Object.entries(opts.champs).map(([k, v]) => [k, v ?? ""]));
  const [draft, setDraft] = useState<Record<string, string>>(seed);

  const start = () => {
    setDraft(seed());
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const setField = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await updateFicheChampsAction({ ficheId: opts.ficheId, champs: draft });
      toast.success("Modifications enregistrées.");
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

  return { editing, saving, draft, start, cancel, setField, save };
}

export function EditButtons({
  section,
  className,
}: {
  section: EditableSection;
  className?: string;
}) {
  if (!section.editing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={section.start}
        className={cn("h-7 gap-1.5 rounded-lg text-stone-500 hover:text-emerald-700", className)}
      >
        <Pencil className="size-3.5" /> Modifier
      </Button>
    );
  }
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={section.cancel}
        disabled={section.saving}
        className="h-7 gap-1.5 rounded-lg text-stone-500 hover:text-red-600"
      >
        <X className="size-3.5" /> Annuler
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={section.save}
        disabled={section.saving}
        className="h-7 gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {section.saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        Enregistrer
      </Button>
    </div>
  );
}

export function EditableText({
  section,
  field,
  value,
  placeholder,
  multiline,
  className,
}: {
  section: EditableSection;
  field: string;
  value: string | null;
  /** Fallback shown when empty (read mode) and as the input placeholder. */
  placeholder?: string;
  multiline?: boolean;
  /** Applied to the read-mode element so the card keeps its look. */
  className?: string;
}) {
  if (section.editing) {
    const base =
      "w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300";
    return multiline ? (
      <textarea
        value={section.draft[field] ?? ""}
        onChange={(e) => section.setField(field, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn(base, "resize-y")}
      />
    ) : (
      <input
        type="text"
        value={section.draft[field] ?? ""}
        onChange={(e) => section.setField(field, e.target.value)}
        placeholder={placeholder}
        className={base}
      />
    );
  }

  const display = value && value.trim() !== "" ? value : placeholder;
  return <p className={className}>{display}</p>;
}
