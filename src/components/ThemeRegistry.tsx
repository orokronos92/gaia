"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Force l'application du dark mode par défaut
    document.documentElement.classList.add("dark", "bg-[#050505]"); 
    setMounted(true);
  }, []);

  // Évite un flash pendant le rendu côté serveur
  if (!mounted) {
    return <div className="invisible h-0 w-0 overflow-hidden">{children}</div>;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen text-neutral-200 selection:bg-white/10 selection:text-white antialiased font-sans"
      >
        {/* Texture de grain (noise) pour le côté immersif/premium */}
        <div 
          className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.025] mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
          aria-hidden="true"
        />
        
        {/* Gradient Radial d'ambiance en arrière-plan */}
        <div 
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"
          aria-hidden="true"
        />
        
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
