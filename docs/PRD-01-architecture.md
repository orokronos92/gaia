# PRD-01 — Architecture technique

## Stack

| Couche | Technologie | Justification |
|--------|------------|---------------|
| Frontend | **Next.js 15** (App Router) + TypeScript | SSR pour le dashboard, Server Actions pour la logique métier |
| UI | **Tailwind CSS** + **shadcn/ui** | Composants accessibles, customisables aux couleurs Gaïa |
| Base de données | **PostgreSQL 16** (via Prisma ORM) | Relationnel pur, JSONB pour snapshots/audit |
| Stockage fichiers | **Abstraction StorageService** (local en phase 1, MinIO en cible) | PDF, fichiers Illustrator, BAT, photos |
| Agents IA | **Anthropic SDK** (Claude) intégré dans Next.js | Audit réglementaire, comparaison PDF, vision |
| Background jobs | **node-cron** (phase 1), BullMQ + Redis (si besoin) | Alertes délais, notifications |
| Auth | **NextAuth.js v5** (Credentials provider) | Login/mot de passe simple, rôles |
| Déploiement | **Docker Compose** | postgres:16 + redis:7 + app |

---

## Structure de dossiers

```
gaialabel/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              ← sidebar + header
│   │   │   ├── page.tsx                ← dashboard principal
│   │   │   ├── produits/
│   │   │   │   ├── page.tsx            ← liste produits
│   │   │   │   └── [code]/
│   │   │   │       ├── page.tsx        ← fiche produit (onglets)
│   │   │   │       └── import/
│   │   │   │           └── page.tsx    ← import dégustation+recette
│   │   │   ├── etiquettes/
│   │   │   │   ├── page.tsx            ← pipeline kanban/liste
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        ← fiche étiquette
│   │   │   │       └── comparaison/
│   │   │   │           └── page.tsx    ← comparaison Excel↔PDF
│   │   │   ├── commandes/
│   │   │   │   └── page.tsx            ← suivi commandes & délais
│   │   │   └── parametres/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── products/
│   │       ├── labels/
│   │       ├── recipes/
│   │       ├── orders/
│   │       ├── conformity/
│   │       ├── ai/
│   │       │   ├── audit-regulatory/
│   │       │   ├── compare-pdf/
│   │       │   └── compare-bat/
│   │       ├── storage/
│   │       └── import/
│   ├── lib/
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── storage/
│   │   │   ├── storage-service.ts      ← interface abstraite
│   │   │   ├── local-adapter.ts        ← phase 1
│   │   │   └── minio-adapter.ts        ← phase cible
│   │   ├── ai/
│   │   │   ├── client.ts               ← config Anthropic SDK
│   │   │   ├── agents/
│   │   │   │   ├── regulatory-checker.ts
│   │   │   │   ├── pdf-comparator.ts
│   │   │   │   ├── visual-checker.ts
│   │   │   │   └── rounding-engine.ts
│   │   │   └── prompts/
│   │   │       ├── regulatory-rules.ts ← PRO-QHS-013 encodée
│   │   │       └── comparison.ts
│   │   ├── auth/
│   │   │   └── auth-options.ts
│   │   ├── business-rules/
│   │   │   ├── rounding.ts
│   │   │   ├── denomination.ts
│   │   │   ├── quid.ts
│   │   │   ├── allegations.ts
│   │   │   ├── reglisse.ts
│   │   │   └── labels-coherence.ts
│   │   ├── validators/                 ← schémas Zod
│   │   │   ├── product.ts
│   │   │   ├── recipe.ts
│   │   │   ├── label-sheet.ts
│   │   │   └── print-order.ts
│   │   └── utils/
│   │       ├── excel-parser.ts
│   │       ├── word-parser.ts
│   │       └── pdf-extractor.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── breadcrumb.tsx
│   │   ├── products/
│   │   │   ├── product-list.tsx
│   │   │   ├── product-card.tsx
│   │   │   ├── product-filters.tsx
│   │   │   └── tabs/
│   │   │       ├── tab-etiquette.tsx
│   │   │       ├── tab-recette.tsx
│   │   │       ├── tab-conformite.tsx
│   │   │       ├── tab-commandes.tsx
│   │   │       └── tab-historique.tsx
│   │   ├── labels/
│   │   │   ├── label-pipeline.tsx
│   │   │   ├── label-card.tsx
│   │   │   └── pdf-comparison.tsx
│   │   ├── conformity/
│   │   │   ├── check-panel.tsx
│   │   │   ├── check-row.tsx
│   │   │   └── ai-audit-result.tsx
│   │   ├── import/
│   │   │   ├── file-upload-zone.tsx
│   │   │   └── import-result.tsx
│   │   └── shared/
│   │       ├── status-badge.tsx
│   │       ├── label-badge.tsx
│   │       ├── data-table.tsx
│   │       └── notification-bell.tsx
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                         ← import des 802 produits
│   └── migrations/
├── public/
│   └── images/
├── scripts/
│   └── import-excel.ts                 ← script d'import BDD existante
├── docker-compose.yml
├── .env.example
├── tailwind.config.ts
└── package.json
```

---

## Schéma de base de données (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════
// UTILISATEURS
// ═══════════════════════════════════

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // hash bcrypt
  role      UserRole
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

enum UserRole {
  ADMIN
  QUALITE
  GRAPHISME
  CONDITIONNEMENT
  ACHATS
  DIRECTION
}

// ═══════════════════════════════════
// PRODUITS
// ═══════════════════════════════════

model Product {
  id                String   @id @default(cuid())
  codePf            String   @unique              // TB4041, MT265...
  gamme             String                        // LES GRANDS CLASSIQUES
  sousGamme         String?                       // Ché Chun, PRIMEURS 2025
  denominationFr    String                        // Maté sportif
  denominationEn    String?
  sousDesignationFr String?
  sousDesignationEn String?
  typeTheFr         String                        // Mélange de plantes aromatisé
  typeTheEn         String?
  origine           String?                       // Brésil, Vietnam - Yen Bai
  producteurJardin  String?
  aromatise         Boolean  @default(false)
  conditionnement   String?                       // sachet 100g, tube métal
  codeEan           String?
  poidsNet          String?                       // "100g", "36g"
  tempsInfusion     String?                       // "4-5", "7-10"
  tempInfusion      String?                       // "85", "95"
  poidsTasse        String?                       // "2"
  nbTasses          String?
  plusieursInfusions Boolean  @default(false)
  ecocertMention    String?                       // Agriculture Vietnam
  nomenclaturePmi   String?

  labels            ProductLabel[]
  recipes           Recipe[]
  labelSheets       LabelSheet[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ProductLabel {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  labelType String  // AB, WFTO, DEMETER, WILD_TRUST, IGP, ELEPHANT_FRIENDLY
  value     String? // ex: "IGP Darjeeling"
  @@unique([productId, labelType])
}

// ═══════════════════════════════════
// RECETTES
// ═══════════════════════════════════

model Recipe {
  id            String       @id @default(cuid())
  productId     String
  product       Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  version       String                             // V.0, V.1
  developer     String?                            // AURELIE ROHMER
  date          DateTime?
  saveurOrigine String?                            // orange sanguine - gingembre
  labelsClient  String?
  status        RecipeStatus @default(DRAFT)
  totalPercent  Float?
  sourceFileId  String?                            // ref stockage fichier original

  ingredients   RecipeIngredient[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

enum RecipeStatus {
  DRAFT
  VALIDATED
  ARCHIVED
}

model RecipeIngredient {
  id              String  @id @default(cuid())
  recipeId        String
  recipe          Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  codeArticle     String                           // MT100, AS002
  designation     String                           // MATE VERT, HE ORANGE SANGUINE
  isDemeter       Boolean @default(false)
  isFairTrade     Boolean @default(false)
  qtyKg           Float                            // 10.0
  qtyPercent      Float                            // 62.189 (% brut calculé)
  qtyPercentLabel Float                            // 62.0 (% arrondi pour étiquette)
  sortOrder       Int                              // ordre décroissant
}

// ═══════════════════════════════════
// FICHES ÉTIQUETTES
// ═══════════════════════════════════

model LabelSheet {
  id                   String      @id @default(cuid())
  productId            String
  product              Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  codeEtiquette        String?     @unique           // ETTUTO3542, ETMT265V1
  denominationLegale   String?                        // Thé wulong sculpté
  texteCommercialFr    String?     @db.Text
  texteCommercialEn    String?     @db.Text
  ingredientsFr        String?     @db.Text
  ingredientsEn        String?     @db.Text
  allergenes           String?                        // "Aucun" ou liste
  allegationsSanteFr   String?     @db.Text
  allegationsSanteEn   String?     @db.Text
  phraseWftoFr         String?     @db.Text
  mentionConservation  String?     @default("À conserver à l'abri de l'humidité de la lumière et de la chaleur")
  mentionFabricant     String      @default("LES JARDINS DE GAÏA – Z.A. – 6, RUE DE L'ÉCLUSE – FR-67820 WITTISHEIM")

  // Multilingue
  sousDesignationDe    String?
  ingredientsDe        String?     @db.Text
  sousDesignationIt    String?
  ingredientsIt        String?     @db.Text
  sousDesignationNl    String?
  ingredientsNl        String?     @db.Text

  status               LabelStatus @default(DRAFT)
  currentVersionId     String?

  versions             LabelVersion[]
  conformityChecks     ConformityCheck[]
  comments             LabelComment[]

  createdBy            String?
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
}

enum LabelStatus {
  DRAFT
  QUALITY_REVIEW
  QUALITY_VALIDATED
  DESIGN_IN_PROGRESS
  DESIGN_REVIEW
  DESIGN_VALIDATED
  SENT_TO_PRINTER
  BAT_RECEIVED
  BAT_VALIDATED
  PRINTING
  RECEIVED
  RECEPTION_CONTROLLED
  ACTIVE
  ARCHIVED
}

model LabelVersion {
  id              String      @id @default(cuid())
  labelSheetId    String
  labelSheet      LabelSheet  @relation(fields: [labelSheetId], references: [id], onDelete: Cascade)
  versionNumber   Int
  changesSummary  String?     @db.Text
  snapshotData    Json                              // copie complète de la fiche au moment du snapshot
  status          LabelStatus

  pdfFileId           String?                       // ref stockage
  illustratorFileId   String?
  batFileId           String?

  createdBy       String
  validatedBy     String?
  validatedAt     DateTime?
  createdAt       DateTime    @default(now())

  printOrder      PrintOrder?
}

// ═══════════════════════════════════
// CONFORMITÉ
// ═══════════════════════════════════

model ConformityCheck {
  id             String      @id @default(cuid())
  labelSheetId   String
  labelSheet     LabelSheet  @relation(fields: [labelSheetId], references: [id], onDelete: Cascade)
  labelVersionId String?
  checkType      CheckType
  status         CheckStatus
  details        Json?                              // résultat structuré
  aiSuggestion   String?     @db.Text
  justification  String?     @db.Text               // si WARNING justifié par Marie
  checkedBy      String?                            // userId ou "SYSTEM" ou "AI_AUDIT"
  checkedAt      DateTime    @default(now())
}

enum CheckType {
  DENOMINATION
  QUID
  ROUNDING
  ALLEGATION
  ALLERGEN
  REGLISSE
  LABEL_COHERENCE
  VISUAL_COHERENCE
  EAN_CODE
  INFO_TRI
  CHAR_SIZE
  NUTRITIONAL
  PDF_VS_EXCEL
  BAT_VS_LABEL
}

enum CheckStatus {
  PASS
  FAIL
  WARNING
  PENDING
  SKIPPED
}

// ═══════════════════════════════════
// COMMENTAIRES
// ═══════════════════════════════════

model LabelComment {
  id           String     @id @default(cuid())
  labelSheetId String
  labelSheet   LabelSheet @relation(fields: [labelSheetId], references: [id], onDelete: Cascade)
  userId       String
  content      String     @db.Text
  fieldRef     String?                              // référence au champ concerné (ex: "ingredientsFr")
  createdAt    DateTime   @default(now())
}

// ═══════════════════════════════════
// COMMANDES IMPRESSION
// ═══════════════════════════════════

model PrintOrder {
  id               String       @id @default(cuid())
  labelVersionId   String       @unique
  labelVersion     LabelVersion @relation(fields: [labelVersionId], references: [id])
  supplierCode     String?                          // 9BROD, 9EUR4, 9GRAI
  quantity         Int?
  price            Float?

  analysisStartDate  DateTime?                      // cible 3 jours
  analysisEndDate    DateTime?
  externalSendDate   DateTime?                      // cible 12 jours
  orderSendDate      DateTime?                      // cible 2 jours
  batSentDate        DateTime?
  batReceivedDate    DateTime?                      // cible 6 jours
  batValidatedDate   DateTime?
  printStartDate     DateTime?                      // cible 20 jours
  receptionDate      DateTime?
  receptionStatus    ReceptionStatus?
  receptionNotes     String?    @db.Text
  receptionPhotoIds  String[]                       // refs stockage

  controlledBy     String?
  controlledAt     DateTime?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
}

enum ReceptionStatus {
  CONFORME
  NON_CONFORME_TEXTE
  NON_CONFORME_COULEUR
  NON_CONFORME_QUANTITE
  NON_CONFORME_AUTRE
}

// ═══════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════

model AuditLog {
  id         String   @id @default(cuid())
  entityType String                                 // Product, LabelSheet, Recipe...
  entityId   String
  action     String                                 // CREATE, UPDATE, STATUS_CHANGE, VALIDATE
  userId     String
  changes    Json?                                  // { field: { old: x, new: y } }
  createdAt  DateTime @default(now())
}

// ═══════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════

model Notification {
  id        String   @id @default(cuid())
  userId    String                                  // destinataire
  type      String                                  // TASK_ASSIGNED, STATUS_CHANGE, ALERT, etc.
  title     String
  message   String
  link      String?                                 // URL de destination dans l'app
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## Transitions de statut (machine à états)

```
DRAFT ──────────────────────→ QUALITY_REVIEW           (Marie soumet)
QUALITY_REVIEW ─────────────→ QUALITY_VALIDATED         (Marie valide)
QUALITY_REVIEW ─────────────→ DRAFT                     (Marie renvoie)
QUALITY_VALIDATED ──────────→ DESIGN_IN_PROGRESS        (Fabrice prend)
DESIGN_IN_PROGRESS ─────────→ DESIGN_REVIEW             (Fabrice envoie à Marie)
DESIGN_REVIEW ──────────────→ DESIGN_VALIDATED          (Marie valide PDF)
DESIGN_REVIEW ──────────────→ DESIGN_IN_PROGRESS        (Marie demande correction)
DESIGN_VALIDATED ───────────→ SENT_TO_PRINTER           (Pascal envoie)
SENT_TO_PRINTER ────────────→ BAT_RECEIVED              (BAT arrive)
BAT_RECEIVED ───────────────→ BAT_VALIDATED             (Marie+Fabrice valident)
BAT_RECEIVED ───────────────→ DESIGN_IN_PROGRESS        (BAT refusé)
BAT_VALIDATED ──────────────→ PRINTING
PRINTING ───────────────────→ RECEIVED
RECEIVED ───────────────────→ RECEPTION_CONTROLLED      (Céline contrôle)
RECEPTION_CONTROLLED ───────→ ACTIVE                    (conforme)
RECEPTION_CONTROLLED ───────→ DESIGN_IN_PROGRESS        (non conforme)
```

### Permissions par transition

| Transition | Rôles autorisés |
|-----------|----------------|
| → QUALITY_REVIEW | QUALITE |
| → QUALITY_VALIDATED | QUALITE (si aucun check FAIL) |
| → DESIGN_IN_PROGRESS | GRAPHISME |
| → DESIGN_REVIEW | GRAPHISME |
| → DESIGN_VALIDATED | QUALITE |
| → SENT_TO_PRINTER | ACHATS |
| → BAT_VALIDATED | QUALITE, GRAPHISME |
| → RECEPTION_CONTROLLED | CONDITIONNEMENT |
| → ACTIVE | QUALITE |

---

## StorageService (abstraction fichiers)

```typescript
// lib/storage/storage-service.ts
interface StorageService {
  upload(bucket: string, key: string, file: Buffer, contentType: string): Promise<string>;
  download(bucket: string, key: string): Promise<Buffer>;
  getUrl(bucket: string, key: string): Promise<string>;
  delete(bucket: string, key: string): Promise<void>;
  list(bucket: string, prefix: string): Promise<string[]>;
}
```

Buckets :
- `label-pdfs` — PDFs d'étiquettes générés par Fabrice
- `bat-files` — BAT reçus des imprimeurs
- `recipe-sheets` — Fiches recette Excel originales
- `tasting-sheets` — Fiches dégustation Word
- `illustrator-files` — Fichiers source .ai
- `reception-photos` — Photos contrôle réception (Céline)

Convention de clés : `{bucket}/{codePf}/{version}/{filename}`

---

## Variables d'environnement

```env
DATABASE_URL=postgresql://gaialabel:password@localhost:5432/gaialabel
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-xxx
STORAGE_TYPE=local                    # "local" ou "minio"
STORAGE_LOCAL_PATH=./storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
```
