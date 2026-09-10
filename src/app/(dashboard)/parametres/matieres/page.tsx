import { permanentRedirect } from "next/navigation";

/**
 * Les matières premières ont rejoint les Référentiels (2026-09-10).
 *
 * L'ancienne adresse est gardée : elle a pu être mise en favori, et un lien mort
 * se lit comme une régression. La redirection est permanente — ce n'est pas un
 * déplacement provisoire.
 */
export default function MatieresDeplacees() {
  permanentRedirect("/referentiels/matieres");
}
