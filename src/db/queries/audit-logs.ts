import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export interface AuditLogEntry {
  /** Entity family, e.g. "knowledge_document", "audit", "recette". */
  typeEntite: string;
  /** Entity identifier (kept < 255 chars). */
  entiteId: string;
  /** Action verb, e.g. "RAG_INGESTION", "RAG_SUPPRESSION", "AUDIT_ETIQUETTE". */
  action: string;
  utilisateurId: string;
  changements?: unknown;
}

/**
 * Writes one audit-trail entry (the traceability expected by the client,
 * CLAUDE.md §7). Best-effort by design: a logging failure must NEVER break the
 * user-facing action, so errors are caught and logged, not thrown.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      typeEntite: entry.typeEntite,
      entiteId: entry.entiteId.slice(0, 255),
      action: entry.action,
      utilisateurId: entry.utilisateurId,
      changements: entry.changements ?? null,
    });
  } catch (e) {
    console.error("[auditLog] écriture échouée:", e);
  }
}
