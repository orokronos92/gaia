# PRD-02 — Design System & Écrans UI

## Philosophie

**GaïaLabel est un outil de travail, pas un site vitrine.** Le site jardinsdegaia.com est pour les clients (séduction). GaïaLabel est pour l'équipe (efficacité, clarté). On emprunte l'identité de la marque (couleurs, esprit nature) mais on la traduit en langage "outil pro" : épuré, dense en information, zéro décoration inutile.

**Exception unique** : l'écran d'authentification est immersif et visuel, raccord avec l'univers Gaïa. C'est la porte d'entrée — il a le droit d'être beau. Tous les autres écrans sont fonctionnels.

---

## Palette de couleurs

### Couleurs CSS (variables globales)

```css
:root {
  /* Primaires — structure */
  --green-forest: #2B5F3A;      /* sidebar, headers, boutons primaires */
  --green-dark: #1E3F28;        /* sidebar bg, texte titres hover */
  --beige-warm: #FAF6F0;        /* fond de page principal */

  /* Secondaires — accents */
  --green-sage: #7A9E7E;        /* bordures, icônes secondaires */
  --brown-earth: #8B6F47;       /* accents, liens hover */
  --cream: #F0EBE0;             /* cards background alternatif */

  /* Sémantiques — statuts */
  --orange-gaia: #D4722A;       /* warning, en cours */
  --red-soft: #C94A3F;          /* erreur, FAIL */
  --green-valid: #3D8B4F;       /* succès, PASS */
  --blue-info: #4A7FB5;         /* information, neutre */

  /* Neutres */
  --text-primary: #1A1A1A;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  --border: #E5E7EB;
  --border-light: #F3F4F6;
  --white: #FFFFFF;
}
```

### Badges de statut

| Statut | Background | Texte | Bordure |
|--------|-----------|-------|---------|
| PASS / Validé | `#E8F5E9` | `#2E7D32` | `#A5D6A7` |
| FAIL / Erreur | `#FFEBEE` | `#C62828` | `#EF9A9A` |
| WARNING / Attention | `#FFF3E0` | `#E65100` | `#FFCC80` |
| PENDING / En attente | `#E3F2FD` | `#1565C0` | `#90CAF9` |
| DRAFT | `#F3F4F6` | `#6B7280` | `#E5E7EB` |
| ACTIVE | `#E8F5E9` | `#2B5F3A` | `#A5D6A7` |

### Badges de labels

| Label | Background | Texte |
|-------|-----------|-------|
| AB | `#E8F5E9` | `#2B5F3A` |
| WFTO | `#E3F2FD` | `#1565C0` |
| Demeter | `#FFF3E0` | `#E65100` |
| MH (Max Havelaar) | `#E3F2FD` | `#1565C0` |
| Wild Trust | `#E8F5E9` | `#2E7D32` |
| IGP Darjeeling | `#FFF3E0` | `#8B6F47` |
| Elephant Friendly | `#E8F5E9` | `#2E7D32` |

---

## Typographie

```
TITRES & NAVIGATION
  Font    : "DM Serif Display" (Google Fonts)
  Usage   : titre page auth, grands titres dashboard, chiffres KPI
  Import  : https://fonts.googleapis.com/css2?family=DM+Serif+Display

CORPS & INTERFACE
  Font    : "DM Sans" (Google Fonts, poids 300/400/500/600)
  Usage   : tout le reste — labels, données, boutons, menus, paragraphes
  Sizes   : 12px (badge), 13px (dense/tableaux), 14px (corps standard),
            15px (labels importants), 18px (sous-titres), 24px (titres pages)
  Import  : https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600

DONNÉES TECHNIQUES
  Font    : "JetBrains Mono" (Google Fonts, poids 400/500)
  Usage   : codes produit (MT265), codes EAN, codes étiquette (ETMT265V1),
            pourcentages, versions, numéros de commande
  Size    : 12-13px
  Import  : https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500
```

---

## Composants de base (shadcn/ui + Tailwind)

### Cards

```
Background  : white (#FFFFFF)
Border      : 1px solid var(--border)
Radius      : 8px (rounded-lg)
Shadow      : shadow-sm (0 1px 3px rgba(0,0,0,0.06))
Padding     : p-5 (20px standard), p-4 (16px compact)
Hover       : border-color change + translateY(-1px) + shadow-md (si cliquable)
```

### Boutons

```
Primary     : bg-[#2B5F3A] text-white hover:bg-[#1E3F28]
              rounded-lg px-4 py-2.5 font-medium text-sm
Secondary   : bg-white border border-[#2B5F3A] text-[#2B5F3A]
              hover:bg-[#F0EBE0]
Danger      : bg-[#C94A3F] text-white hover:bg-[#B03A30]
Ghost       : bg-transparent text-[#4B5563] hover:bg-[#F0EBE0]
Disabled    : opacity-50 cursor-not-allowed
```

### Tables

```
Header bg       : bg-[#F8F6F2] (beige très léger)
Header text     : text-xs font-semibold text-[#6B7280] uppercase tracking-wider
Row hover       : hover:bg-[#FAF6F0]
Row border      : border-b border-[#F3F4F6]
Cell padding    : px-4 py-3 (standard), px-3 py-2 (dense)
Dense font      : text-[13px]
Monospace cells : font-mono text-[12px] (pour les codes)
```

### Inputs

```
Border      : border border-[#D1D5DB] rounded-md
Focus       : ring-2 ring-[#2B5F3A]/20 border-[#2B5F3A]
Height      : h-9 (36px standard), h-8 (32px compact)
Font        : text-sm
Placeholder : text-[#9CA3AF]
```

---

## Layout global

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (fixe, w-60 = 240px, collapsible → w-16 = 64px)   │
│  bg: var(--green-dark) = #1E3F28                            │
│  ┌───────────────────┐  ┌────────────────────────────────┐  │
│  │  Logo GaïaLabel   │  │  HEADER (sticky top, h-14)     │  │
│  │                   │  │  bg: white, border-b            │  │
│  │  ─────────────    │  │  Breadcrumb · ⌘K search · 🔔   │  │
│  │                   │  │  User avatar + rôle             │  │
│  │  📊 Dashboard     │  ├────────────────────────────────┤  │
│  │  📦 Produits      │  │                                │  │
│  │  🏷️ Étiquettes    │  │  CONTENU (scroll)              │  │
│  │  📋 Recettes      │  │  bg: var(--beige-warm)         │  │
│  │  🖨️ Commandes     │  │  padding: 32px                 │  │
│  │                   │  │                                │  │
│  │  ─────────────    │  │                                │  │
│  │  ⚙️ Paramètres    │  │                                │  │
│  │  👤 {User + rôle} │  │                                │  │
│  └───────────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar

- Fond `#1E3F28`, texte `rgba(255,255,255,0.85)`
- Logo : icône 32px carrée bg `rgba(255,255,255,0.15)` + texte "GaïaLabel" en DM Serif Display 17px blanc
- Items : icônes Lucide React 18px + label 13.5px
- Item actif : bg `#2B5F3A` + bordure gauche 3px blanche
- Badges numériques : fond `rgba(255,255,255,0.15)`, font mono 11px. Exception : badge Conformité en rouge `#C94A3F` si alertes
- User info en bas : avatar cercle 32px bg `#2B5F3A` + nom + rôle + bouton logout

### Header

- bg white, border-bottom `#E5E7EB`, h-14 (56px), sticky top-0 z-50
- Gauche : breadcrumb (ex: "Dashboard · Février 2026")
- Centre : barre recherche `⌘K` (input avec icône loupe, placeholder "Rechercher...")
- Droite : cloche notification (pastille rouge si non lues) + avatar utilisateur

---

## Écrans détaillés

### Écran 0 — Authentification (immersif)

**C'est le seul écran décoratif.** Pas de sidebar, pas de header. Plein écran.

```
┌──────────────────────────────┬─────────────────────────┐
│    PANNEAU GAUCHE (55%)      │   PANNEAU DROIT (45%)   │
│                              │                         │
│    Photo plein cadre :       │   Logo GaïaLabel        │
│    plantation de thé ou      │   (icône + "GaïaLabel") │
│    feuilles en macro         │                         │
│                              │   Sous-titre :          │
│    Overlay gradient :        │   "Gestion des          │
│    vert foncé 75% →          │    étiquettes"          │
│    transparent → 85%         │                         │
│                              │   ─────────             │
│    Grain/noise overlay       │                         │
│    subtil (opacity 0.03)     │   h2 "Bienvenue"       │
│                              │   (DM Serif Display     │
│    Feuilles SVG flottantes   │    28px #1A1A1A)        │
│    (animation lente, op 0.1) │                         │
│                              │   p "Connectez-vous..." │
│    ─── En bas ───            │                         │
│                              │   [Email input]         │
│    Arbre SVG (watermark)     │   [Password input]      │
│    "Les Jardins de Gaïa"     │   ☐ Se souvenir         │
│    (DM Serif 38px blanc)     │   [Mot de passe oublié] │
│                              │                         │
│    "Depuis 1994, pionniers   │   [Se connecter]        │
│     du thé bio et équitable" │   (btn primary pleine   │
│    (16px blanc 0.7)          │    largeur)             │
│                              │                         │
│    Stats : 800+ réf ·        │   ── zone démo ──       │
│    5 langues · Bio & Équit.  │   Boutons accès rapide  │
│    (12px blanc 0.5 uppercase)│   par utilisateur       │
│                              │   (Marie, Fabrice,      │
│                              │    Céline, Pascal,      │
│                              │    Karrame, Victor)     │
└──────────────────────────────┴─────────────────────────┘
```

**Photo** : utiliser Unsplash (plantation thé, ex: `photo-1564890369478-c89ca6d9cde9`).
**Animation** : ken burns lent sur la photo (scale 1→1.08 en 25s alternate), fadeInUp sur le formulaire (0.8s delay 0.3s).
**Mobile** : photo en bandeau top 30vh, formulaire dessous.

---

### Écran 1 — Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  "Bonjour, {nom}" (DM Serif 26px)                         │
│  "Voici un aperçu de votre espace de travail." (14px gris)│
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ 8        │ │ 3        │ │ 14       │ │ 5        │     │
│  │ Fiches   │ │ Alertes  │ │ PDFs à   │ │ Commandes│     │
│  │ en att.  │ │ critiques│ │ vérifier │ │ en cours │     │
│  └──cliquab.┘ └──cliquab.┘ └──cliquab.┘ └──cliquab.┘     │
│                                                            │
│  ┌── MES TÂCHES (grid 1fr 340px) ──┬── ACTIVITÉ ─────┐   │
│  │                                  │                  │   │
│  │  Chaque tâche :                  │  Chaque entrée : │   │
│  │  ● pastille couleur              │  avatar cercle   │   │
│  │  [MT265] code mono vert          │  {nom} a {action}│   │
│  │  Nom produit (500)               │  {cible} en vert │   │
│  │  Description tâche (400 gris)    │  il y a {temps}  │   │
│  │  Durée en mono (gris clair)      │                  │   │
│  │                                  │                  │   │
│  │  [Voir toutes mes tâches →]      │  [Tout voir →]   │   │
│  ├──────────────────────────────────┴──────────────────┘   │
│  │  DÉLAIS IMPRIMEURS (optionnel, visible rôle Direction)  │
│  │  Marketing  ████████░░ 65%  ⚠️                          │
│  │  Achats     █████████░ 91%  ✅                          │
│  └─────────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

- KPIs : chiffre en DM Serif Display 32px couleur sémantique, icône ronde à droite avec pastille, label 13px gris dessous. Cards blanches avec hover border-color + translateY(-2px).
- Tâches filtrées par rôle connecté (Marie = fiches qualité, Fabrice = PDF à créer, etc.)
- Chaque tâche : pastille couleur (orange=alerte, gris=normal) + code produit en badge mono vert + nom + description + durée.
- Activité : avatar coloré initiale + texte structuré + temps relatif.
- Animation staggered fadeInUp sur les cards (delay 0.1s × index).

---

### Écran 2 — Liste produits

```
┌────────────────────────────────────────────────────────────┐
│  "Produits" (24px)                           [+ Nouveau]   │
│                                                            │
│  🔍 Rechercher (code, nom, ingrédient...)    [Filtres ▼]  │
│  Filtres actifs : [Gamme: Bienfaitrices ×] [Avec allég. ×]│
│                                                            │
│  TABLE DENSE (row h-12, text-[13px])                       │
│  ┌───────┬──────────────┬──────────┬──────┬───────┬──────┐│
│  │ Code  │ Dénomination │ Type     │Gamme │Labels │Statut││
│  │ (mono)│              │          │      │(badges│      ││
│  │       │              │          │      │ color)│      ││
│  ├───────┼──────────────┼──────────┼──────┼───────┼──────┤│
│  │MT2622 │ Maté épices  │Inf.parf. │Bienf.│AB WFTO│🟢 Act││
│  │MT265  │ Maté sportif │Mél.plant.│Bienf.│AB MH W│🟡 Dra││
│  │TB4041 │ Ché Chun     │Thé blanc │Gr.Cr.│AB W WT│🟢 Act││
│  └───────┴──────────────┴──────────┴──────┴───────┴──────┘│
│                                                            │
│  1-50 sur 802  [◀ 1 2 3 ... 17 ▶]     [📥 Exporter Excel] │
└────────────────────────────────────────────────────────────┘
```

- Recherche full-text (debounce 300ms) sur code, nom, ingrédients.
- Filtres multi-select : gamme, sous-gamme, type thé, labels, statut, aromatisé (oui/non), allégation (oui/non).
- Pagination : 50 lignes par page.
- Tri cliquable sur chaque colonne.
- Clic ligne → ouvre fiche produit `/produits/[code]`.
- Colonne "Allég." avec icône ⚠️ orange si allégation présente.
- Export Excel : format identique BDD actuelle (mêmes colonnes, même ordre).

---

### Écran 3 — Fiche produit

**L'écran le plus dense.** Header produit fixe + système de 5 onglets.

#### Header produit (toujours visible)

```
┌────────────────────────────────────────────────────────────┐
│  ← Produits / MT265                                        │
│  ┌────────────────────────────────────────────────────┐   │
│  │  "MATÉ SPORTIF" (DM Serif 22px)         MT265 (mono)│  │
│  │  Mélange de plantes aromatisé · Bienfaitrices       │  │
│  │  Création maison                                    │  │
│  │                                                     │  │
│  │  [AB] [WFTO] [MH] (badges labels)                  │  │
│  │                                                     │  │
│  │  Statut: [🟡 En vérification]   Assigné: Marie      │  │
│  │  [Valider ▼]  [Historique]                          │  │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [ÉTIQUETTE] [RECETTE] [CONFORMITÉ] [COMMANDES] [HISTO.]  │
└────────────────────────────────────────────────────────────┘
```

#### Onglet ÉTIQUETTE

Sections empilées verticalement, chacune dans une card :

**Section "Identité" + "Paramètres infusion"** (2 colonnes)
- Gauche : dénomination FR, sous-désignation FR, dénomination EN, type thé FR, origine, code EAN, code étiquette
- Droite : poids net, infusion (durée), température, poids/tasse, nb tasses, plusieurs infusions, conditionnement

**Section "Texte commercial FR"** (textarea, compteur 300 caractères)

**Section "Texte commercial EN"** (textarea, compteur 300 caractères)

**Section "Liste d'ingrédients FR"** (textarea, fond légèrement beige pour distinguer)

**Section "Liste d'ingrédients EN"** (textarea)

**Section "Allégations santé FR"** (textarea, fond orange très léger `#FFF8F0` si allégation présente)

**Section "Labels & mentions"** — Ecocert, phrase WFTO, conservation, fabricant

**Section "Fichiers attachés"** — Liste des PDF, BAT, source Illustrator avec aperçu et téléchargement

**Édition inline** : clic sur un champ → passe en mode édition. Icône 🔒 sur les champs non éditables par le rôle connecté. Save : ✓ ou Ctrl+S.

#### Onglet RECETTE

**Tableau d'ingrédients** avec colonnes :
- Code article (mono) | Ingrédient | Demeter (checkbox) | Commerce Équitable (checkbox) | Qty kg | % réel (calculé auto) | % étiquette (arrondi auto, éditable)

**Ligne total** en bas : fond vert si somme=100.0%, fond rouge si ≠.

**Message d'ajustement** sous le tableau : "Contrôle arrondis : ✅ Somme = 100.0% — Ajustement appliqué sur : Maté vert (-0.2%)"

**Bouton [📥 Importer]** : upload fichier Excel recette existant.

**Bouton [Recalculer les arrondis]** : réapplique les règles.

#### Onglet CONFORMITÉ

**Section "Contrôles automatiques"** : tableau de checks avec colonnes Contrôle | Statut (badge) | Détail.

Checks listés :
- Arrondis (Σ = 100%)
- Dénomination légale
- QUID (% affichés)
- Allégation santé
- Allergènes
- Réglisse
- Labels vs ingrédients
- Info-tri / Triman
- Taille caractères

Chaque check expandable (clic → détail avec explication + boutons [Justifier] / [Corriger]).

**Section "Audit IA"** : bouton [🤖 Lancer audit IA], résultat affiché dans une card avec texte structuré + rapport complet accessible.

#### Onglet COMMANDES

Timeline horizontale par commande :
- Barres de progression par étape (Analyse → Envoi externe → Commande → BAT → Impression → Réception)
- Chaque barre : durée réelle / durée cible, couleur vert/orange/rouge
- Boutons d'action : [Voir BAT] [Valider BAT] [Refuser BAT]

#### Onglet HISTORIQUE

Fil chronologique inversé :
- Date + heure + icône (avatar user ou 🤖 IA)
- Action : "Marie — Statut → En vérification"
- Détail diff si modification de champ : ancien → nouveau
- Filtrable par type d'action

---

### Écran 4 — Pipeline étiquettes

Deux vues switchables : **Kanban** et **Liste**.

#### Vue Kanban

4 colonnes = Qualité | Graphisme | Impression | Réception

Chaque card :
```
┌──────────────┐
│ MT265        │  ← code mono
│ Maté sportif │  ← nom
│              │
│ ⚠️ Allég.    │  ← badge alerte si applicable
│ Marie · 2j   │  ← assigné + durée dans l'étape
└──────────────┘
```

Card cliquable → ouvre fiche produit.

#### Vue Liste

Tableau avec : Code | Nom | Statut détaillé | Assigné | Depuis | Alertes | Actions.

---

### Écran 5 — Comparaison Excel ↔ PDF

```
┌────────────────────────────────────────────────────────────┐
│  "Comparaison — MT265 Maté Sportif"              v1 → PDF │
│                                                            │
│  Résultat : 12/15 champs OK · 2 différences · 1 alerte    │
│                                                            │
│  3 COLONNES :                                              │
│  ┌── FICHE (source) ──┬── DIFF ──┬── PDF (extrait) ───┐  │
│  │                     │          │                     │  │
│  │ Champ par champ     │ ✅ =     │ Champ par champ     │  │
│  │ avec données de     │ ❌ DIFF  │ avec données        │  │
│  │ la fiche étiquette  │ ⚠️ WARN  │ extraites du PDF    │  │
│  │                     │ + MANQ.  │                     │  │
│  │                     │ + AJOUTÉ │                     │  │
│  └─────────────────────┴──────────┴─────────────────────┘  │
│                                                            │
│  📄 [Voir PDF complet]                                     │
│  [✅ Tout valider]              [📝 Demander modification]  │
└────────────────────────────────────────────────────────────┘
```

- Diff textuel : surlignage vert (ajouté dans PDF), rouge (différent/supprimé), orange (warning).
- Champs comparés : dénomination, ingrédients + %, allergènes, allégations, poids, infusion, EAN, labels, code étiquette, mentions légales.
- PDF viewable en panneau latéral ou modal.
- "Demander modification" → formulaire commentaire → notification Fabrice.

---

### Écran 6 — Commandes & délais

```
┌────────────────────────────────────────────────────────────┐
│  "Commandes d'impression"                    [+ Nouvelle]  │
│                                                            │
│  STATS MOIS :                                              │
│  Marketing: 14/24 (58%) ⚠️  |  Achats: 22/24 (92%) ✅     │
│                                                            │
│  TABLE :                                                   │
│  # | Produit | Imprimeur | BAT (j/cible) | Print | Statut │
│  Chaque cellule de délai colorée vert/orange/rouge         │
└────────────────────────────────────────────────────────────┘
```

---

### Écran 7 — Import dégustation + recette

```
┌────────────────────────────────────────────────────────────┐
│  "Nouvelle fiche étiquette"                                │
│                                                            │
│  ÉTAPE 1 — Importer les documents                          │
│  ┌───────────────────┐  ┌───────────────────┐             │
│  │ 📄 Fiche dégust.  │  │ 📊 Fiche recette  │             │
│  │ Glisser .docx     │  │ Glisser .xlsx     │             │
│  │ ou [Parcourir]    │  │ ou [Parcourir]    │             │
│  │ ✅ FD_MT265.docx   │  │ ✅ MT165.xlsx      │             │
│  └───────────────────┘  └───────────────────┘             │
│                                                            │
│  [Analyser et pré-remplir la fiche →]                      │
│                                                            │
│  ÉTAPE 2 — Résultat de l'analyse                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🤖 Analyse terminée — 24 champs pré-remplis          │ │
│  │ Code: MT265 · Désignation: Maté sportif              │ │
│  │ Type: Mélange de plantes aromatisé                   │ │
│  │ 8 ingrédients · Arrondis ✅ 100.0% · ⚠️ Allégation    │ │
│  │ Labels: AB, MH, WFTO                                │ │
│  │ ⚠️ 2 points d'attention à vérifier                    │ │
│  └──────────────────────────────────────────────────────┘ │
│  [Ouvrir la fiche pré-remplie pour vérification →]         │
└────────────────────────────────────────────────────────────┘
```

- Zones drag & drop avec état : vide → fichier déposé → uploadé ✅.
- Bouton "Analyser" : spinner pendant le traitement (parsing + IA).
- Résultat : résumé des champs extraits + alertes, dans une card avec fond beige.
- Clic "Ouvrir" → redirige vers la fiche produit pré-remplie en mode édition.

---

## Responsive

```
Desktop  (>1280px) : Layout complet, sidebar ouverte 240px
Tablet   (768-1280): Sidebar collapsée 64px (icônes), contenu pleine largeur
Mobile   (<768px)  : Sidebar = drawer (hamburger), tables → mode cards empilées
```

Usage mobile principal : Céline au conditionnement (tablette/téléphone pour photos et contrôle réception).

---

## Ordre de développement des écrans

| Priorité | Écran | Fichier | Justification |
|----------|-------|---------|---------------|
| 1 | Auth | `(auth)/login/page.tsx` | Première impression + nécessaire pour tout |
| 2 | Layout | `(dashboard)/layout.tsx` | Structure sidebar + header |
| 3 | Liste produits | `produits/page.tsx` | Écran le plus utilisé |
| 4 | Fiche produit — Étiquette | `produits/[code]/page.tsx` | Cœur du travail Marie |
| 5 | Fiche produit — Recette | même page, onglet | Arrondis et ingrédients |
| 6 | Import dégustation+recette | `produits/[code]/import/page.tsx` | Premier gain de temps Marie |
| 7 | Fiche produit — Conformité | même page, onglet | Contrôles automatiques |
| 8 | Pipeline kanban | `etiquettes/page.tsx` | Vue workflow |
| 9 | Comparaison Excel↔PDF | `etiquettes/[id]/comparaison/page.tsx` | Agent IA clé |
| 10 | Dashboard | `(dashboard)/page.tsx` | Synthèse (besoin des autres) |
| 11 | Commandes & délais | `commandes/page.tsx` | Moins critique |
| 12 | Historique | onglet dans fiche | Traçabilité |
