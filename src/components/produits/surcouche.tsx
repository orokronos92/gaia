"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"

/**
 * Modal overlay, rendered through a portal on `document.body`.
 *
 * The portal is not cosmetic: the cards wrapping these tables use
 * `backdrop-blur`, and a backdrop filter establishes a containing block for
 * `position: fixed` descendants. Rendered in place, `inset-0` would then cover
 * the whole card — the full height of the catalogue — instead of the viewport,
 * leaving the dialog stranded far below the fold.
 *
 * Escape closes, so does a click on the backdrop; body scroll is locked while
 * open so the page behind does not drift under the dialog.
 */
export function Surcouche({
    onFermer,
    children,
}: {
    onFermer: () => void
    children: React.ReactNode
}) {
    useEffect(() => {
        const surEchap = (e: KeyboardEvent) => {
            if (e.key === "Escape") onFermer()
        }
        document.addEventListener("keydown", surEchap)
        const overflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", surEchap)
            document.body.style.overflow = overflow
        }
    }, [onFermer])

    // Only ever rendered after a click, so `document` exists — no mount state,
    // and nothing is emitted server-side to mismatch on hydration.
    if (typeof document === "undefined") return null

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/40 backdrop-blur-sm p-4 sm:p-8"
            onClick={(e) => {
                if (e.target === e.currentTarget) onFermer()
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-xl text-left">{children}</div>
        </div>,
        document.body
    )
}
