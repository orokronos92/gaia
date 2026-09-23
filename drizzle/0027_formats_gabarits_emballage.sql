-- Conditionnement : trois notions que l'Excel mélangeait.
--
-- Constat du 2026-09-23 (docs/decisions/2026-09-23-constat-conditionnements.md) :
-- - le FORMAT DE VENTE se lit dans le 4ᵉ chiffre du code (1 = vrac 1,5 kg,
--   2 = détail « 100 g », 6 = détail « 50 g »…) ; le poids n'en dit rien, 70 g
--   existe dans les deux formats de détail ;
-- - le GABARIT est la taille réelle de l'étiquette, mesurée dans le PDF ; le
--   100 g et le 50 g d'un même thé partagent le même (55 × 135 / 55 × 95) ;
-- - l'EMBALLAGE (sachet SA9205, tube, boîte) vient d'autres colonnes.
--
-- Les deux premiers deviennent des référentiels, pour que GaïaLabel porte cette
-- connaissance quand l'Excel ne sera plus relu. Tout est ajouté, rien n'est
-- supprimé : la migration se rejoue sans effet.

CREATE TABLE IF NOT EXISTS "formats_vente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cle" varchar(30) NOT NULL UNIQUE,
  "libelle" varchar(120) NOT NULL,
  -- Le 4ᵉ chiffre du code produit qui désigne ce format.
  "chiffre" varchar(1) UNIQUE,
  -- Faux pour le vrac : l'étiquette est imprimée en interne, aucun fichier graphiste attendu.
  "etiquette_graphiste" boolean NOT NULL DEFAULT true,
  "actif" boolean NOT NULL DEFAULT true,
  "cree_le" timestamp NOT NULL DEFAULT now(),
  "mis_a_jour_le" timestamp NOT NULL DEFAULT now()
);

INSERT INTO "formats_vente" ("cle", "libelle", "chiffre", "etiquette_graphiste") VALUES
  ('VRAC_GRAND',   'Vrac grand format (1,5 kg)',            '1', false),
  ('DETAIL_GRAND', 'Détail grand (≈ 100 g, de 60 à 150 g)', '2', true),
  ('EXCEPTION',    'Exception (brique, échantillon)',       '3', true),
  ('BOITE',        'Boîte ou grand sachet (50 à 250 g)',    '4', true),
  ('VRAC_500',     'Vrac 500 g',                            '5', false),
  ('DETAIL_PETIT', 'Détail petit (≈ 50 g, de 10 à 80 g)',   '6', true),
  ('VRAC_1000',    'Vrac 1 kg',                             '7', false)
ON CONFLICT ("cle") DO NOTHING;

CREATE TABLE IF NOT EXISTS "gabarits_etiquette" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cle" varchar(40) NOT NULL UNIQUE,
  "libelle" varchar(120) NOT NULL,
  -- Petit côté puis grand côté : l'orientation du PDF ne compte pas.
  "petit_cote_mm" integer NOT NULL,
  "grand_cote_mm" integer NOT NULL,
  "face" varchar(20) NOT NULL,
  "actif" boolean NOT NULL DEFAULT true,
  "cree_le" timestamp NOT NULL DEFAULT now(),
  "mis_a_jour_le" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("petit_cote_mm", "grand_cote_mm")
);

INSERT INTO "gabarits_etiquette" ("cle", "libelle", "petit_cote_mm", "grand_cote_mm", "face") VALUES
  ('SACHET_STANDARD_FACING', 'Sachet standard — facing',            55, 135, 'facing'),
  ('SACHET_STANDARD_CONTRE', 'Sachet standard — contre',            55,  95, 'contre'),
  ('SACHET_PLANTES_FACING',  'Sachet plantes — facing',             70, 120, 'facing'),
  ('SACHET_PLANTES_CONTRE',  'Sachet plantes — contre',             70, 100, 'contre'),
  ('SACHET_VOLUMINEUX',      'Sachet volumineux — facing ou contre', 70, 165, 'facing_ou_contre'),
  ('TUBE_GRAND',             'Habillage de tube (grand)',          145, 199, 'habillage'),
  ('TUBE_PETIT',             'Habillage de tube (petit) ou bande',  64, 199, 'habillage'),
  ('STICKER_RECTANGLE',      'Sticker rectangulaire',               47,  64, 'sticker'),
  ('STICKER_CARRE',          'Sticker carré',                       64,  64, 'sticker'),
  ('INFUSETTE_SACHET',       'Étiquette de sachet d''infusette',     20,  56, 'infusette'),
  ('INFUSETTE_ETUI',         'Étui d''infusettes',                  100, 240, 'etui')
ON CONFLICT ("cle") DO NOTHING;

ALTER TABLE "produits"
  ADD COLUMN IF NOT EXISTS "format_vente_id" uuid REFERENCES "formats_vente"("id"),
  -- Vrai quand une personne a choisi le format : le calcul depuis le code ne l'écrase plus.
  ADD COLUMN IF NOT EXISTS "format_vente_manuel" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emballage" varchar(120);

ALTER TABLE "fichiers_etiquettes"
  ADD COLUMN IF NOT EXISTS "largeur_mm" integer,
  ADD COLUMN IF NOT EXISTS "hauteur_mm" integer,
  -- TRIM : zone de coupe (la vraie étiquette) ; MEDIA : page entière, marges comprises.
  ADD COLUMN IF NOT EXISTS "mesure_source" varchar(10),
  ADD COLUMN IF NOT EXISTS "gabarit_id" uuid REFERENCES "gabarits_etiquette"("id");
