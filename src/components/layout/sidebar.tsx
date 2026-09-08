"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Tags,
    ClipboardList,
    PackageSearch,
    Settings,
    Leaf,
    Bell,
    Brain,
    Archive,
    PenTool
} from "lucide-react"

const navItems = [
    { href: "/", label: "Aperçu", icon: LayoutDashboard },
    { href: "/produits", label: "Produits", icon: PackageSearch },
    { href: "/etiquettes", label: "Étiquettes", icon: Tags },
    { href: "/commandes", label: "Commandes", icon: ClipboardList },
    { href: "/connaissances", label: "Connaissances", icon: Brain },
    // Emplacement provisoire : le graphisme aura son propre espace, mais
    // l'auto-contrôle n'a d'intérêt que s'il est utilisable tout de suite.
    { href: "/controle-graphisme", label: "Contrôle graphisme", icon: PenTool },
    { href: "/archives", label: "Archives", icon: Archive },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/parametres", label: "Paramètres", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-stone-200/50 bg-white/60 backdrop-blur-xl sm:flex dark:bg-stone-950/60 dark:border-stone-800/50">
            <div className="flex h-14 items-center border-b border-stone-200/50 px-4 lg:h-[72px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm shadow-emerald-700/20">
                        <Leaf className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-2xl tracking-tighter text-emerald-950 font-bold dark:text-emerald-400 drop-shadow-sm">Gaïa<span className="font-light">Label</span></span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-6">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}`))
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-900 border border-emerald-100/50 shadow-sm dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-800/50"
                                        : "text-stone-500 hover:text-emerald-800 hover:bg-stone-100/50 dark:text-stone-400 dark:hover:text-emerald-300 dark:hover:bg-stone-800/50"
                                )}
                            >
                                <Icon className={cn("h-4.5 w-4.5", isActive ? "text-emerald-700 dark:text-emerald-400" : "")} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </aside>
    )
}
