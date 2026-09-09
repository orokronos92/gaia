"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, CircleUser, Menu, Check, FileText, BrainCircuit, AlertTriangle, Info } from "lucide-react"
import { signOut } from "next-auth/react"
import { useNotifications } from "@/components/providers/NotificationProvider"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Header() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const router = useRouter();

    const getIcon = (type: string) => {
        switch (type) {
            case "AI": return <BrainCircuit className="h-4 w-4 text-purple-500" />;
            case "SUCCESS": return <Check className="h-4 w-4 text-emerald-500" />;
            case "WARNING": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case "ERROR": return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const handleNotificationClick = (id: string, link: string | null) => {
        markAsRead(id);
        if (link) router.push(link);
    };

    /*
     * Le header est collant sur TOUS les écrans. Il l'était déjà sur mobile et
     * repassait en `static` au-delà de 640 px : les notifications disparaissaient
     * dès qu'on descendait dans une fiche. Le fond opaque va avec — transparent,
     * le contenu défilerait visiblement dessous. Le fond est OPAQUE et non
     * translucide : deux couches à 85 % empilées au raccord laissaient
     * transparaître le contenu qui défile dessous, et ce scintillement se lit
     * comme un saut.
     *
     * Sa hauteur est FIXE — `h-16`, bordure comprise — et non `h-auto` : ce qui
     * se colle en dessous doit connaître ce nombre. En `h-auto` il valait 65 px
     * sur grand écran, l'ancrage suivant était calé à 60, et les 5 px d'écart
     * laissaient voir le contenu défiler dans la fente.
     */
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-stone-200/60 bg-stone-50 px-4 sm:px-8 dark:border-stone-800 dark:bg-stone-900">
            <Button size="icon" variant="outline" className="sm:hidden bg-white/50 backdrop-blur-md">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
            </Button>

            {/* Notification Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline" className="relative ml-auto h-10 w-10 rounded-full bg-white/60 backdrop-blur-md border-stone-200/50 shadow-sm hover:bg-white">
                        <Bell className="h-4 w-4 text-stone-600" />
                        {unreadCount > 0 && (
                            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-sm shadow-orange-500/50">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                        <span className="sr-only">Notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-xl bg-white/95 backdrop-blur-xl border-stone-200/50 p-0 overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                        <DropdownMenuLabel className="font-semibold text-emerald-950 p-0">Notifications</DropdownMenuLabel>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>

                    <ScrollArea className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm text-stone-500 flex flex-col items-center gap-2">
                                <Bell className="h-8 w-8 text-stone-200" />
                                Aucune notification
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.slice(0, 10).map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif.id, notif.link)}
                                        className={`p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer flex gap-3 items-start ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}
                                    >
                                        <div className="mt-0.5 bg-white p-1.5 rounded-full shadow-sm border border-stone-100">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm tracking-tight mb-0.5 ${!notif.isRead ? 'font-semibold text-emerald-950' : 'font-medium text-stone-700'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-stone-500 line-clamp-2">{notif.message}</p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-2 border-t border-stone-100 bg-stone-50/50">
                        <Button variant="ghost" className="w-full text-sm h-8 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => router.push('/notifications')}>
                            Voir toutes les notifications
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white/60 backdrop-blur-md border-stone-200/50 shadow-sm hover:bg-white">
                        <CircleUser className="h-5 w-5 text-emerald-800" />
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl bg-white/90 backdrop-blur-xl border-stone-200/50">
                    <DropdownMenuLabel className="font-semibold text-emerald-950">Mon Compte</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-stone-200/50" />
                    <DropdownMenuItem className="cursor-pointer">Profil Utilisateur</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Centre de support</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-stone-200/50" />
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="cursor-pointer text-red-600 focus:text-red-700">Se déconnecter</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
