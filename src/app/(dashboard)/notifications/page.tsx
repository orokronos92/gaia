"use client";

import { useNotifications } from "@/components/providers/NotificationProvider"
import { Button } from "@/components/ui/button"
import { Check, BrainCircuit, AlertTriangle, Info, BellRing, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NotificationsPage() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const router = useRouter();

    const getIcon = (type: string) => {
        switch (type) {
            case "AI": return <BrainCircuit className="h-5 w-5 text-purple-600" />;
            case "SUCCESS": return <Check className="h-5 w-5 text-emerald-600" />;
            case "WARNING": return <AlertTriangle className="h-5 w-5 text-orange-600" />;
            case "ERROR": return <AlertTriangle className="h-5 w-5 text-red-600" />;
            default: return <Info className="h-5 w-5 text-blue-600" />;
        }
    };

    const handleNotificationClick = (id: string, link: string | null) => {
        markAsRead(id);
        if (link) router.push(link);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50 flex items-center gap-3">
                        <BellRing className="h-8 w-8 text-emerald-700" />
                        Centre de Notifications
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mt-1">
                        Consultez l'historique de vos alertes et activités IA
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button onClick={markAllAsRead} variant="outline" className="gap-2 bg-white/60 backdrop-blur-md shadow-sm border-stone-200/50 rounded-full text-emerald-700 hover:text-emerald-800">
                        <Check className="h-4 w-4" />
                        Tout marquer comme lu
                    </Button>
                )}
            </div>

            <div className="w-full max-w-4xl mx-auto mt-8">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white/50 backdrop-blur-xl rounded-3xl border border-stone-200/50 shadow-xl shadow-stone-200/20 text-center">
                        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                            <BellRing className="h-10 w-10 text-stone-300" />
                        </div>
                        <h3 className="text-xl font-medium text-stone-800 mb-2">Aucune notification</h3>
                        <p className="text-stone-500">Vous êtes à jour ! Toutes vos alertes apparaîtront ici.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.id, notif.link)}
                                className={`group flex items-start gap-4 p-5 md:p-6 rounded-2xl border transition-all cursor-pointer shadow-sm
                                    ${!notif.isRead
                                        ? 'bg-white border-emerald-200/60 shadow-emerald-900/5 hover:border-emerald-300/80 hover:shadow-md'
                                        : 'bg-white/60 backdrop-blur-sm border-stone-200/50 hover:bg-white/90 hover:shadow-md opacity-80 hover:opacity-100'
                                    }
                                `}
                            >
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm mt-0.5
                                    ${notif.type === 'AI' ? 'bg-purple-100' : 'bg-emerald-50'}
                                `}>
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1 text-xs text-stone-500 font-medium">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider
                                            ${notif.type === 'AI' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}
                                        `}>
                                            {notif.type}
                                        </span>
                                        <span>{new Date(notif.creeLe).toLocaleString('fr-FR', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}</span>
                                    </div>
                                    <h4 className={`text-base md:text-lg tracking-tight mb-1.5 ${!notif.isRead ? 'font-semibold text-emerald-950' : 'font-medium text-stone-800'}`}>
                                        {notif.title}
                                    </h4>
                                    <p className="text-sm text-stone-600 leading-relaxed md:w-5/6">
                                        {notif.message}
                                    </p>
                                </div>
                                {notif.link && (
                                    <div className="flex-shrink-0 self-center hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-stone-50 text-stone-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                                {!notif.isRead && (
                                    <div className="flex-shrink-0 w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 mt-2" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
