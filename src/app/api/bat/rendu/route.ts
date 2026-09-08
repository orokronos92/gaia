import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { fichierEtiquetteExiste } from "@/db/queries/fichiers-etiquettes";
import { rendreFace } from "@/lib/utils/pdf-repere";
import { getObjectBuffer } from "@/lib/utils/s3-client";

/**
 * Rend une face de BAT en image.
 *
 * Une route et non une Server Action : le navigateur a besoin d'une URL à
 * mettre dans un `<img>`, ce qu'une action ne fournit pas.
 *
 * Poppler rend le PDF vectoriel ; on ne dépend d'aucune bibliothèque cliente,
 * et l'image obtenue partage exactement le repère des mesures — c'est ce qui
 * permettra de surligner au bon endroit.
 */
const Schema = z.object({
  cle: z.string().min(1).max(1024),
  page: z.coerce.number().int().min(1).max(50).default(1),
  // Trois résolutions suffisent : lecture, travail, loupe.
  dpi: z.coerce.number().int().refine((d) => [150, 200, 300].includes(d)).default(200),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Non autorisé.", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = Schema.safeParse(params);
  if (!parsed.success) return new NextResponse("Requête invalide.", { status: 400 });

  const { cle, page, dpi } = parsed.data;

  // La clé vient du navigateur : on n'accepte que celles que l'application a
  // enregistrées, sans quoi cette URL lirait n'importe quel objet du bucket.
  if (!(await fichierEtiquetteExiste(cle))) {
    return new NextResponse("Fichier inconnu.", { status: 404 });
  }

  try {
    const png = await rendreFace(await getObjectBuffer(cle), { page, dpi });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Un BAT ne change pas sous une clé donnée : le navigateur peut le
        // garder, ce qui rend le zoom et le changement de face instantanés.
        "Cache-Control": "private, max-age=3600, immutable",
      },
    });
  } catch {
    return new NextResponse("Face illisible.", { status: 422 });
  }
}
