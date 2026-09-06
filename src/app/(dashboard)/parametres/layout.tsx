import type { ReactNode } from "react"

import { ParametresNav } from "./_components/parametres-nav"

export default function ParametresLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 max-w-5xl">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                    Paramètres du portail
                </h1>
                <p className="text-sm text-stone-500 font-medium">
                    Configuration générale, règles métier et gestion des accès
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <ParametresNav />
                <div className="col-span-1 md:col-span-2 space-y-6">{children}</div>
            </div>
        </div>
    )
}
