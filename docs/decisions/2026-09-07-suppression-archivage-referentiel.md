# Journée du 7 septembre 2026 — reprise de session

> Démo client **vendredi 11 septembre 2026**. Cette journée était consacrée aux
> points noirs, pas aux nouvelles fonctionnalités. Treize commits sur
> `gaia_epsilon`, tous déployés en production.

---

## 1. Le point noir qui reste, et il est le plus lourd

**L'audit BAT n'a toujours pas été validé sur le remplacement de `pixtral-large`
par `mistral-medium`.**

Rappel : `pixtral-large` a été retiré du catalogue Mistral. Or une décision de
juin, consignée en mémoire, disait que `mistral-medium` **avait halluciné un logo
AB** et que c'était pour ça que `pixtral` avait été retenu. Le robot visuel tourne
donc aujourd'hui sur le modèle écarté.

Le garde-fou (contre-examen adverse) ne se déclenche que sur les verdicts
négatifs — `audit-visuel.ts:118-120`. **Un logo obligatoire déclaré présent à tort
n'est jamais relu**, et c'est exactement le mode d'échec observé.

Une demande d'expertise externe est prête, non exploitée :
`docs/2026-09-07-demande-expertise-bat-TA7372.md`, avec les deux BAT exportés
dans `/docker/gaialabel/exports/TA7372/`.

**C'est le premier sujet à reprendre.**

---

## 2. Trois niveaux de retrait, à ne pas confondre

C'est le modèle qui a demandé le plus d'allers-retours. Il est maintenant fixé.

| Notion | Portée | Effet | Retour | Champ |
|---|---|---|---|---|
| **Retiré du catalogue** | Produit | Sort du catalogue, du pipeline, des compteurs | **Oui**, un clic | `produits.retire_le` |
| **Supprimé** | Produit | Sort de l'application, archivé | **Non**, jamais dans l'app | `produits.archive_le` |
| **Plus produite** | Étiquette | Ce visuel n'est plus imprimé | Liste déroulante | `StatutEtiquette.ARCHIVED` |

Décisions associées :

- **Aucun désarchivage dans l'application.** Une récupération est une intervention
  exceptionnelle hors app, par Ouro et SPC. C'est ce qui en fait un registre et
  non une corbeille — et l'argument de traçabilité pour Karrame : quelqu'un qui
  viderait le catalogue via l'app ne détruirait rien, il produirait des entrées
  signées et horodatées.
- **Le discours diffère selon le destinataire.** Marie lit « cette suppression est
  définitive » ; l'écran Archives porte le « rien n'est perdu ». Écrire les deux
  au même endroit serait une contradiction.
- **Confirmation par saisie du code produit** + motif obligatoire pour la
  suppression. Motif seul pour le retrait : la friction doit être proportionnée à
  l'enjeu.
- **L'index unique sur `code_pf` est PARTIEL** — `WHERE archive_le IS NULL`. Un
  produit *retiré* garde son code (sinon un doublon naîtrait et interdirait le
  retour) ; un produit *supprimé* le libère. Vérifié en transaction annulée.
  Conséquence : tout upsert doit porter `targetWhere: isNull(produits.archiveLe)`,
  sinon PostgreSQL ne reconnaît pas l'index.
- **Purge réelle** : hors application, en SQL, par Ouro et SPC uniquement.

---

## 3. Le lien produit ↔ fichiers, et le rapport pour JDG

L'association était **recalculée à chaque affichage** en comparant des morceaux de
`codePf` aux clés MinIO. Conséquence constatée : l'audit de `TA7372` a analysé
**deux faces de `TM7372 — Light my fire`**, un produit sans rapport. Comme un logo
compte présent dès qu'il apparaît sur une face, l'Eurofeuille d'un autre produit
pouvait valider celui-ci.

Corrigé en deux temps : rapprochement strict sur le **code de base** (préfixe alpha
+ 3 chiffres, le 4ᵉ chiffre étant une version), puis **table `fichiers_etiquettes`**
qui stocke le lien. 604 liens sur 150 des 152 produits. Une ligne posée par un
humain (`origine = MANUEL`) n'est jamais écrasée par une réexécution.

**Rapport à imprimer pour Karrame** :
`docs/2026-09-07-nommage-fichiers-etiquettes.md` — 8 règles de nommage proposées,
8 questions à leur poser, chiffres mesurés sur l'échantillon. La règle la plus
structurante est **R4 : le 4ᵉ chiffre n'a qu'une seule signification**.

---

## 4. Documents source conservés

Les fichiers d'import étaient lus en mémoire puis jetés ; seul le *nom* survivait.
Un diagnostic s'est arrêté le matin même faute de pouvoir rouvrir le classeur.

Ils sont désormais stockés **avant** extraction (un import raté est justement le
moment où le fichier compte) dans un **bucket privé séparé**, `import-sources`.
Séparé parce que `label-assets` répond aux GET **et aux LIST anonymes** — vérifié —
et qu'une fiche recette est la formulation complète.

Visible dans l'onglet Historique de la fiche, liens signés 15 minutes.

⚠️ **`label-assets` est listable anonymement.** Problème en soi, à traiter après
vendredi.

---

## 5. Recette : ce qui a changé et ce qui reste

### Corrigé

- **Codes article captés** (`HB170`, `TN592`…). La colonne existait, l'extracteur
  écrivait `""`. C'est la clé de jointure de tout le reste.
- **Choix de version explicite.** Le classeur contient 6 tableaux sur 4 onglets et
  le prompt ne parlait pas de versions : le modèle n'avait jamais reçu la
  question. Il tombait juste sur TA7372 uniquement parce que la V.2 est un
  « retour à la recette d'origine », rendant les tableaux candidats identiques.
  Le prompt énonce désormais la règle (ENR-PRO-024 → prendre « VERSION NOUVELLE »).
- **Historique des versions.** `saveRecette` ne laissait qu'une ligne par produit ;
  valider une version effaçait la précédente. La version remplacée passe en
  `ARCHIVED` (dite « version remplacée » dans l'UI).
- **Marqueurs conformes à PRO-QHS-013 §11.1** : `*` bio, `**` Demeter. Le
  générateur écrivait `✱` et un `°` d'équitable qui n'existe sur aucun BAT. Le bio
  n'était pas modélisé du tout — il est vrai par défaut, corrigeable ligne à ligne.

### Ouvert

- **Pas d'arrondi QUID correct.** `PRECISION_PAR_DEFAUT = 0.5` est figé dans
  `recetteExtractor.ts:23`, calé sur le seul MT265. La feuille TA7372 arrondit à
  l'entier : on produit `38.5 / 19.5 / 4.5 / 0.5` là où la colonne « % pour liste
  d'ingrédient » dit `38 / 32 / 19 / 5 / 4 / 1 / 1`. **Le moteur est juste, le
  paramètre ne l'est pas** — et cette colonne du classeur, qui donne la réponse,
  n'est jamais lue.
- **Point 5 non fait** : calcul automatique de l'incidence étiquetage d'une
  substitution. Tout est en place (historique + codes article). Principe : régénérer
  la liste déclarée avant/après et comparer. Si un code nouveau apparaît sans
  dénomination légale connue → point de vigilance, jamais un verdict faux.
- `incidenceEtiquetage` extrait du classeur est **peu fiable** : la ligne est
  « incidence sur : ETIQUETAGE  DLUO » avec des cases à cocher qui ne sont pas du
  texte. À traiter comme indication, pas comme autorité.

---

## 6. Référentiel matière première

Nouvelle table `matieres_premieres`, écran `Paramètres → Matières premières`.

C'est la jointure qui manque partout : la recette dit `TN592 SORWATHE OP1`,
l'étiquette dit `Thé noir*`. Sans elle, trois choses restent cassées — le contrôle
d'ingrédients de l'audit (qui échoue sur **chaque** produit), le calcul d'incidence
d'une substitution, et les étoiles bio.

Elle **se remplit seule** à chaque import (code → désignation R&D) et **n'écrase
jamais** une réponse humaine. Cinquante matières dans le catalogue actuel.

**À demander à JDG vendredi : l'export PMI du référentiel matière.** Une phrase
pendant la démo, trois chantiers débloqués.

---

## 7. Cas concret à trancher : la substitution

Le classeur TA7372 raconte ceci :

| Version | Descriptif | Raison | Effet |
|---|---|---|---|
| v.1 — 25/09/2023 | modification de la base de thé | utilisation du stock de TN407B | SORWATHE 6 → 5 kg, **+ 1 kg DIAN HONG** |
| v.2 — 08/02/2024 | fin du stock à écouler TN407B | retour à la recette d'origine | retour à 6 kg SORWATHE |

Deux thés noirs différents, la liste déclarée reste « Thé noir », le BAT ne bouge
pas. C'est légitime, et JDG le formalise déjà avec son champ « incidence sur
l'étiquetage ». L'application doit savoir le prouver.

---

## 8. Anomalies constatées, non résolues

- **`temp_infusion = 95 °C`** alors que le BAT dit **90 °C**. L'import recopie la
  température de *dégustation* (`importWorker.ts:449`) dans le champ destiné à
  *l'étiquette*. Le seed du 5 mars avait 90, et il avait raison sur les cinq
  valeurs vérifiables au BAT.
- **Chemin de création destructif** : `onConflictDoUpdate({ set: produitValues })`
  écrase par `null` tout champ que l'extraction ne trouve pas. La réintégration,
  elle, est non destructive.
- **`code_ean`, `poids_tasse`, `nb_tasses`, `sous_gamme`, traductions EN** ne sont
  pas dans `produitValues` : un import ne peut jamais les remplir.
- **MT265 : 16 lignes d'ingrédients pour 8**, deux imports superposés. Et 17 fiches
  étiquettes pour un seul produit.
- **`pdf2json` perd des glyphes** — le « M » de « Malin » sur `ETCNA7372V5`. Il ne
  donne pas non plus le vrai nom de police, seulement une famille générique : un
  contrôle de hauteur de x demandera `pdfplumber` ou `pdftotext`.
- **`TN2412` et `TN5472`** n'ont aucun fichier dans le bucket.
- **`TN5482`** a deux dossiers MinIO en doublon (séparateur différent).

---

## 9. Sauvegardes du jour

```
/docker/gaialabel/backups/produits-test-2026-09-07/        17 produits de test supprimés
/docker/gaialabel/backups/TA737-avant-test-2026-09-07/     avant 1er test
/docker/gaialabel/backups/TA737-avant-test-2026-09-07b/    avant 2e test
/docker/gaialabel/exports/TA7372/                          2 BAT + docx + xlsx
```

Migrations appliquées : `0010` → `0015`, toutes additives.
État base : 152 produits, 0 archivé, 0 retiré.

---

## 10. Ce que Ouro a demandé pour la suite

- **Sauvegardes automatiques** + envoi sur un serveur accessible à Karrame seul.
  Facturable, hors cahier des charges initial.
- Formation des utilisateurs : pour eux le produit est **supprimé**, point. La
  récupération exceptionnelle est une prestation SPC.
- L'écran Archives reste visible par tous pour l'instant ; Karrame tranchera.
