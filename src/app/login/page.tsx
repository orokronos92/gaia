import { LoginForm } from "./login-form"

export default function LoginPage() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-stone-50 p-6 md:p-10 dark:bg-stone-900">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <a href="#" className="flex items-center gap-2 self-center font-medium">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-leaf"
                        >
                            <path d="M11 20A7 7 0 0 1 14 6c-3.14-.04-6.38 1.15-8.5 3.3-2.16 2.19-3.23 5.46-3.12 8.64a7.99 7.99 0 0 1 6.36-6.2" />
                            <path d="M4 18c3-4 6-4 10-2" />
                            <path d="m14 16 3-3-3-3" />
                        </svg>
                    </div>
                    <span className="text-2xl tracking-tighter text-emerald-900 font-bold dark:text-emerald-400">GaïaLabel</span>
                </a>
                <LoginForm />
            </div>
        </div>
    )
}
