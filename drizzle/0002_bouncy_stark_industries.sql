ALTER TABLE "fiches_etiquettes" ADD COLUMN "allegation_choisie" varchar(255);--> statement-breakpoint
ALTER TABLE "fiches_etiquettes" ADD COLUMN "nb_tasses_allegation" varchar(50);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "info_producteur" text;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "type_producteur" varchar(100);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "origine_mpa" varchar(255);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "allergenes_mp" varchar(50);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "allegations_mp" varchar(50);--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "conditionnements_options" json;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "declinaisons" text;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "ingredients_suggestion" text;--> statement-breakpoint
ALTER TABLE "produits" ADD COLUMN "allegations_possibles" json;