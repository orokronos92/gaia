import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    providers: [], // Les providers nécessitant Node.js (DB, bcrypt) seront ajoutés dans auth.ts
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
            const isLoginRoute = nextUrl.pathname === '/login';

            if (isLoginRoute || isApiAuthRoute) {
                return true;
            }
            return isLoggedIn;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
