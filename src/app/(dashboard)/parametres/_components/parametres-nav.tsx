"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings2, Shield, Bell, Database, Users, Gauge } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Settings navigation. The panels that are not built yet are rendered as
 * explicitly disabled rather than as clickable buttons that do nothing — a dead
 * click reads as a bug, a greyed item reads as a roadmap.
 */
const ITEMS = [
    { href: "/parametres", label: "Général", icon: Settings2, actif: true },
    { href: "/parametres/consommation", label: "Consommation IA", icon: Gauge, actif: true },
    { href: "#", label: "Règles Qualité (PRO-QHS)", icon: Shield, actif: false },
    { href: "#", label: "Équipe & Rôles", icon: Users, actif: false },
    { href: "#", label: "Agents IA & Intégrations", icon: Database, actif: false },
    { href: "#", label: "Notifications", icon: Bell, actif: false },
] as const

export function ParametresNav() {
    const pathname = usePathname()

    return (
        <nav className="col-span-1 space-y-2">
            {ITEMS.map((item) => {
                const Icone = item.icon

                if (!item.actif) {
                    return (
                        <div
                            key={item.label}
                            aria-disabled="true"
                            title="Bientôt disponible"
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-stone-400 font-medium cursor-not-allowed select-none"
                        >
                            <Icone className="h-5 w-5 text-stone-300" />
                            <span className="flex-1 text-left">{item.label}</span>
                            <span className="text-[10px] uppercase tracking-wider text-stone-400 border border-stone-200 rounded-md px-1.5 py-0.5">
                                à venir
                            </span>
                        </div>
                    )
                }

                const courant = pathname === item.href

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl font-medium transition-all",
                            courant
                                ? "bg-emerald-50 text-emerald-900 border border-emerald-100/50 shadow-sm"
                                : "text-stone-600 hover:bg-white/60 hover:text-emerald-800"
                        )}
                    >
                        <Icone className={cn("h-5 w-5", courant ? "text-emerald-700" : "text-stone-400")} />
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
