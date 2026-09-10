"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, Layers, Sprout } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Ce qui n'est pas encore construit est grisé plutôt que cliquable : un clic
 * mort se lit comme une panne, un élément grisé se lit comme une suite.
 */
const ITEMS = [
  { href: "/referentiels/gammes", label: "Gammes & sous-gammes", icon: Layers, actif: true },
  { href: "/parametres/matieres", label: "Matières premières", icon: Sprout, actif: true },
  { href: "#", label: "Opérations caritatives", icon: HeartHandshake, actif: false },
] as const;

export function ReferentielsNav() {
  const pathname = usePathname();

  return (
    <nav className="col-span-1 space-y-2">
      {ITEMS.map((item) => {
        const Icone = item.icon;

        if (!item.actif) {
          return (
            <div
              key={item.label}
              aria-disabled="true"
              title="Bientôt disponible"
              className="flex w-full cursor-not-allowed select-none items-center gap-3 rounded-xl px-4 py-3 font-medium text-stone-400"
            >
              <Icone className="h-5 w-5 text-stone-300" />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-stone-400">
                à venir
              </span>
            </div>
          );
        }

        const courant = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors",
              courant
                ? "bg-emerald-50 text-emerald-800"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            )}
          >
            <Icone className={cn("h-5 w-5", courant ? "text-emerald-600" : "text-stone-400")} />
            <span className="flex-1 text-left">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
