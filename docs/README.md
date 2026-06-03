# 📚 Documentation GaïaLabel

Ce dossier est la **mémoire partagée** du projet. Tout document de référence, décision
ou fichier source du projet vit ici, pour que Claude Code et le RAG sachent où chercher.

> Dépose chaque document dans le sous-dossier indiqué ci-dessous. En cas de doute, mets-le
> dans `sources/` et on le rangera ensemble.

---

## Où mettre quoi

| Dossier | Contenu attendu | Exemples |
|---|---|---|
| **`decisions/`** | Décisions d'architecture (ADR), formats courts et immuables | ADR-001 ORM Drizzle, ADR-002 pgvector, ADR-003 multi-providers IA, ADR-004 périmètre Module 2+3, ADR-005 embedder Mistral |
| **`process/`** | Specs métier & workflows destinés à Marie / l'équipe | Cahier des charges Marie, flux de création produit (thé / tisane / aromatisé), champs obligatoires/conditionnels |
| **`referentiels/`** | Documents normatifs & réglementaires → **nourrissent le RAG** | PRO-QHS-013, règlement bio / eurofeuille, Demeter, WFTO, lexique organoleptique, règles INCO |
| **`sources/`** | Fichiers bruts d'entrée (données réelles, gabarits reçus) | Fiche dégustation Word, fiche recette Excel V6+, `BDD étiquettes 2025.xlsx` (les ~802 produits à importer) |
| **`contrat/`** | Cadre commercial & comptes-rendus | Devis SPC, comptes-rendus ateliers (27/11/2025 + 10/04/2026) |

---

## Conventions

- **ADR** : nommer `ADR-00X-titre-court.md`. Un ADR = une décision, contexte + choix + conséquences.
- **Référentiels** : les documents ici sont destinés à être **ingérés dans le RAG** (`knowledge_documents`).
  Préférer des formats texte/markdown/PDF lisibles. Garder le nom d'origine du document pour la traçabilité.
- **Sources** : ne pas modifier les fichiers bruts ; ils servent de référence pour le parsing (ImportWorker)
  et pour le seed des 802 produits.

---

## Liens mémoire (triangle de collaboration)

- `CLAUDE.md` (racine) — guide d'exécution pour Claude Code
- `docs/decisions/` — ce qui a été tranché (ne pas réinventer)
- `historic.md` (racine) — journal des réparations & décisions au fil de l'eau
