import { Package, Search, Filter, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const mockOrders = [
    { id: "CMD-2026-001", supplier: "Imprimerie Alsacienne", date: "02 Mars 2026", items: 4, status: "EN_COURS", total: "1 245,00 €" },
    { id: "CMD-2026-002", supplier: "EcoPack Solutions", date: "28 Fév 2026", items: 12, status: "LIVRE", total: "3 890,50 €" },
    { id: "CMD-2026-003", supplier: "Design & Print Bio", date: "15 Fév 2026", items: 2, status: "EN_ATTENTE_BAT", total: "850,00 €" },
]

export default function OrdersPage() {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
                        Commandes Fournisseurs
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mt-1">
                        Suivi des impressions et réassorts d'étiquettes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2 bg-white/60 backdrop-blur-md shadow-sm border-stone-200/50">
                        <Download className="h-4 w-4 text-stone-500" />
                        Exporter
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm shadow-emerald-700/20 text-white">
                        <Package className="h-4 w-4" />
                        Nouvelle Commande
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 dark:bg-stone-900/60 mt-4 overflow-hidden">
                <div className="p-5 border-b border-stone-200/50 flex items-center justify-between">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                        <Input
                            type="search"
                            placeholder="Rechercher une commande, fournisseur..."
                            className="pl-9 bg-white/80 border-stone-200/50 rounded-full"
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="text-stone-500 rounded-full hover:bg-stone-100/50">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
                <Table>
                    <TableHeader className="bg-stone-50/50 dark:bg-stone-800/20">
                        <TableRow className="border-stone-200/50 hover:bg-transparent">
                            <TableHead className="w-[150px] font-medium text-stone-500">N° Commande</TableHead>
                            <TableHead className="font-medium text-stone-500">Fournisseur</TableHead>
                            <TableHead className="font-medium text-stone-500">Date</TableHead>
                            <TableHead className="font-medium text-stone-500">Articles</TableHead>
                            <TableHead className="font-medium text-stone-500">Statut</TableHead>
                            <TableHead className="text-right font-medium text-stone-500">Montant HT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockOrders.map((order) => (
                            <TableRow key={order.id} className="border-stone-200/50 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors cursor-pointer group">
                                <TableCell className="font-medium text-emerald-950 dark:text-emerald-400">{order.id}</TableCell>
                                <TableCell className="text-stone-700 dark:text-stone-300">{order.supplier}</TableCell>
                                <TableCell className="text-stone-500">{order.date}</TableCell>
                                <TableCell className="text-stone-500">{order.items} réf.</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={
                                            order.status === "LIVRE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                order.status === "EN_COURS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    "bg-orange-50 text-orange-700 border-orange-200"
                                        }
                                    >
                                        {order.status.replace(/_/g, " ")}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium text-stone-700 group-hover:text-emerald-700 transition-colors">
                                    {order.total}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
