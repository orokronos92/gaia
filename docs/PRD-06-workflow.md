# PRD-06 — Workflow, permissions & notifications

## Machine à états — transitions de statut

```
DRAFT ───────────────→ QUALITY_REVIEW            (Marie soumet)
QUALITY_REVIEW ──────→ QUALITY_VALIDATED          (Marie valide — si 0 FAIL)
QUALITY_REVIEW ──────→ DRAFT                      (Marie renvoie)
QUALITY_VALIDATED ───→ DESIGN_IN_PROGRESS         (Fabrice prend en charge)
DESIGN_IN_PROGRESS ──→ DESIGN_REVIEW              (Fabrice uploade PDF)
DESIGN_REVIEW ───────→ DESIGN_VALIDATED           (Marie valide le PDF)
DESIGN_REVIEW ───────→ DESIGN_IN_PROGRESS         (Marie demande correction)
DESIGN_VALIDATED ────→ SENT_TO_PRINTER            (Pascal envoie commande)
SENT_TO_PRINTER ─────→ BAT_RECEIVED               (BAT arrive)
BAT_RECEIVED ────────→ BAT_VALIDATED              (Marie + Fabrice valident)
BAT_RECEIVED ────────→ DESIGN_IN_PROGRESS         (BAT refusé → boucle)
BAT_VALIDATED ───────→ PRINTING
PRINTING ────────────→ RECEIVED
RECEIVED ────────────→ RECEPTION_CONTROLLED       (Céline contrôle)
RECEPTION_CONTROLLED → ACTIVE                     (conforme)
RECEPTION_CONTROLLED → DESIGN_IN_PROGRESS         (non conforme → boucle)
```

---

## Permissions par transition

| De → Vers | Rôles autorisés | Condition |
|---|---|---|
| DRAFT → QUALITY_REVIEW | QUALITE, ADMIN | — |
| QUALITY_REVIEW → QUALITY_VALIDATED | QUALITE, ADMIN | Aucun ConformityCheck en FAIL. Tous les WARNING doivent avoir une justification. |
| QUALITY_REVIEW → DRAFT | QUALITE, ADMIN | — |
| QUALITY_VALIDATED → DESIGN_IN_PROGRESS | GRAPHISME, ADMIN | — |
| DESIGN_IN_PROGRESS → DESIGN_REVIEW | GRAPHISME, ADMIN | Au moins 1 fichier PDF uploadé |
| DESIGN_REVIEW → DESIGN_VALIDATED | QUALITE, ADMIN | Comparaison Excel↔PDF exécutée (au moins 1 ConformityCheck de type PDF_VS_EXCEL) |
| DESIGN_REVIEW → DESIGN_IN_PROGRESS | QUALITE, ADMIN | — |
| DESIGN_VALIDATED → SENT_TO_PRINTER | ACHATS, ADMIN | — |
| SENT_TO_PRINTER → BAT_RECEIVED | ACHATS, QUALITE, ADMIN | Fichier BAT uploadé |
| BAT_RECEIVED → BAT_VALIDATED | QUALITE, GRAPHISME, ADMIN | — |
| BAT_RECEIVED → DESIGN_IN_PROGRESS | QUALITE, ADMIN | — |
| BAT_VALIDATED → PRINTING | ACHATS, ADMIN | — |
| PRINTING → RECEIVED | ACHATS, CONDITIONNEMENT, ADMIN | — |
| RECEIVED → RECEPTION_CONTROLLED | CONDITIONNEMENT, ADMIN | — |
| RECEPTION_CONTROLLED → ACTIVE | QUALITE, ADMIN | Si `receptionStatus` = CONFORME |
| RECEPTION_CONTROLLED → DESIGN_IN_PROGRESS | QUALITE, ADMIN | Si `receptionStatus` ≠ CONFORME |

---

## Permissions par écran et action

| Action | QUALITE | GRAPHISME | CONDITIONNEMENT | ACHATS | DIRECTION | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Voir dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lister produits | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Créer produit | ✅ | — | — | — | — | ✅ |
| Éditer fiche étiquette | ✅ | — | — | — | — | ✅ |
| Éditer recette | ✅ | — | — | — | — | ✅ |
| Importer Word+Excel | ✅ | — | — | — | — | ✅ |
| Uploader PDF étiquette | — | ✅ | — | — | — | ✅ |
| Valider conformité | ✅ | — | — | — | — | ✅ |
| Justifier un WARNING | ✅ | — | — | — | — | ✅ |
| Lancer audit IA | ✅ | — | — | — | ✅ | ✅ |
| Valider BAT | ✅ | ✅ | — | — | — | ✅ |
| Créer commande impression | — | — | — | ✅ | — | ✅ |
| Contrôler réception | — | — | ✅ | — | — | ✅ |
| Uploader photo réception | — | — | ✅ | — | — | ✅ |
| Exporter Excel | ✅ | — | — | — | ✅ | ✅ |
| Ajouter commentaire | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| Voir historique | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gérer utilisateurs | — | — | — | — | — | ✅ |

---

## Implémentation des transitions

```typescript
// lib/workflow/transitions.ts

import { LabelStatus, UserRole } from "@prisma/client";

type TransitionRule = {
  from: LabelStatus;
  to: LabelStatus;
  roles: UserRole[];
  condition?: string; // nom de la condition à vérifier
};

export const TRANSITIONS: TransitionRule[] = [
  { from: "DRAFT", to: "QUALITY_REVIEW", roles: ["QUALITE", "ADMIN"] },
  { from: "QUALITY_REVIEW", to: "QUALITY_VALIDATED", roles: ["QUALITE", "ADMIN"], condition: "NO_FAIL_CHECKS" },
  { from: "QUALITY_REVIEW", to: "DRAFT", roles: ["QUALITE", "ADMIN"] },
  { from: "QUALITY_VALIDATED", to: "DESIGN_IN_PROGRESS", roles: ["GRAPHISME", "ADMIN"] },
  { from: "DESIGN_IN_PROGRESS", to: "DESIGN_REVIEW", roles: ["GRAPHISME", "ADMIN"], condition: "HAS_PDF" },
  { from: "DESIGN_REVIEW", to: "DESIGN_VALIDATED", roles: ["QUALITE", "ADMIN"], condition: "HAS_PDF_CHECK" },
  { from: "DESIGN_REVIEW", to: "DESIGN_IN_PROGRESS", roles: ["QUALITE", "ADMIN"] },
  { from: "DESIGN_VALIDATED", to: "SENT_TO_PRINTER", roles: ["ACHATS", "ADMIN"] },
  { from: "SENT_TO_PRINTER", to: "BAT_RECEIVED", roles: ["ACHATS", "QUALITE", "ADMIN"], condition: "HAS_BAT" },
  { from: "BAT_RECEIVED", to: "BAT_VALIDATED", roles: ["QUALITE", "GRAPHISME", "ADMIN"] },
  { from: "BAT_RECEIVED", to: "DESIGN_IN_PROGRESS", roles: ["QUALITE", "ADMIN"] },
  { from: "BAT_VALIDATED", to: "PRINTING", roles: ["ACHATS", "ADMIN"] },
  { from: "PRINTING", to: "RECEIVED", roles: ["ACHATS", "CONDITIONNEMENT", "ADMIN"] },
  { from: "RECEIVED", to: "RECEPTION_CONTROLLED", roles: ["CONDITIONNEMENT", "ADMIN"] },
  { from: "RECEPTION_CONTROLLED", to: "ACTIVE", roles: ["QUALITE", "ADMIN"], condition: "RECEPTION_CONFORME" },
  { from: "RECEPTION_CONTROLLED", to: "DESIGN_IN_PROGRESS", roles: ["QUALITE", "ADMIN"] },
];

// Conditions nommées
export const CONDITIONS: Record<string, (labelSheet: any) => { ok: boolean; reason?: string }> = {
  NO_FAIL_CHECKS: (ls) => {
    const hasFail = ls.conformityChecks?.some((c: any) => c.status === "FAIL");
    const hasUnjustifiedWarning = ls.conformityChecks?.some(
      (c: any) => c.status === "WARNING" && !c.justification
    );
    if (hasFail) return { ok: false, reason: "Des contrôles sont en échec (FAIL)" };
    if (hasUnjustifiedWarning) return { ok: false, reason: "Des avertissements ne sont pas justifiés" };
    return { ok: true };
  },
  HAS_PDF: (ls) => {
    const hasPdf = ls.versions?.some((v: any) => v.pdfFileId);
    return hasPdf ? { ok: true } : { ok: false, reason: "Aucun PDF uploadé" };
  },
  HAS_PDF_CHECK: (ls) => {
    const hasCheck = ls.conformityChecks?.some((c: any) => c.checkType === "PDF_VS_EXCEL");
    return hasCheck ? { ok: true } : { ok: false, reason: "La comparaison Excel↔PDF n'a pas été exécutée" };
  },
  HAS_BAT: (ls) => {
    const hasBat = ls.versions?.some((v: any) => v.batFileId);
    return hasBat ? { ok: true } : { ok: false, reason: "Aucun BAT uploadé" };
  },
  RECEPTION_CONFORME: (ls) => {
    const order = ls.versions?.[0]?.printOrder;
    return order?.receptionStatus === "CONFORME"
      ? { ok: true }
      : { ok: false, reason: "La réception n'est pas marquée conforme" };
  },
};

// Fonction principale
export function canTransition(
  currentStatus: LabelStatus,
  targetStatus: LabelStatus,
  userRole: UserRole,
  labelSheet: any
): { allowed: boolean; reason?: string } {
  const rule = TRANSITIONS.find((t) => t.from === currentStatus && t.to === targetStatus);
  if (!rule) return { allowed: false, reason: "Transition non autorisée" };
  if (!rule.roles.includes(userRole)) return { allowed: false, reason: "Rôle insuffisant" };
  if (rule.condition && CONDITIONS[rule.condition]) {
    const check = CONDITIONS[rule.condition](labelSheet);
    if (!check.ok) return { allowed: false, reason: check.reason };
  }
  return { allowed: true };
}

// Obtenir les transitions possibles pour un état + rôle
export function getAvailableTransitions(
  currentStatus: LabelStatus,
  userRole: UserRole,
  labelSheet: any
): { to: LabelStatus; allowed: boolean; reason?: string }[] {
  return TRANSITIONS
    .filter((t) => t.from === currentStatus)
    .map((t) => ({
      to: t.to,
      ...canTransition(currentStatus, t.to, userRole, labelSheet),
    }));
}
```

---

## Notifications

### Déclenchement automatique sur transition

| Transition | Notification créée | Destinataires |
|---|---|---|
| → QUALITY_REVIEW | "Nouvelle fiche à vérifier : {produit}" | Tous les QUALITE |
| → QUALITY_VALIDATED | "Fiche {produit} validée — prête pour graphisme" | Tous les GRAPHISME |
| → DESIGN_REVIEW | "PDF uploadé pour {produit} — à contrôler" | Tous les QUALITE |
| → DESIGN_IN_PROGRESS (correction) | "Correction demandée sur {produit}" | Tous les GRAPHISME |
| → SENT_TO_PRINTER | "Commande envoyée pour {produit}" | QUALITE + DIRECTION |
| → BAT_RECEIVED | "BAT reçu pour {produit} — à valider" | QUALITE + GRAPHISME |
| → BAT_VALIDATED | "BAT validé pour {produit} — à imprimer" | Tous les ACHATS |
| → RECEIVED | "Étiquettes reçues pour {produit}" | Tous les CONDITIONNEMENT |
| → RECEPTION_CONTROLLED (NC) | "Non-conformité détectée : {produit}" | QUALITE + GRAPHISME |
| → ACTIVE | "Étiquette {produit} active ✅" | DIRECTION |

### Déclenchement sur événements spéciaux

| Événement | Notification | Destinataires |
|---|---|---|
| Audit IA terminé | "Audit IA terminé pour {produit} — {nb} alertes" | QUALITE |
| Nouveau commentaire | "{auteur} a commenté sur {produit}" | Participants de la fiche (tous ceux qui ont déjà interagi) |
| Délai dépassé (cron job) | "⏰ Délai dépassé : étape {X} pour {produit}" | Rôle responsable de l'étape |
| Alerte conformité FAIL | "⚠️ Alerte conformité critique : {produit}" | QUALITE + DIRECTION |

### Implémentation

```typescript
// lib/notifications/notify.ts

import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

export async function notify(params: {
  roles?: UserRole[];        // notifier tous les users de ces rôles
  userIds?: string[];        // ou notifier des users spécifiques
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  let targetUserIds = params.userIds || [];

  if (params.roles?.length) {
    const users = await prisma.user.findMany({
      where: { role: { in: params.roles }, isActive: true },
      select: { id: true },
    });
    targetUserIds = [...targetUserIds, ...users.map((u) => u.id)];
  }

  // Dédupliquer
  const uniqueIds = [...new Set(targetUserIds)];

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    })),
  });
}

// Appeler après chaque transition :
export async function notifyTransition(
  labelSheet: { id: string; product: { codePf: string; denominationFr: string } },
  newStatus: string,
  triggeredByUserId: string
) {
  const productName = `${labelSheet.product.codePf} ${labelSheet.product.denominationFr}`;
  const link = `/produits/${labelSheet.product.codePf}`;

  const rules: Record<string, { roles: UserRole[]; title: string }> = {
    QUALITY_REVIEW: { roles: ["QUALITE"], title: `Nouvelle fiche à vérifier : ${productName}` },
    QUALITY_VALIDATED: { roles: ["GRAPHISME"], title: `Fiche validée : ${productName}` },
    DESIGN_REVIEW: { roles: ["QUALITE"], title: `PDF à contrôler : ${productName}` },
    BAT_RECEIVED: { roles: ["QUALITE", "GRAPHISME"], title: `BAT reçu : ${productName}` },
    BAT_VALIDATED: { roles: ["ACHATS"], title: `BAT validé : ${productName}` },
    RECEIVED: { roles: ["CONDITIONNEMENT"], title: `Étiquettes reçues : ${productName}` },
    ACTIVE: { roles: ["DIRECTION"], title: `Étiquette active : ${productName} ✅` },
  };

  const rule = rules[newStatus];
  if (rule) {
    await notify({
      roles: rule.roles,
      type: "STATUS_CHANGE",
      title: rule.title,
      message: `Statut passé à ${newStatus}`,
      link,
    });
  }
}
```

---

## Commentaires sur les fiches

Les commentaires remplacent les échanges par email entre Marie et Fabrice.

### Fonctionnement

- Chaque LabelSheet a un fil de commentaires (modèle `LabelComment`)
- Un commentaire peut référencer un **champ spécifique** via `fieldRef` (ex: `"ingredientsFr"`, `"allegationsSanteFr"`)
- Si `fieldRef` est renseigné, le commentaire est affiché à côté du champ concerné dans l'onglet Étiquette
- Sinon, il apparaît dans un fil général en bas de la fiche

### UI

- Chaque champ éditable a une petite icône 💬 (avec compteur si commentaires existants)
- Clic → popover avec le fil de commentaires pour ce champ
- Fil général accessible via un panneau latéral ou un onglet dédié
- Chaque commentaire : avatar + nom + rôle + date + texte
- Input de nouveau commentaire en bas du fil

### Données

```
LabelComment :
  id
  labelSheetId (FK)
  userId (FK → User)
  content (text)
  fieldRef (nullable — ex: "ingredientsFr", "allegationsSanteFr")
  createdAt
```

---

## Audit log

Chaque action significative est tracée dans `AuditLog`.

### Événements tracés

| Action | entityType | Données enregistrées |
|---|---|---|
| Création produit | Product | Tous les champs initiaux |
| Modification champ | LabelSheet | `{ field: { old: "x", new: "y" } }` |
| Changement statut | LabelSheet | `{ status: { old: "DRAFT", new: "QUALITY_REVIEW" } }` |
| Upload fichier | LabelVersion | `{ fileType: "pdf", fileId: "xxx" }` |
| Validation | LabelSheet | `{ validatedBy: userId }` |
| Audit IA | ConformityCheck | `{ auditResult: { ... } }` |
| Import | Product | `{ source: "excel", filename: "..." }` |
| Justification WARNING | ConformityCheck | `{ checkType: "ALLEGATION", justification: "..." }` |

### Utilisation

- Onglet Historique de la fiche produit : affiche les AuditLog filtrés par `entityId`
- Format : date + heure + avatar user (ou 🤖) + description de l'action + diff si applicable
- Filtrable par type d'action et par utilisateur

---

## Délais et alertes automatiques

### Cibles de délais par étape (issues de TRACABILITE_DELAIS_IMPRIMEURS)

| Étape | Délai cible | Mesure |
|---|---|---|
| Analyse états (QUALITY_REVIEW → QUALITY_VALIDATED) | 3 jours | analysisStartDate → analysisEndDate |
| Envoi externe (QUALITY_VALIDATED → SENT_TO_PRINTER) | 12 jours | — |
| Envoi commande (SENT_TO_PRINTER → réel) | 2 jours | orderSendDate |
| Validation BAT (BAT_RECEIVED → BAT_VALIDATED) | 6 jours | batReceivedDate → batValidatedDate |
| Impression (BAT_VALIDATED → RECEIVED) | 20 jours | printStartDate → receptionDate |

### Job de vérification (cron quotidien)

```
Chaque jour à 8h :
  Pour chaque LabelSheet en statut intermédiaire (pas DRAFT, pas ACTIVE, pas ARCHIVED) :
    Calculer le temps passé dans le statut actuel
    Si > délai cible × 1.2 (marge 20%) :
      Créer notification "Délai dépassé" pour le rôle responsable
      Si > délai cible × 2 :
        Créer notification "Délai critique" pour DIRECTION
```
