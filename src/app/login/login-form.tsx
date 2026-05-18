"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (res?.error) {
                setError("Identifiants incorrects ou compte inactif.")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (err) {
            setError("Une erreur inattendue s'est produite.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="border-emerald-100 shadow-xl shadow-emerald-900/5 dark:border-emerald-900/50">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Bon retour</CardTitle>
                    <CardDescription>
                        Connectez-vous pour accéder à la conformité étiquettes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6">

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email professionnel</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="marie@jardinsdegaia.com"
                                    required
                                    disabled={loading}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="focus-visible:ring-emerald-500"
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Mot de passe</Label>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-4 hover:underline text-emerald-600"
                                    >
                                        Oublié ?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    disabled={loading}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="focus-visible:ring-emerald-500"
                                />
                            </div>
                            {error && <div className="text-sm font-medium text-red-500 dark:text-red-400">{error}</div>}
                            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={loading}>
                                {loading ? "Connexion..." : "Se connecter"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
            <div className="text-balance text-center text-xs text-stone-500 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-emerald-900  dark:text-stone-400 dark:[&_a]:hover:text-emerald-400">
                En vous connectant, vous acceptez les <a href="#">Conditions de service</a> et la <a href="#">Politique de sécurité</a> de GaïaLabel.
            </div>
        </div>
    )
}
