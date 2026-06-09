# Passation — phase IA & Audit

> Doc de passation pour démarrer une **nouvelle conversation** sur la partie IA +
> audit (la plus dure, avant livraison). Lire ce fichier + `CLAUDE.md` + les notes
> mémoire suffit pour repartir en contexte. Branche de travail : `gaia_ccode`.
> Déploiement VPS : `git pull` puis `docker compose build app && docker compose up -d app`.
> Chaque redéploiement casse les onglets ouverts (Server Action ID change) → F5.

## 0. Règles non négociables (rappel)
- **Mistral only.** Aucun `@anthropic-ai/sdk` (désinstallé, `AnthropicProvider.ts` supprimé). `MISTRAL_API_KEY` présente sur le VPS.
- Queries DB **uniquement** dans `src/db/queries/`. Server Actions : `auth()` + `Schema.parse()` d'abord. Sorties LLM **validées Zod** avant usage/DB.
- Répondre en français à Ouro ; code/commits/commentaires en anglais.

## 1. Inventaire des agents (tous Mistral)
| Agent | Rôle | Entrée | Fichier |
|---|---|---|---|
| **CopilotAgent** | Bulle de chat (assistante « Co-Pilote », RAG) **+** suggestion de quantités manquantes de la calculatrice | `POST /api/agents/chat` ; `suggererQuantitesAction` (actions/recette.ts) | `src/agents/copilot-agent.ts` |
| **AuditWorker** | Audit de conformité (QUID, ROUNDING, ALLEGATION, ALLERGEN, REGLISSE) + RAG | `POST /api/agents/audit` (`{ ficheIds, massAudit? }`) | `src/agents/audit/auditWorker.ts` |
| **ImportWorker** | Extraction docs (DOCX/XLSX/PDF) → données produit, RAG | `POST /api/agents/import` | `src/agents/imports/importWorker.ts` |
| **BatVisionAgent** | Analyse visuelle des BAT (vision) | `POST /api/agents/bat-vision` | `src/agents/bat-agent.ts` |
| **RecetteAgent** | Calcul déterministe QUID/Demeter (LLM ne touche aucun chiffre) + formulation liste | via `RecettePanel`/tests | `src/agents/recette/RecetteAgent.ts` |
| Infra | `BaseAgent` (ReAct), `MistralProvider`, `RAGService` | — | `src/agents/` |

**Morts/dormants** : `import-agent.ts` (ImportAgent, legacy) et `pdf-comparison-agent.ts` — branchés nulle part. Candidats suppression (comme `audit-agent.ts` déjà supprimé).

## 2. RAG (lots A→E, faits)
- **Embeddings réels Mistral** `mistral-embed` (1024 dims), validés Zod ; placeholder charCode supprimé. Schéma `knowledge_documents.embedding` migré `vector(1536)→1024` (migration `drizzle/0005`, appliquée via psql car DB en mode **push**, pas de journal drizzle).
- **Recherche** : `RAGService.searchContext` = cosineDistance + **seuil `RELEVANCE_THRESHOLD = 0.4`** → set vide si aucun voisin pertinent (signal « faible confiance » du Copilot).
- **Corpus rempli en prod** (~14 docs / ~99 chunks : Demeter, WFTO, PRO-QHS-013, lexiques…). Upload durci : auth, 10 Mo, **PDF** via `src/lib/utils/pdf-text.ts` (pdf2json + **timeout 30 s** anti-hang), garde « 0 chunk » → 502.
- **Suppression** de doc : `supprimerDocumentAction` + bouton corbeille dans la vue corpus (`connaissances/_components/knowledge-corpus.tsx`).
- Détail : `docs/decisions/2026-06-08-rag-plan.md`.

## 3. Audit (état actuel)
- `auditWorker` **migré Anthropic→Mistral** (`mistral-large-latest`), sortie **Zod**, échec honnête (`SKIPPED`, plus de faux résultats), prompt avec **contexte RAG** réel. Écrit dans `controles_conformite` + met à jour le statut étiquette. Log tokens `AUDIT_IA_TOKENS`.
- **Bouton Audit de la fiche** corrigé (envoie `{ ficheIds: [id] }`, lit `data.data[0]`, mappe `overallStatus`+`controls`). Auth ajoutée sur la route.
- **Re-audit d'une version** : `AuditWorker.auditerSnapshot(fiche, produit)` (sans persistance) via `auditerVersionAction` → bouton « Auditer » dans l'onglet Historique.
- **Traçabilité** : helper `writeAuditLog` (queries/audit-logs.ts) ; actions tracées (ingestion/suppression RAG, audit, champs modifiés, version créée/restaurée/re-auditée, dossier modifié…). C'est le premier vrai usage de `audit_logs`.

## 4. Dettes / limites connues (à garder en tête pour la phase audit)
- **Frontière violée** : `RAGService` et `auditWorker` importent `@/db` **directement** (devraient passer par `src/db/queries/`). À refactorer.
- Les **5 contrôles** d'audit sont demandés au LLM en un seul prompt JSON ; pas de contrôle **déterministe** séparé (ex. QUID/arrondi pourraient être vérifiés par `computeRecette` au lieu de l'IA). Piste forte pour fiabiliser : contrôles déterministes + IA pour le qualitatif.
- `auditType` (4 boutons d'origine) **non géré** par la route → réduit à un seul « Lancer l'audit » (audit complet des 5). Si on veut des audits ciblés, à rebrancher.
- Audit de masse > 5 fiches = « fire and forget » (pas de vraie file/queue).
- Embedding de requête : 1 appel Mistral par recherche ; ingestion = 1 appel par chunk (séquentiel). Pas d'index vectoriel pgvector (OK à faible volume).
- Dockerfile installe TypeScript au runtime (anti-pattern connu). `getPublicUrl` MinIO (pas presigned).

## 5. Contexte connexe utile
- **Calculatrice QUID** (SPEC-03b) : `computeRecette` (pur, déterministe, golden MT265) = source de vérité des chiffres. Pivot = masse ingrédient principal. Cf. `docs/decisions/2026-06-08-rag-plan.md` voisin + mémoire `project-spec02-rounding`.
- **Fiche éditable + versioning** (terminé) : tout éditable par carte (`useEditableSection` + `updateChampsAction` route fiche/produit/dégustation), Sauvegarder = snapshot version, Historique (lister/comparer/restaurer/**re-auditer**). Cf. `docs/decisions/2026-06-08-editable-fiche.md`. **Lien audit** : le re-audit de version s'appuie là-dessus.

## 6. Fichiers clés pour la phase IA/audit
- Agents : `src/agents/**` (audit/auditWorker.ts, copilot-agent.ts, knowledge/RAGService.ts, MistralProvider.ts, BaseAgent.ts).
- Routes : `src/app/api/agents/{audit,chat,import,bat-vision}/route.ts`, `src/app/api/knowledge/upload/route.ts`.
- Queries : `src/db/queries/{audit-logs,knowledge,recettes,fiches,produits,degustation}.ts`.
- Schéma audit : `controles_conformite`, `audit_logs`, `knowledge_documents`, `TypeControle`/`StatutControle` dans `src/db/schema.ts`.
- UI audit : onglet « Audit IA » dans `EtiquetteClient.tsx` ; page `connaissances/`.

## 7. Périmètre de la phase IA+audit (À DÉFINIR au démarrage)
> Objectif à préciser avec Ouro. Pistes pressenties :
> - Fiabiliser l'audit : **contrôles déterministes** (QUID/arrondi via `computeRecette`) + IA pour le qualitatif ; réduire les hallucinations ; verdicts reproductibles.
> - Audits **ciblés** (par type de contrôle) + audit de masse robuste.
> - Améliorer le RAG (vrai re-ranking, citations des sources dans le verdict).
> - Préparer la **démo livraison** (parcours Marie de bout en bout, perfs, robustesse sans clé).
>
> **Première action de la prochaine conversation : demander à Ouro le cap exact de la phase, puis planifier.**
