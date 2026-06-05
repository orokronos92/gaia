import { pgTable, text, timestamp, boolean, uuid, varchar, integer, json, real, pgEnum, vector } from "drizzle-orm/pg-core";

export const RoleUtilisateur = pgEnum("role_utilisateur", ["ADMIN", "QUALITE", "GRAPHISME", "CONDITIONNEMENT", "ACHATS", "DIRECTION"]);

export const StatutRecette = pgEnum("statut_recette", ["DRAFT", "VALIDATED", "ARCHIVED"]);

export const NotificationType = pgEnum("notification_type", ["INFO", "SUCCESS", "WARNING", "ERROR", "AI"]);

export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => utilisateurs.id, { onDelete: 'cascade' }), // Null = Global
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: NotificationType("type").default("INFO").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    link: varchar("link", { length: 512 }),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});

export const StatutEtiquette = pgEnum("statut_etiquette", [
    "DRAFT", "QUALITY_REVIEW", "QUALITY_VALIDATED", "DESIGN_IN_PROGRESS",
    "DESIGN_REVIEW", "DESIGN_VALIDATED", "SENT_TO_PRINTER", "BAT_RECEIVED",
    "BAT_VALIDATED", "PRINTING", "RECEIVED", "RECEPTION_CONTROLLED",
    "ACTIVE", "ARCHIVED"
]);

export const utilisateurs = pgTable("utilisateurs", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    nom: varchar("nom", { length: 255 }).notNull(),
    motDePasse: varchar("mot_de_passe", { length: 255 }).notNull(), // Hash bcrypt
    role: RoleUtilisateur("role").notNull(),
    estActif: boolean("est_actif").default(true).notNull(),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});

export const produits = pgTable("produits", {
    id: uuid("id").primaryKey().defaultRandom(),
    codePf: varchar("code_pf", { length: 50 }).unique().notNull(), // ex: MT265
    gamme: varchar("gamme", { length: 100 }).notNull(),
    sousGamme: varchar("sous_gamme", { length: 100 }),
    denominationFr: varchar("denomination_fr", { length: 255 }).notNull(),
    denominationEn: varchar("denomination_en", { length: 255 }),
    sousDesignationFr: varchar("sous_designation_fr", { length: 255 }),
    sousDesignationEn: varchar("sous_designation_en", { length: 255 }),
    typeTheFr: varchar("type_the_fr", { length: 255 }).notNull(),
    typeTheEn: varchar("type_the_en", { length: 255 }),
    origine: varchar("origine", { length: 255 }),           // Pays/région PMI
    producteurJardin: varchar("producteur_jardin", { length: 255 }),
    estAromatise: boolean("est_aromatise").default(false).notNull(),
    conditionnement: varchar("conditionnement", { length: 100 }),
    codeEan: varchar("code_ean", { length: 50 }),
    poidsNet: varchar("poids_net", { length: 50 }),
    tempsInfusion: varchar("temps_infusion", { length: 50 }),
    tempInfusion: varchar("temp_infusion", { length: 50 }),
    poidsTasse: varchar("poids_tasse", { length: 50 }),
    nbTasses: varchar("nb_tasses", { length: 50 }),
    plusieursInfusions: boolean("plusieurs_infusions").default(false).notNull(),
    mentionEcocert: varchar("mention_ecocert", { length: 255 }),
    nomenclaturePmi: varchar("nomenclature_pmi", { length: 255 }),
    // ─── Fournisseur ──────────────────────────────────────────────────────────
    fournisseur: varchar("fournisseur", { length: 255 }),               // ex: Création Maison
    codeArticleFournisseur: varchar("code_article_fournisseur", { length: 100 }),
    designationFournisseur: varchar("designation_fournisseur", { length: 255 }),
    // ─── PMI étendu ───────────────────────────────────────────────────────────
    floId: varchar("flo_id", { length: 100 }),                          // ex: Maté FLO - Triunfo
    epoqueRecolte: varchar("epoque_recolte", { length: 100 }),           // ex: Printemps
    techniqueRecolte: varchar("technique_recolte", { length: 255 }),
    organismeCertificateur: varchar("organisme_certificateur", { length: 100 }),
    grade: varchar("grade", { length: 100 }),                           // granulométrie
    volumineux: boolean("volumineux"),                                  // null = non renseigné
    nomLatin: varchar("nom_latin", { length: 255 }),
    infoProducteur: text("info_producteur"),                            // infos orphelines sur le producteur
    typeProducteur: varchar("type_producteur", { length: 100 }),         // coopérative, etc.
    origineMpa: varchar("origine_mpa", { length: 255 }),                // Origine Matière Première Aromatique
    // ─── Allergènes & Allégations MP ──────────────────────────────────────────
    allergenesMp: varchar("allergenes_mp", { length: 50 }),             // "oui" / "non" / null
    allegationsMp: varchar("allegations_mp", { length: 50 }),           // "oui" / "non" / null (sur le mélange final ?)
    // ─── Labels ───────────────────────────────────────────────────────────────
    labelsMP: json("labels_mp").$type<string[]>(),                      // ["AB", "FLO", "MH"...]
    labelsClient: json("labels_client").$type<string[]>(),              // ["AB", "WFTO"...]
    // ─── Produit fini ─────────────────────────────────────────────────────────
    conditionnementsOptions: json("conditionnements_options").$type<Array<{ gamme: string; format: string; grammage: string }>>(), // gammes/formats cochés (multi-valué)
    declinaisons: text("declinaisons"),                                 // ex: "infusette cristal JDG courant 2026"
    ingredientsSuggestion: text("ingredients_suggestion"),              // liste simplifiée avant formulation QUID
    allegationsPossibles: json("allegations_possibles").$type<Array<{libelle: string, nbTasses: string, description?: string}>>(), // options proposées dans le FD
    dateMiseMarche: varchar("date_mise_marche", { length: 100 }),
    commentaires: text("commentaires"),
    // ─── Timestamps ───────────────────────────────────────────────────────────
    creeLe: timestamp("cree_le").defaultNow().notNull(),
    misAJourLe: timestamp("mis_a_jour_le").defaultNow().notNull(),
});

// Table des fiches de dégustation — une par session, liée au produit
export const fichesDegustation = pgTable("fiches_degustation", {
    id: uuid("id").primaryKey().defaultRandom(),
    produitId: uuid("produit_id").references(() => produits.id, { onDelete: 'cascade' }).notNull(),
    dateDegustation: varchar("date_degustation", { length: 50 }),       // ex: 29/07/2025
    degustateur: json("degustateur").$type<string[]>(),                 // un ou plusieurs dégustateurs, ex: ["Aurélie", "Patrice"]
    numeroDeLot: varchar("numero_de_lot", { length: 100 }),
    momentDegustation: varchar("moment_degustation", { length: 100 }), // matin / à tout moment...
    // ─── Paramètres dégustation ───────────────────────────────────────────────
    poidsInfuse: varchar("poids_infuse", { length: 50 }),              // ex: 2 g
    temperatureDegustation: varchar("temperature_degustation", { length: 50 }), // ex: 95°C
    tempsDegustation: varchar("temps_degustation", { length: 50 }),     // ex: 2-3 mn
    // ─── Notes organoleptiques ────────────────────────────────────────────────
    feuillesSechesAspect: text("feuilles_seches_aspect"),
    feuillesSechesCouleur: text("feuilles_seches_couleur"),
    feuillesSechesSenteur: text("feuilles_seches_senteur"),
    feuillesInfuseesAspect: text("feuilles_infusees_aspect"),
    feuillesInfuseesCouleur: text("feuilles_infusees_couleur"),
    feuillesInfuseesSenteur: text("feuilles_infusees_senteur"),
    infusionAspectCouleur: text("infusion_aspect_couleur"),
    infusionParfum: text("infusion_parfum"),
    saveurBouche: text("saveur_bouche"),
    // ─── Source ───────────────────────────────────────────────────────────────
    fichierSourceNom: varchar("fichier_source_nom", { length: 255 }),  // nom du fichier importé
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});

export const labelsProduits = pgTable("labels_produits", {
    id: uuid("id").primaryKey().defaultRandom(),
    produitId: uuid("produit_id").references(() => produits.id, { onDelete: 'cascade' }).notNull(),
    typeLabel: varchar("type_label", { length: 100 }).notNull(), // AB, WFTO...
    valeur: varchar("valeur", { length: 255 }), // ex: "IGP Darjeeling"
});

export const recettes = pgTable("recettes", {
    id: uuid("id").primaryKey().defaultRandom(),
    produitId: uuid("produit_id").references(() => produits.id, { onDelete: 'cascade' }).notNull(),
    version: varchar("version", { length: 50 }).notNull(),
    developpeur: varchar("developpeur", { length: 255 }),
    date: timestamp("date"),
    saveurOrigine: varchar("saveur_origine", { length: 255 }),
    labelsClient: varchar("labels_client", { length: 255 }),
    statut: StatutRecette("statut").default('DRAFT').notNull(),
    pourcentageTotal: real("pourcentage_total"),
    fichierSourceId: varchar("fichier_source_id", { length: 255 }), // Storage ref
    creeLe: timestamp("cree_le").defaultNow().notNull(),
    misAJourLe: timestamp("mis_a_jour_le").defaultNow().notNull(),
});

export const ingredientsRecette = pgTable("ingredients_recette", {
    id: uuid("id").primaryKey().defaultRandom(),
    recetteId: uuid("recette_id").references(() => recettes.id, { onDelete: 'cascade' }).notNull(),
    codeArticle: varchar("code_article", { length: 50 }).notNull(),
    designation: varchar("designation", { length: 255 }).notNull(),
    estDemeter: boolean("est_demeter").default(false).notNull(),
    estEquitable: boolean("est_equitable").default(false).notNull(),
    quantiteKg: real("quantite_kg").notNull(),
    pourcentageBrut: real("pourcentage_brut").notNull(),
    pourcentageEtiquette: real("pourcentage_etiquette").notNull(),
    ordreTri: integer("ordre_tri").notNull(),
});

export const fichesEtiquettes = pgTable("fiches_etiquettes", {
    id: uuid("id").primaryKey().defaultRandom(),
    produitId: uuid("produit_id").references(() => produits.id, { onDelete: 'cascade' }).notNull(),
    codeEtiquette: varchar("code_etiquette", { length: 100 }).unique(),
    denominationLegale: varchar("denomination_legale", { length: 255 }),
    texteCommercialFr: text("texte_commercial_fr"),
    texteCommercialEn: text("texte_commercial_en"),
    ingredientsFr: text("ingredients_fr"),
    ingredientsEn: text("ingredients_en"),
    allergenes: text("allergenes"),
    allegationsSanteFr: text("allegations_sante_fr"),
    allegationsSanteEn: text("allegations_sante_en"),
    allegationChoisie: varchar("allegation_choisie", { length: 255 }), // allégation retenue par l'équipe qualité
    nbTassesAllegation: varchar("nb_tasses_allegation", { length: 50 }), // "2 tasses par jour" etc.
    phraseWftoFr: text("phrase_wfto_fr"),
    mentionConservation: varchar("mention_conservation", { length: 255 }).default("À conserver à l'abri de l'humidité de la lumière et de la chaleur"),
    mentionFabricant: varchar("mention_fabricant", { length: 255 }).default("LES JARDINS DE GAÏA – Z.A. – 6, RUE DE L'ÉCLUSE – FR-67820 WITTISHEIM"),
    sousDesignationDe: varchar("sous_designation_de", { length: 255 }),
    ingredientsDe: text("ingredients_de"),
    sousDesignationIt: varchar("sous_designation_it", { length: 255 }),
    ingredientsIt: text("ingredients_it"),
    sousDesignationNl: varchar("sous_designation_nl", { length: 255 }),
    ingredientsNl: text("ingredients_nl"),
    statut: StatutEtiquette("statut").default('DRAFT').notNull(),
    versionCouranteId: uuid("version_courante_id"), // manual reference to versionsEtiquettes
    creePar: uuid("cree_par").references(() => utilisateurs.id),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
    misAJourLe: timestamp("mis_a_jour_le").defaultNow().notNull(),
});

export const versionsEtiquettes = pgTable("versions_etiquettes", {
    id: uuid("id").primaryKey().defaultRandom(),
    ficheEtiquetteId: uuid("fiche_etiquette_id").references(() => fichesEtiquettes.id, { onDelete: 'cascade' }).notNull(),
    numeroVersion: integer("numero_version").notNull(),
    resumeChangements: text("resume_changements"),
    donneesSnapshot: json("donnees_snapshot").notNull(),
    statut: StatutEtiquette("statut").notNull(),
    pdfFichierId: varchar("pdf_fichier_id", { length: 255 }),
    illustratorFichierId: varchar("illustrator_fichier_id", { length: 255 }),
    batFichierId: varchar("bat_fichier_id", { length: 255 }),
    creePar: uuid("cree_par").references(() => utilisateurs.id).notNull(),
    validePar: uuid("valide_par").references(() => utilisateurs.id),
    valideLe: timestamp("valide_le"),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});

export const TypeControle = pgEnum("type_controle", [
    "DENOMINATION", "QUID", "ROUNDING", "ALLEGATION", "ALLERGEN",
    "REGLISSE", "LABEL_COHERENCE", "VISUAL_COHERENCE", "EAN_CODE",
    "INFO_TRI", "CHAR_SIZE", "NUTRITIONAL", "PDF_VS_EXCEL", "BAT_VS_LABEL"
]);

export const StatutControle = pgEnum("statut_controle", ["PASS", "FAIL", "WARNING", "PENDING", "SKIPPED"]);

export const controlesConformite = pgTable("controles_conformite", {
    id: uuid("id").primaryKey().defaultRandom(),
    ficheEtiquetteId: uuid("fiche_etiquette_id").references(() => fichesEtiquettes.id, { onDelete: 'cascade' }).notNull(),
    versionEtiquetteId: uuid("version_etiquette_id").references(() => versionsEtiquettes.id),
    typeControle: TypeControle("type_controle").notNull(),
    statut: StatutControle("statut").notNull(),
    details: json("details"),
    suggestionIa: text("suggestion_ia"),
    justification: text("justification"),
    controlePar: varchar("controle_par", { length: 255 }), // userId ou "SYSTEM" ou "AI_AUDIT"
    controleLe: timestamp("controle_le").defaultNow().notNull(),
});

export const commentairesEtiquettes = pgTable("commentaires_etiquettes", {
    id: uuid("id").primaryKey().defaultRandom(),
    ficheEtiquetteId: uuid("fiche_etiquette_id").references(() => fichesEtiquettes.id, { onDelete: 'cascade' }).notNull(),
    utilisateurId: uuid("utilisateur_id").references(() => utilisateurs.id).notNull(),
    contenu: text("contenu").notNull(),
    referenceChamp: varchar("reference_champ", { length: 255 }), // ex: "ingredientsFr"
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});

export const StatutReception = pgEnum("statut_reception", ["CONFORME", "NON_CONFORME_TEXTE", "NON_CONFORME_COULEUR", "NON_CONFORME_QUANTITE", "NON_CONFORME_AUTRE"]);

export const commandesImpression = pgTable("commandes_impression", {
    id: uuid("id").primaryKey().defaultRandom(),
    versionEtiquetteId: uuid("version_etiquette_id").references(() => versionsEtiquettes.id).unique().notNull(),
    codeFournisseur: varchar("code_fournisseur", { length: 100 }),
    quantite: integer("quantite"),
    prix: real("prix"),
    dateDebutAnalyse: timestamp("date_debut_analyse"),
    dateFinAnalyse: timestamp("date_fin_analyse"),
    dateEnvoiExterne: timestamp("date_envoi_externe"),
    dateEnvoiCommande: timestamp("date_envoi_commande"),
    dateEnvoiBat: timestamp("date_envoi_bat"),
    dateReceptionBat: timestamp("date_reception_bat"),
    dateValidationBat: timestamp("date_validation_bat"),
    dateDebutImpression: timestamp("date_debut_impression"),
    dateReception: timestamp("date_reception"),
    statutReception: StatutReception("statut_reception"),
    notesReception: text("notes_reception"),
    photosReceptionIds: json("photos_reception_ids"), // Array stocké en JSON
    controlePar: uuid("controle_par").references(() => utilisateurs.id),
    controleLe: timestamp("controle_le"),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
    misAJourLe: timestamp("mis_a_jour_le").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    typeEntite: varchar("type_entite", { length: 100 }).notNull(),
    entiteId: varchar("entite_id", { length: 255 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    utilisateurId: uuid("utilisateur_id").notNull(),
    changements: json("changements"),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
    id: uuid("id").primaryKey().defaultRandom(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    contentChunk: text("content_chunk").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: json("metadata"),
    creeLe: timestamp("cree_le").defaultNow().notNull(),
});


