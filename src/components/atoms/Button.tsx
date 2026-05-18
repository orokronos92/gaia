"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

export interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "glass" | "solid" | "ghost" | "bento";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = "glass",
            size = "md",
            isLoading = false,
            className = "",
            "aria-label": ariaLabel,
            disabled,
            ...props
        },
        ref
    ) => {
        // Styles de base communs (accessibilité, structure, focus states)
        const baseClasses =
            "relative inline-flex items-center justify-center font-sans tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl overflow-hidden shrink-0 group";

        // Variantes High-End
        const variantClasses = {
            glass:
                "bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-neutral-200 hover:text-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]",
            solid:
                "bg-neutral-100 text-neutral-900 hover:bg-white border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]",
            ghost:
                "bg-transparent text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent",
            bento:
                "bg-neutral-900/50 hover:bg-neutral-800/80 border border-white/5 backdrop-blur-md text-neutral-300 hover:text-white shadow-inner",
        };

        // Tailles
        const sizeClasses = {
            sm: "h-9 px-4 text-xs font-medium",
            md: "h-11 px-6 text-sm font-medium",
            lg: "h-14 px-8 text-base font-semibold",
            icon: "h-11 w-11 p-0 flex-shrink-0",
        };

        // Extraction d'un label accessible par défaut s'il s'agit de texte seul
        const accessibleLabel =
            ariaLabel || (typeof children === "string" ? children : "Bouton d'action");

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: disabled || isLoading ? 1 : 1.02, filter: "brightness(1.05)" }}
                whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
                aria-label={accessibleLabel}
                disabled={disabled || isLoading}
                aria-disabled={disabled || isLoading}
                aria-busy={isLoading}
                {...props}
            >
                <span
                    className={`relative z-10 flex items-center justify-center gap-2 transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"
                        }`}
                >
                    {children as React.ReactNode}
                </span>

                {/* Loader intégré */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <svg
                            className="animate-spin h-5 w-5 text-current opacity-70"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                )}

                {/* Effet d'éclairage interne (Inner Highlight) pour Glass/Bento */}
                {(variant === "glass" || variant === "bento") && (
                    <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100 opacity-60" aria-hidden="true" />
                )}

                {/* Reflet supérieur (Top Glare Effect) */}
                {(variant === "glass" || variant === "bento" || variant === "solid") && (
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 pointer-events-none" aria-hidden="true" />
                )}
            </motion.button>
        );
    }
);

Button.displayName = "Button";
