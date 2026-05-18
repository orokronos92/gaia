import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/db"
import { utilisateurs } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // --- MOCK USER D'ESSAI (Puisque Docker Postgres n'a pas pu être lancé) ---
                if (credentials.email === "marie@jardinsdegaia.com" && credentials.password === "gaia2026") {
                    return {
                        id: "00000000-0000-0000-0000-000000001234",
                        name: "Marie Qualité",
                        email: "marie@jardinsdegaia.com",
                        role: "QUALITE"
                    }
                }

                try {
                    const user = await db.query.utilisateurs.findFirst({
                        where: eq(utilisateurs.email, credentials.email as string),
                    })

                    if (!user || (!user.estActif)) {
                        return null
                    }

                    const passwordsMatch = await bcrypt.compare(
                        credentials.password as string,
                        user.motDePasse
                    )

                    if (passwordsMatch) {
                        return {
                            id: user.id,
                            name: user.nom,
                            email: user.email,
                            role: user.role,
                        }
                    }
                    return null
                } catch (error) {
                    console.error("Erreur auth:", error)
                    return null
                }
            },
        }),
    ],
})
