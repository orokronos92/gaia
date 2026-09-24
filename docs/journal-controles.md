# Journal des contrôles d'étiquette

**Ouvert le** : 2026-09-24 — **Tenu par** : SPC

Ce journal suit **tous les contrôles** de GaïaLabel et leur évolution : ce qui existe, ce
qui a été ajouté ou modifié, pourquoi, et ce qui reste à faire. Il se lit avec :

- `docs/controles-definitions.md` : la définition détaillée de chaque point, mise en regard
  de PRO-QHS-013 et MOP-PRO-029 ;
- `docs/controles-etiquette.md` : la présentation des contrôles pour JDG.

**Comment le tenir.** Chaque changement d'un contrôle (ajout, nouvelle règle, correction de
faux écarts, changement de source de données) ajoute une ligne datée au §3, avec le produit
qui l'illustre et, quand il y en a une, la mesure faite sur le catalogue. L'inventaire du §1
est **généré** depuis le registre (`npx tsx scripts/generer-doc-controles.ts`) et ne s'édite
pas à la main.

---

## 1. Les points du registre (PRO-QHS-013)

Source : `src/lib/audit/control-checklist.ts`.

<!-- inventaire:debut -->
**45 points au registre** (20 code · fiche, 14 code · BAT, 7 modèle, 4 œil). † = conditionnel.

| Point | Rubrique | Ce qui est vérifié | Voie |
|---|---|---|---|
| 1.0 | Dénomination de la denrée | La dénomination légale décrit-elle objectivement le produit (état physique / traitement subi) ? | Modèle |
| 1.1 † | Dénomination de la denrée | Si dénomination « thé » : le produit contient-il ≥ 51 % de Camellia sinensis ? | Code · fiche |
| 1.2 † | Dénomination de la denrée | Arôme présent : la mention « aromatisé / goût / saveur » figure-t-elle en dénomination, conforme au tableau §1.2 ? | Modèle |
| 1.3 † | Dénomination de la denrée | La mention « parfumé » est-elle utilisée UNIQUEMENT pour une aromatisation par enfleurage ? | Modèle |
| 1.4 | Dénomination de la denrée | La dénomination figure-t-elle dans le même champ visuel que le poids net, en caractères droits et lisibles ? | Code · BAT |
| 1.5 | Dénomination de la denrée | La dénomination portée par la fiche figure-t-elle à l'identique sur le BAT ? | Code · BAT |
| 1.6 † | Dénomination de la denrée | Infusion : la dénomination légale est-elle l'un des noms usuels autorisés (tisane, infusion, mélange de plantes à infusion…) ? | Code · fiche |
| 2.1 | Liste des ingrédients | Le mot « ingrédients » précède-t-il la liste ? | Code · BAT |
| 2.2 | Liste des ingrédients | Les ingrédients sont-ils listés par ordre d'importance pondérale décroissante ? | Code · fiche |
| 2.3 | Liste des ingrédients | Mono-ingrédient : la liste est-elle correctement omise (dénomination = nom de l'ingrédient) ? | Code · fiche |
| 2.4 | Liste des ingrédients | Étoiles présentes (* bio / ** demeter) avec la mention de certification associée, demeter en gras italique ? | Code · BAT |
| 2.5 | Liste des ingrédients | La liste d'ingrédients de la fiche (recette étiquette, sinon base Excel) correspond-elle à celle imprimée sur le BAT ? | Code · BAT |
| 3.1 | QUID (pourcentages) | Un % est-il déclaré pour chaque ingrédient figurant en dénomination, mis en avant graphiquement, ou source de confusion ? | Code · fiche |
| 3.2 | QUID (pourcentages) | Règle d'arrondi respectée : % entiers (1ʳᵉ décimale 0-4 → inférieur, 5-9 → supérieur), pas de 0,5 si choisi (arôme < 1 % en sous-désignation) ? | Code · fiche |
| 3.3 | QUID (pourcentages) | Si total > 100 % du fait des arrondis, l'ajustement porte-t-il sur l'ingrédient le plus important ? | Code · fiche |
| 4.1 | Déclaration nutritionnelle | Le produit relève-t-il d'une catégorie exemptée (infusions, thés, mélanges sans modification de la valeur nutritionnelle) ? | Code · fiche |
| 4.2 | Déclaration nutritionnelle | Si l'aromatisation modifie la valeur nutritionnelle (ex. caramel) : la mention « Informations nutritionnelles moyennes pour 100 ml… » figure-t-elle ? | Code · fiche |
| 5.1 † | Particularités | Allergènes présents : mis en évidence (gras / souligné) et conformes à LIS-QHS-308 ? | Code · fiche |
| 5.2 † | Particularités | Allégation présente : valeurs nutritionnelles + mention « mode de vie sain… » + « consommation journalière conseillée : x tasses de 25 cl » (+ grammage sur logo tasse si ≠ 2 g) ? | Modèle |
| 5.3 † | Particularités | Réglisse présente : mention JDG « Contient de la réglisse – Les personnes souffrant d'hypertension doivent éviter toute consommation excessive » ? | Code · fiche |
| 6.1 | Quantité nette | Quantité nette exprimée en unité de masse (g ou kg) ? | Code · fiche |
| 6.2 | Quantité nette | Hauteur des chiffres conforme (2 mm si ≤ 50 g ; 3 mm si 50-200 g ; 4 mm si 200-1000 g ; 6 mm si > 1000 g), dans le même champ visuel que la dénomination ? | Code · BAT |
| 6.3 | Quantité nette | Le nombre de tasses annoncé correspond-il au poids net divisé par 2 g ? | Code · fiche |
| 7.1 | Conservation et mode d'emploi | Mode d'emploi présent si nécessaire (nb sachets/cuillères, température, durée), sans recours exclusif à des symboles ? | Code · BAT |
| 7.2 | Conservation et mode d'emploi | Mention JDG « À conserver à l'abri de l'humidité, de la lumière et de la chaleur » présente ? | Code · fiche |
| 8.1 | Origine géographique | Indication de l'origine des matières premières placée sous le code de l'organisme de contrôle, sous l'Eurofeuille ? | Code · BAT |
| 8.2 | Origine géographique | Mention « Agriculture UE / non UE / pays » cohérente avec ≥ 98 % des matières premières de cette origine ? | Modèle |
| 8.3 † | Origine géographique | Mention volontaire d'origine réservée à un produit contenant > 50 % de cette origine ? | Modèle |
| 9.1 | Fabricant | Adresse JDG complète (LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim + site web), sans code emballeur, sur l'étiquette ou le sachet non encollé ? | Code · fiche |
| 10.1 | Gencode | Code-barres IMPRIMÉ sur le BAT identique au Gencode déclaré en fiche ? | Œil |
| 11.1 | Métrologie | Le « e » métrologique est-il bien ABSENT (politique JDG) ? | Code · BAT |
| 12.1 | Pictogrammes | Triman présent, ≥ 1×1 cm (ou ≥ 0,6×0,6 cm si contrainte technique) ? | Œil |
| 12.2 | Pictogrammes | Cartouche Info-Tri complet (Triman + « le tri + facile » + éléments séparés par + + destination), règles de dématérialisation selon surface respectées ? | Œil |
| 13.1 | Labels | Eurofeuille présente, dimensions ≥ L 13,5 × H 9 mm (proportions 1/1,15), dans le même champ visuel que le code OC et l'origine ? | Code · BAT |
| 13.2 | Labels | Code de l'organisme de contrôle du dernier opérateur présent (FR-BIO-01) ? | Code · BAT |
| 13.3 | Labels | Autres labels (Savourez l'Alsace, Meilleur produit Bio, Fairtrade Max Havelaar, WFTO, Elephant Friendly, Fair for Life, Thés à la voile) justifiés par la matière première et correctement apposés ? | Modèle |
| 13.4 | Labels | Logo Point Vert bien ABSENT (interdit depuis le 01/01/2021, loi AGEC) ? | Œil |
| 13.5 † | Labels | Thé transporté à la voile : bandeau de gamme ET phrase du transporteur imprimés ensemble ? | Code · BAT |
| 13.6 † | Labels | Les Engagés : bandeau de sous-gamme ET ligne de don « 0,50 € reversés à … » imprimés ensemble ? | Code · BAT |
| 14.1 | Typographie | Hauteur de x des mentions obligatoires conforme à la face la plus grande (0,9 mm si < 80 cm² ; ≥ 1,2 mm si > 80 cm²) ? | Code · BAT |
| 15.1 | Code étiquette | Code étiquette présent sur la contre-étiquette ? | Code · fiche |
| 16.1 | Code article et Gencode | Le code produit porte-t-il un chiffre de conditionnement (1 à 7) ? | Code · fiche |
| 16.2 | Code article et Gencode | Le chiffre de conditionnement correspond-il au poids net déclaré ? | Code · fiche |
| 16.3 | Code article et Gencode | Le Gencode déclaré décode-t-il le même article et le même conditionnement, avec une clé valide ? | Code · fiche |
| 16.4 | Code article et Gencode | Le Gencode est-il porté par ce seul produit ? | Code · fiche |
<!-- inventaire:fin -->

## 2. Les vérifications lues sur le BAT

Le bouton « Contrôler l'étiquette » lit aussi le texte et le dessin du bon à tirer. Chacune
de ces vérifications répond à un point du registre, et sa réponse s'ajoute à la ligne de ce
point dans la liste de travail de la Qualité. Tenu à la main : à mettre à jour avec le §3.

| Vérification | Point | Ce qui est lu sur le BAT |
|---|---|---|
| TXT_DENOMINATION | 1.5 | La dénomination de la fiche, à l'identique |
| TYPO_DENOM_DROITE | 1.4 | La dénomination en caractères droits |
| MENT_INGREDIENTS | 2.1 | Le mot « ingrédients » devant la liste |
| MENT_COHERENCE_ETIQUETTE | 2.5 | La liste de la fiche face à la liste imprimée : recette étiquette ligne par ligne, sinon liste de l'Excel ingrédient par ingrédient. **Seuls les écarts s'affichent** |
| MENT_ETOILES, TXT_DEMETER, TYPO_DEMETER_STYLE | 2.4 | Étoiles bio / Demeter, leur mention, « demeter » en gras italique |
| TXT_ALLERGENES, TXT_ALLERGENE_CONTIENT, TYPO_ALLERGENE_EVIDENCE | 5.1 | Allergènes présents et mis en évidence |
| TXT_ALLEG_MODE_VIE, TXT_ALLEG_TASSES, TXT_ALLEG_NUTRI | 5.2 | Les trois mentions qui accompagnent une allégation |
| TXT_REGLISSE | 5.3 | L'avertissement réglisse / hypertension |
| TXT_POIDS_NET | 6.1 | Le poids net |
| TYPO_HAUTEUR_CHIFFRES | 6.2 | La hauteur des chiffres du poids net |
| MENT_MODE_EMPLOI | 7.1 | Le mode d'emploi rédigé |
| TXT_CONSERVATION, TXT_CONSERVATION_OUVERTURE | 7.2 | Les mentions de conservation |
| MENT_ORIGINE | 8.2 | « Agriculture UE / non UE » |
| TXT_FABRICANT | 9.1 | L'adresse du fabricant |
| MENT_SIGNE_ESTIME | 11.1 | L'absence du « ℮ » |
| TYPO_DEMAT_INFOTRI | 12.2 | Le cartouche Info-Tri |
| VEC_EUROFEUILLE | 13.1 | L'Eurofeuille et ses dimensions |
| MENT_CODE_OC | 13.2 | Le code de l'organisme de contrôle |
| TXT_WFTO | 13.3 | La mention et l'adresse WFTO |
| TXT_ANEMOS | 13.5 | La mention Anemos |
| TXT_ENGAGES | 13.6 | La mention Les Engagés |
| TYPO_HAUTEUR_X | 14.1 | La hauteur de x des mentions obligatoires |
| TXT_CODE_ETIQUETTE, PROP_CODE_ETIQUETTE | 15.1 | Le code étiquette |
| TYPO_EXEMPTION_NUTRI | 4.1 | Ce qui annule l'exemption de tableau nutritionnel |
| Pictogrammes (modèle de vision) | 12.x, 13.x | Logos et pictogrammes, avec contre-examen |

## 3. Journal

Du plus récent au plus ancien. Les entrées antérieures au 2026-09-24 sont reconstituées
depuis l'historique git.

| Date | Contrôle | Évolution | Exemple / mesure |
|---|---|---|---|
| 2026-09-24 | 2.4, 9.1, références | **Lot A de la mise à jour PRO-QHS-313 v2.** 2.4 : la note ** Demeter exigée et proposée à la fiche est désormais « demeter est le label des produits issus de l'agriculture biodynamique » (cahier des charges Demeter France 2025 §4.3.1, PRO-QHS-313 §2.1) ; l'ancienne exigence (« la marque… certifiée », encadré §11.1) aurait signalé à tort les 14 BAT qui impriment la bonne formulation. 9.1 : l'adresse absente de l'étiquette n'est plus « à vérifier » — elle figure sur le sachet non encollé (§7). Références : PRO-QHS-013 → PRO-QHS-313, LIS-QHS-008 → LIS-QHS-308, annexes supprimées retirées ; libellés 9.1 et 13.3 (nouvelle liste des autres labels) à jour. | 394 produits : aucun verdict changé ; 385 cartes 9.1 perdent leur « adresse non retrouvée ». Le 2.4 Demeter ne se déclenche qu'avec une recette : aucune en préprod, l'effet se verra à la réintégration. |
| 2026-09-24 | 3.2 et calculateur QUID | **Arrondi au pas de 1 par défaut** (PRO-QHS-313 v2 §2.2 : QUID « sans chiffre après la virgule »). Le pas de 0,5 reste au sélecteur de la calculatrice : la procédure le garde pour les arômes de sous-désignation < 1 %, et Marie s'en sert dans d'autres cas. Le contrôle 3.2 accepte les deux pas ; l'attendu qu'il affiche en cas d'écart est au pas de 1. Décision d'Ouro. | ~11 listes de l'Excel ont un % à virgule hors 0,5 (TJ2167 « 49,5 % », TA7331 « 3,5 % ») |
| 2026-09-24 | Tous les points en écart | **Les issues d'un écart, sur la carte.** Un point en non-conformité prouvée offre quatre gestes : **Corriger la fiche** (sur le 2.5 quand la liste vient de l'Excel : la liste s'édite sur place, avant / après tracés dans `audit_logs`), **BAT à refaire** (renvoi au Graphisme, note facultative), **Arbitrer l'écart** (l'ancienne dérogation, motif obligatoire, clôt le point), **En attente d'info** (quoi et de qui, obligatoire). « BAT à refaire » et « En attente » gardent la ligne ouverte avec un badge qui dit qui la tient ; si l'écart change (nouveau BAT, fiche corrigée), le badge se déclare périmé, et disparaît si l'écart est réglé. Les alertes (non prouvées) gardent « Marquer vérifié ». Migration 0032. | Vérifié à l'écran sur `TA6942` : correction « fleurs → rose » ⇒ 2.5 vérifié ; « BAT à refaire » ⇒ badge violet ; test retiré et liste d'origine restaurée ensuite. `issues-ecart.tsx`, `src/lib/audit/decisions.ts` |
| 2026-09-24 | 2.5 | **Un seul point pour la liste, et un face-à-face qui ne montre que les écarts.** TXT_INGREDIENTS (hors registre) est supprimé : sans recette, le 2.5 compare la liste de l'Excel à la liste lue sous « INGRÉDIENTS » sur le BAT, ingrédient par ingrédient. La carte affiche un tableau fiche / étiquette limité aux lignes qui divergent (remplacé, absent, en plus, ordre changé), le nombre d'ingrédients identiques, et un repère sur le BAT pour chaque écart. Liste illisible sur le BAT → « à comparer à l'œil » ; ni recette ni liste → « à compléter ». Les mots de la colonne voisine glissés dans la liste par la lecture du PDF sont écartés. | 332 BAT lisibles : **279 identiques, 36 avec écarts, 17 sans liste en texte**. Les 36 écarts relus un par un sont tous réels (dont 8 « wulong » / « wu long »). `TA6942` : fiche « pétales de fleurs* », étiquette « pétales de rose* ». `src/lib/audit/visual/comparaison-liste.ts`, `coherence-liste.ts` |
| 2026-09-24 | TXT_INGREDIENTS | **Liste de l'Excel comparée proprement au BAT.** L'en-tête « Ingrédients : », la note « *Issu de l'agriculture biologique », les paragraphes suivants et les virgules entre parenthèses ne sont plus pris pour des ingrédients ; apostrophes ’ et ' confondues ; virgule sans espace (« tilleul*,mélisse* ») découpée. Une case qui porte une seconde liste est signalée, seule la première est comparée. | 394 produits avec BAT : **avant 269 écarts, après 48** (284 conformes, 62 BAT sans texte lisible). Des 48 : 22 vrais écarts (questions K1–K3), 16 BAT sans liste en texte (K5), 10 mises en page mêlées FR/EN. `src/lib/audit/visual/elements-liste.ts` |
| 2026-09-23 | Tous ceux qui lisent la liste | **La liste de l'Excel sert quand il n'y a pas de recette** (migration 0031). La recette étiquette reste prioritaire dès qu'elle est intégrée. Concerne TXT_INGREDIENTS, 5.3 réglisse, 4.1 exemption nutritionnelle, TYPO_ALLERGENE_EVIDENCE. Les QUID (3.x) restent sans objet sans recette. | 822 listes JDG. `TR2202` |
| 2026-09-10 | 2.4, 13.5, 13.6 | Les trois zones de mention (Demeter, Anemos, Les Engagés) branchées sur l'audit ; statut AUTO / OUI / NON décidé par la Qualité (migration 0018) ; la gamme déclare ce qu'elle exige. | 42 → 44 points |
| 2026-09-10 | 2.5 | Cohérence recette étiquette ↔ BAT, ligne par ligne. | 44 → 45 points |
| 2026-09-10 | Hors registre | Un constat hors registre se clôt comme un autre point et compte dans « reste à faire ». | |
| 2026-09-09 | Sept points | Ajout des sept contrôles demandés par la procédure et jamais exécutés ; cinq mentions obligatoires lues sur le BAT. | 35 → 42 points |
| 2026-09-08 | 10.x, 15.1 | Code article et Gencode contrôlés selon MOP-PRO-029 ; clic sur un contrôle = zone exacte sur le BAT ; l'audit BAT remplit la liste de travail de Marie au lieu de la doubler. | |
| 2026-06-18 | 3.x QUID | Pourcentages masqués (secret de fabrication) pris en compte. | |
| 2026-06-10 | Audit BAT | Robot texte (comparaison déterministe BAT ↔ fiche) et robot visuel (PDF envoyé tel quel au modèle). L'allégation quitte le robot texte. | |
| 2026-06-09 | Registre | Création du registre des 35 points et de ses voies (code, BAT, modèle, œil) ; 5.1 recoupé avec les matières premières. | 35 points |

## 4. Limites connues et pistes

- ~~TXT_INGREDIENTS ne voit ni l'ordre ni l'ingrédient en plus ; il est hors registre.~~
  Réglé le 2026-09-24 par le face-à-face du 2.5.
- **Avec une recette étiquette, le 2.5 garde sa lecture mot à mot** (dénominations relues ou
  non) : il n'a pas encore le face-à-face. À aligner quand des recettes seront réintégrées.
- **17 BAT portent le texte sans la liste lisible** (titre vectorisé, ex. `TA6952`) : le 2.5
  renvoie à l'œil.
- **Lot 4 suspendu (2026-09-24)** : Marie a rédigé un nouveau PRO-QHS-013 après la visite
  d'Ouro ; les contrôles vont changer. État des lieux fait sur 394 produits avant l'arrêt :
  les cartes en écart les plus lourdes sont 14.1 (76), 13.1 (71), 6.2 (42), 16.4 (24),
  16.3 (12), 16.2 (10) ; le 6.2, le 2.4 et le 1.4 mêlent un sous-constat conforme à l'écart ;
  le 1.5 (77 « à vérifier ») ne dit ni ce que porte la fiche ni ce qu'imprime le BAT. Pistes
  proposées : masquer les sous-constats conformes, face-à-face mesuré / exigé, face-à-face
  fiche / fiche avec correction sur place. À reprendre sur le nouveau document.
- **Les BAT à refaire ne sont pas encore listés pour le Graphisme** : le badge vit sur la
  carte de chaque fiche. Une vue « BAT à refaire » pour Fabrice reste à faire.
- **« Corriger la fiche » n'existe que pour la liste du 2.5** : les autres cartes (dénomination,
  poids net, mentions) n'ont pas encore l'édition sur place — lot 4.
- **62 BAT sans texte lisible** (vectorisés ou images) : le robot texte ne dit rien, seule la
  vision peut lire.
- **Mise en page en colonnes** : la lecture du PDF peut glisser un mot de la colonne voisine
  dans la liste (`TUTA6152`). Les mots en majuscule hors de place sont écartés ; un mot en
  minuscule d'une autre colonne produirait encore un faux écart (aucun cas mesuré).
