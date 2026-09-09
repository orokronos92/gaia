# Diagnostic Traçabilité — GaïaLabel vs la hantise du tableur partagé

> Lecture seule sur `gaia_gamma` (code déployé). **Aucune modification de code, aucun commit, aucun rebuild.**
> Enjeu : GaïaLabel doit remplacer un Excel partagé sans historique, sans validation, sans verrou — où une cellule écrasée est perdue sans trace. Contexte réglementaire : étiquetage alimentaire, contrôle DGCCRF / rappel produit → **la preuve de contrôle a autant de valeur que la donnée.**
> Verdict court : **le versionnement existant ne suffit pas.** Il couvre le point de sauvegarde volontaire d'une fiche, mais laisse ouverts les trois trous qui définissent précisément le problème Excel : l'écrasement concurrent silencieux, la restauration incohérente, et l'impossibilité de prouver un contrôle.

---

## 1. État des lieux du versionnement existant

| Aspect | Constat | Preuve |
|---|---|---|
| Table | `versions_etiquettes` (snapshot) + pointeur `fichesEtiquettes.versionCouranteId` | `schema.ts:190-204`, `:184` |
| Stratégie | **Snapshot complet JSON** (`donneesSnapshot` json NOT NULL), pas de diff ni ligne-par-ligne | `schema.ts:195`, `fiches.ts:288-293` |
| Déclencheur | **Manuel uniquement** : bouton « Sauvegarder » → `sauvegarderVersionAction` → `creerVersionFiche`. Les éditions par carte persistent directement dans `fichesEtiquettes` sans créer de version | `etiquettes.ts:131`, `fiches.ts:243` |
| Contenu du snapshot | Objet à 4 branches : `{ fiche, produit, recette:{...recette, ingredients[]}, degustation }` — **inclut** les enfants | `fiches.ts:288-293`, `:257-269` |
| Auteur | **OUI** — `creePar` NOT NULL depuis `session.user.id` | `schema.ts:202`, `etiquettes.ts:137-141`, `fiches.ts:295` |
| Horodatage | **OUI** — `creeLe` defaultNow | `schema.ts:203` |
| Raison / commentaire | **OUI, optionnel** — `resumeChangements` (text, max 255, nullable), saisi par Marie | `schema.ts:194`, `etiquettes.ts:122` |
| Restauration | **Écrasement in-place** de la fiche courante, **PAS un append** : ne crée aucune nouvelle version | `fiches.ts:345-378` |
| UI | Onglet « Historique » (`VersionsHistorique`) : Voir / Comparer (diff, max 2) / Ré-auditer / Restaurer (`window.confirm`) | `versions-historique.tsx`, `version-diff.tsx`, monté `EtiquetteClient.tsx:1074` |
| Rétention | **Illimitée. Aucune purge, aucune limite, aucune pagination** — `getVersionsFiche` charge tout d'un bloc (`ORDER BY numeroVersion DESC` sans `.limit()`) | `fiches.ts:322-336` |

Colonnes dormantes : `validePar` / `valideLe` existent mais ne sont écrites nulle part dans ce flux (`schema.ts`, aucun writer).

---

## 2. Couverture — ce qui N'EST PAS versionné

Trois mécanismes de trace existent seulement : `versions_etiquettes` (fiche), `audit_logs` (journal d'actions), et les colonnes plates `creePar`/`creeLe`/`misAJourLe` (dernier état, pas d'historique).

| Entité | Tracée ? | Mécanisme / absence | Preuve |
|---|---|---|---|
| `fiches_etiquettes` | OUI | versionnée + audit_logs | `schema.ts:160,190` |
| → **changement de STATUT workflow** | **PARTIEL** | audit_log `STATUT_MODIFIE {avant,apres}`. **Aucune table `statutHistory`** ; le champ `statut` est écrasé | `etiquettes.ts:23-36` ; recherche `statutHistory` = néant |
| `produits` (parent) | **PARTIEL** | audit_log `CHAMPS_MODIFIES`/`DOSSIER_MODIFIE` + `misAJourLe` écrasé. **PAS de versionnement** — le parent n'a pas de snapshot | `fiche-champs.ts:74-99,170` |
| `recettes` | PARTIEL | audit_log `RECETTE_VALIDEE` + `misAJourLe`. Un seul jeu vivant | `recettes.ts:178` |
| **`ingredients_recette`** | **NON** | **Aucune trace.** Re-validation = `DELETE` toutes lignes puis ré-`INSERT`. Écrasement destructif, non figé avec la version | `recettes.ts:152-176` |
| `fiches_degustation` | PARTIEL | audit_log seulement. Pas de versionnement, pas même de `misAJourLe` | `schema.ts:97-121` |
| packagings / `conditionnementsOptions` | N/A | Pas de table — champ JSON sur `produits`, tracé en blob non structuré | `schema.ts:85` |
| **`commandes_impression`** (BAT, réception, contrôle, photos) | **NON — TABLE MORTE** | Schéma complet (`controlePar`/`controleLe`) mais **aucun writer applicatif** : lue par le dashboard, écrite par le seed seulement | `schema.ts:238` ; grep writers = seed |
| **fichiers uploadés** (BAT, PDF, Illustrator, sources) | **NON (pas d'entité)** | Aucune table `fichiers`/`documents`. Refs `varchar` éparses (`pdfFichierId`, `batFichierId`, `fichierSourceId`…) **non alimentées**. Qui/quand/quoi uploadé = non tracé | `schema.ts:197-199,140,119` |
| `controles_conformite` | **NON HISTORISÉ** | Persisté mais **écrasement destructif** `DELETE WHERE ficheEtiquetteId` + INSERT → un ré-audit efface les résultats de toutes les versions | `auditWorker.ts:188-197` |
| utilisateurs / rôles / permissions | **NON** | Aucune action de création/modif user ni de changement de rôle. `role`/`estActif` posés au seed seulement → un changement hors-app serait invisible | `schema.ts:27-35` ; grep = néant |
| `commentaires_etiquettes` | PARTIEL | `creeLe` + `utilisateurId` (FK). Append de fait, pas de trace d'édition/suppression | `schema.ts:227` |
| `labels_produits` | NON | Aucun timestamp, aucune trace (table morte par ailleurs) | `schema.ts:123` |

**Note doc/implémentation** : CLAUDE.md §7 affirme « Token usage is logged in audit_logs ». **Faux** : les tokens LLM restent en mémoire dans `BaseAgent` (`BaseAgent.ts:107-190`), jamais persistés. `audit_logs` journalise des actions métier, pas des tokens.

---

## 3. Traçabilité des audits — la preuve de contrôle

**Confirmé : la voie déterministe n'écrit RIEN** (`audit.ts:23-26`, commentaire « No DB write yet »). Elle retourne les 35 verdicts en mémoire ; ils s'évanouissent à la fin de la requête (`audit.ts:38-44`).

- **Voie BAT/visuelle** (`audit-visuel.ts`) : ne persiste **aucun verdict** — seulement un `writeAuditLog` de **tokens** (`audit-visuel.ts:135-141`). Le contenu des `checks` (quel point PASS/FAIL) n'est jamais stocké.
- **Seul écrivain de `controles_conformite`** = le legacy `AuditWorker` (`auditWorker.ts:188-197`), qui tourne **en parallèle** via l'API mass-audit (`api/agents/audit/route.ts:36,44`). Il produit **5 verdicts LLM** (QUID/ROUNDING/ALLEGATION/ALLERGEN/REGLISSE), **pas les 35 points**, avec l'enum legacy `TypeControle` (14 valeurs) incompatible avec les ids de la checklist.

**Deux sources de vérité, concrètement** : la table stocke le verdict **LLM** (probabiliste). Le calcul **déterministe** (plus fiable réglementairement) recalcule QUID par code pur mais **ne l'écrit nulle part** → il n'écrase jamais le verdict LLM. La seule valeur persistée et affichée (dashboard, statut fiche) est celle du LLM. Pire : `runSingleAudit` fait passer la fiche en **`QUALITY_VALIDATED`** (`auditWorker.ts:200`) sur la seule foi du LLM 5-axes, sans que les 35 points aient été contrôlés ni tracés.

**Peut-on prouver un contrôle ?**

| Dimension | Reconstituable ? | Détail |
|---|---|---|
| Contrôlée ? | ⚠️ PARTIEL | Une ligne `controles_conformite` / `audit_logs` atteste qu'*un* audit a tourné ; les voies déterministe/BAT ne laissent aucune trace |
| Quand ? | ⚠️ | Daté, mais `DELETE`+`INSERT` écrase les dates précédentes → pas d'historique |
| Par qui ? | ⚠️ FAIBLE | `controlePar` = souvent la constante `"AI_AUDIT"` (la machine), pas Marie |
| Quel référentiel (version) ? | ❌ **NON** | Aucune colonne de version/hash du référentiel. `reference` (« PRO-QHS-013 §X ») vit dans le code, jamais copiée en base |
| Verdict point par point ? | ❌ **NON** | Seulement ≤5 verdicts LLM legacy, pas les 35 ids ; déterministe et BAT jamais persistés |

**VERDICT : NON, la preuve de contrôle réglementaire n'est pas recevable.** Au mieux : un audit LLM 5-axes, daté, attribué à « AI_AUDIT », sans référentiel versionné et sans lien avec les 35 points réels.

**Versionnement du référentiel** : `CONTROL_CHECKLIST` est un tableau en dur (`control-checklist.ts:19`, 35 entrées). **Aucun `CHECKLIST_VERSION`, aucun hash.** Un audit passé ne stocke pas la version utilisée ; si la checklist change (un id passe de `deterministic` à `manual`, cf. commentaire `control-checklist.ts:51-54`), un audit ancien devient **non interprétable** — aucun ancrage entre un verdict archivé et le texte de règle en vigueur ce jour-là.

---

## 4. Concurrence et écrasement

**VERDICT : OUI — « dernier écrit gagne, sans avertissement ». Le défaut Excel est intégralement reproduit.**

Aucun verrou optimiste, aucun verrou pessimiste, aucune détection de conflit. Tous les UPDATE sont **inconditionnels sur l'`id` seul** :

- `fiches.ts:70-73` (`updateFicheEtiquetteChamps`, édition par carte) — `WHERE eq(id)`. Le `before` lu (`:63`) ne sert **qu'au diff d'audit**, jamais à rejeter une écriture stale.
- Idem `setAllegationChoisie` (`:106-109`), `updateStatutFiche` (`:131-134`), `alignerListeIngredients` (`:40-43`), `updateDossier` (`:411-419`), `restaurerVersionFiche` (`:368-371`).
- `misAJourLe` (`schema.ts:187`) est **toujours écrit, jamais lu pour comparaison**. Aucune colonne `version`/`etag` sur `fichesEtiquettes`.
- UI : aucune gestion de conflit (`grep conflit|stale|mismatch` dans `EtiquetteClient.tsx` = 0). Le client POST l'état complet et prend le succès pour acquis.

**Scénario Marie + Fabrice sur la même fiche** : la seconde sauvegarde écrase la première **en silence**, sans avertissement ni marqueur de perte. Identique au tableur partagé. **C'est le point le plus grave du diagnostic.**

---

## 5. Identité et imputabilité

**Identité serveur : OK.** NextAuth v5, Credentials + bcrypt (`auth.ts:9-52`), `role` remonté dans le JWT puis la session (`auth.config.ts:21,28`). `await auth()` renvoie `session.user.id` et `.role`. **Le mock user de CLAUDE.md a bien été retiré** (grep = 0) — dette résolue.

**Attribution** : 10 des 11 actions d'écriture appellent `auth()` et journalisent l'auteur dans `audit_logs`. **Une exception prouvée** :

- **`createFicheEtiquette` (`etiquettes.ts:221-238`)** : **pas d'`await auth()`, pas de `writeAuditLog`, et l'INSERT ne renseigne pas `creePar`** → création de fiche **non authentifiée et non imputable** ; `fichesEtiquettes.creePar` reste `null`.

**Imputabilité ligne vs journal** : les lignes métier ne portent quasi jamais l'auteur d'une modification (`fichesEtiquettes` n'a pas de `modifiePar`). L'identité du modificateur n'existe **que** dans `audit_logs` — dont `utilisateurId` est `notNull` **mais sans FK** vers `utilisateurs` (`schema.ts:267`) : journal non relié référentiellement, et écriture **best-effort** (try/catch qui avale l'erreur, `audit-logs.ts:29`) → un log peut manquer sans qu'on le sache.

**Écritures système non imputables** : `saveRecette({ developpeur: "Ré-import IA" })` (`import.ts:52`), `controlePar = "SYSTEM"/"AI_AUDIT"` (`schema.ts:223`), deletes système (`auditWorker.ts:188`, `importWorker.ts:711`).

**Modèle de rôles : décoratif, aucune autorisation appliquée.** `users.role` existe et remonte en session, mais **`grep "role"` sur `src/app/actions/` = 0** : aucune action ne teste `session.user.role`. Tout utilisateur authentifié peut tout faire — éditer n'importe quel champ, forcer n'importe quel statut, valider une recette. Commentaire confirmant : `etiquettes.ts:19-22` *« no transition rules yet — any status is allowed »*. **La séparation PRO-QHS-013 (QHSE valide les mentions, marketing valide le BAT) n'a aucune traduction technique.**

---

## 6. Suppression

**VERDICT : aucune suppression métier de fiche/produit exposée dans l'app ; aucun soft-delete. Risque réel = les remplacements irréversibles sur sous-entités + une cascade produit latente non armée.**

- **Pas de soft-delete** : aucune colonne `deletedAt`/`archived` (`schema.ts`). Le seul « archivage » = une valeur de statut `ARCHIVED` (`schema.ts:24`), réversible.
- **DELETE réels (hors seed)** = des **remplacements** destructifs sur sous-entités : `fichesDegustation` par produit à chaque ré-import (`importWorker.ts:711`), `controlesConformite` par fiche à chaque ré-audit (`auditWorker.ts:188`), `ingredientsRecette` par recette à chaque validation (`recettes.ts:153`). **Ces données écrasées ne sont pas récupérables** (pas de corbeille, pas de snapshot auto avant écrasement).
- **Aucun `db.delete` sur `fichesEtiquettes` ni `produits`**, aucun bouton UI de suppression.
- **Cascade produit latente (bombe non armée)** : `onDelete: cascade` en chaîne — supprimer un produit détruirait fiches + versions + ingrédients + contrôles + commentaires, irréversiblement (`schema.ts:99,125,132,147,162,192,216,229`). **Mais ce DELETE n'est appelé nulle part dans l'app** — danger purement schématique / SQL manuel, pas un défaut du produit livré.

---

## 7. Verdict et recommandations

**La hantise de Marie n'est PAS couverte.** Le versionnement de fiche est un bon socle (snapshot complet, auteur, horodatage, raison, UI de comparaison), mais il laisse ouverts exactement les trois défauts qu'il était censé corriger : l'écrasement concurrent silencieux (§4), la restauration incohérente (§1/§2), et l'impossibilité de prouver un contrôle (§3). Du travail peut être perdu, et un contrôle réglementaire ne peut pas être prouvé.

### 🔴 CRITIQUE — perte de données possible ou preuve réglementaire impossible

| # | Manque | Preuve | Effort | Nature |
|---|---|---|---|---|
| C1 | **Écrasement concurrent silencieux** (dernier écrit gagne, aucun avertissement) | `fiches.ts:70-73` etc. | Moyen | Additif (colonne `version` + garde `WHERE version = x`, message de conflit UI) |
| C2 | **Restauration incohérente** : restaure les champs scalaires de la fiche mais **pas** ses enfants recette/ingrédients → fiche V3 + recette V7, QUID/INCO désynchronisés | snapshot `fiches.ts:257-269` vs restauration `fiches.ts:354-371` | Moyen | Semi-structurant (restaurer les enfants dans la transaction, ou bloquer) |
| C3 | **Preuve de contrôle non persistée** : déterministe + BAT n'écrivent rien ; seul le LLM 5-axes est stocké | `audit.ts:23-26`, `audit-visuel.ts:135` | Élevé | Structurant (persister les 35 verdicts + réviser `controles_conformite`) |
| C4 | **Audit non historisé** : `DELETE`+`INSERT` détruit les contrôles précédents à chaque ré-audit | `auditWorker.ts:188` | Moyen | Structurant (écriture append/immuable, clé par version) |
| C5 | **`ingredients_recette` non figé / non tracé** : delete+insert, jamais snapshotté avec la version → base du QUID perdue | `recettes.ts:152-176` | Moyen-élevé | Structurant (recouvre C2) |
| C6 | **`QUALITY_VALIDATED` posé par le LLM legacy** sans contrôle complet ni rôle | `auditWorker.ts:200` | Moyen | Structurant (gating de transition) |

### 🟠 IMPORTANT — traçabilité incomplète, gênante en audit externe

| # | Manque | Preuve | Effort | Nature |
|---|---|---|---|---|
| I1 | **`createFicheEtiquette` anonyme** : pas d'auth, pas de log, `creePar` null | `etiquettes.ts:221-238` | Faible | Additif |
| I2 | **Rôles décoratifs** : aucun check d'autorisation ; PRO-QHS-013 non traduit techniquement | grep `role` actions = 0 ; `etiquettes.ts:19-22` | Moyen | Structurant |
| I3 | **Statut workflow sans historique dédié** (audit_logs varchar libre, best-effort, user sans FK) | `etiquettes.ts:23-36` | Moyen | Additif → structurant |
| I4 | **`audit_logs` non fiable comme registre** : best-effort (avale les erreurs) + `utilisateurId` sans FK | `audit-logs.ts:29`, `schema.ts:267` | Faible | Additif |
| I5 | **Référentiel non versionné** : pas de `CHECKLIST_VERSION`, audit ancien non interprétable | `control-checklist.ts:19` | Faible-moyen | Additif (constante de version + `reference` figée à l'écriture) |
| I6 | **Fichiers uploadés sans entité de traçabilité** (refs varchar éparses non alimentées) | `schema.ts:197-199` | Moyen | Structurant |
| I7 | **Produit parent non versionné** → snapshot fiche ≠ état produit d'époque | `fiche-champs.ts:170` | Moyen | Structurant |
| I8 | **Deux sources de vérité audit** (legacy LLM vs déterministe) → verdicts contradictoires | `auditWorker.ts:188` vs `audit.ts:38` | Moyen | Structurant (décommissionner le legacy) |

### 🟢 CONFORT — améliore sans risque réel

| # | Point | Preuve | Effort |
|---|---|---|---|
| CF1 | Historique de versions **sans pagination ni purge** (chargé d'un bloc) | `fiches.ts:322-336` | Faible (additif) |
| CF2 | **`commandes_impression` table morte** : suivi impression/réception non alimenté (fonctionnalité absente, pas un risque) | `schema.ts:238` | Variable |
| CF3 | **Cascade produit latente** : sécuriser le schéma (`restrict` ou suppression du cascade) tant qu'aucun besoin | `schema.ts:99-229` | Faible (additif) |
| CF4 | **Écart doc** : CLAUDE.md §7 affirme à tort que les tokens sont loggés | `BaseAgent.ts:107-190` | Trivial (doc) |

---

### Le fil rouge

Trois manques CRITIQUES forment le cœur du problème et se répondent : **C1** (on peut écraser le travail d'autrui sans le savoir), **C2/C5** (même l'historique qu'on a ne se restaure pas proprement), **C3/C4** (et on ne peut pas prouver qu'un contrôle a eu lieu). Traiter C1 en premier ferme la porte par laquelle du travail se perd aujourd'hui — c'est le geste qui adresse directement la hantise de Marie. C3+C4 sont le chantier réglementaire de fond (preuve DGCCRF), plus lourds mais non contournables pour un système de conformité.

---

*Fin du diagnostic traçabilité. Aucune modification de code effectuée.*
