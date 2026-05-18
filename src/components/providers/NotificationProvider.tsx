"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "AI";

export interface AppNotification {
    id: string;
    userId: string | null;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    link: string | null;
    creeLe: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        let eventSource: EventSource | null = null;

        // Fetch initial history
        const fetchHistory = async () => {
            try {
                const res = await fetch("/api/notifications");
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Failed to fetch notification history", error);
            }
        };

        fetchHistory();

        // Connect to SSE Stream
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.onmessage = (event) => {
            try {
                const newNotification: AppNotification = JSON.parse(event.data);

                setNotifications(prev => {
                    // Prevent duplicates
                    if (prev.some(n => n.id === newNotification.id)) return prev;
                    return [newNotification, ...prev];
                });

                // Trigger toast
                if (newNotification.type === "AI") {
                    toast.success("Intelligence Artificielle", {
                        description: newNotification.title,
                    });
                } else if (newNotification.type === "ERROR") {
                    toast.error(newNotification.title, {
                        description: newNotification.message,
                    });
                } else if (newNotification.type === "WARNING") {
                    toast.warning(newNotification.title, {
                        description: newNotification.message,
                    });
                } else {
                    toast(newNotification.title, {
                        description: newNotification.message,
                    });
                }

            } catch (e) {
                console.error("Error parsing SSE message", e);
            }
        };

        eventSource.onerror = (error) => {
            console.error("SSE Connection Error", error);
            // Browser will automatically attempt to reconnect
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [id] })
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (error) {
            console.error("Failed to mark all notifications as read", error);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
};
