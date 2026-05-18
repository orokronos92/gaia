"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: { documentName: string }[];
}

export function AIChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            role: "assistant",
            content: "Bonjour Marie ! Je suis votre assistante IA experte en réglementation. Comment puis-je vous aider aujourd'hui ?"
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");

        // Add user message to UI
        const newMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: userMsg };
        setMessages(prev => [...prev, newMsg]);
        setIsLoading(true);

        try {
            // Call API
            const response = await fetch("/api/agents/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: userMsg,
                    conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: data.data.response,
                    sources: data.data.sourcesUsed
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "❌ Désolé, je rencontre un problème de connexion avec le Cerveau IA."
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "❌ Une erreur inattendue s'est produite."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[380px] h-[550px] mb-4 flex flex-col shadow-2xl border-emerald-500/30 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <CardHeader className="p-4 bg-emerald-950 text-emerald-50 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Sparkles size={48} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-500/20 rounded-full">
                                    <Bot className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold text-white">Assistante Gaïa</CardTitle>
                                    <p className="text-xs text-emerald-200/70 m-0">Connectée au Référentiel Qualité</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-100 hover:bg-emerald-800 hover:text-white" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-stone-50/50 dark:bg-stone-900/50">
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                                    <div className={cn("flex-shrink-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full", msg.role === "user" ? "bg-stone-200 dark:bg-stone-700" : "bg-emerald-100 dark:bg-emerald-900/50")}>
                                        {msg.role === "user" ? <User className="h-4 w-4 text-stone-600 dark:text-stone-300" /> : <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                                    </div>
                                    <div className={cn("flex flex-col gap-1 max-w-[80%]", msg.role === "user" ? "items-end" : "items-start")}>
                                        <div className={cn("rounded-2xl px-4 py-2 text-sm", msg.role === "user" ? "bg-stone-800 text-stone-50 dark:bg-emerald-600 dark:text-white" : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm")}>
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        </div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {msg.sources.map((s, idx) => (
                                                    <span key={idx} className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                        <Sparkles size={10} />
                                                        {s.documentName}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 flex-row">
                                    <div className="flex-shrink-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                                        <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm rounded-2xl px-4 py-3 flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                                        <span className="text-xs text-stone-500">Recherche dans la base documentaire...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                placeholder="Posez une question sur les règles..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                                className="focus-visible:ring-emerald-500 bg-stone-50 dark:bg-stone-900"
                            />
                            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            )}

            {/* Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white p-0 relative group transition-transform hover:scale-105"
                >
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-75 group-hover:opacity-100 duration-1000" />
                    <MessageSquare className="h-6 w-6 relative z-10" />
                    <Sparkles className="h-4 w-4 absolute top-2 right-2 flex text-emerald-200 animate-pulse z-10" />
                </Button>
            )}
        </div>
    );
}
