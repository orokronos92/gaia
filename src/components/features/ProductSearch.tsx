"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";

export function ProductSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [term, setTerm] = useState(searchParams.get("q") || "");

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTerm(val);
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (val) {
                params.set("q", val);
            } else {
                params.delete("q");
            }
            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    return (
        <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
                type="search"
                value={term}
                onChange={handleSearch}
                placeholder="Rechercher par code, nom, gamme..."
                className="pl-9 bg-white/80 border-stone-200/50 rounded-full"
            />
            {isPending && (
                <div className="absolute right-3 top-3 h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            )}
        </div>
    );
}
