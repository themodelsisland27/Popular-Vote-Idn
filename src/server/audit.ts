import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';

export async function logAdminAction({
  adminEmail,
  action,
  targetEntity,
  targetId,
  details,
  ipAddress,
}: {
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId?: string | number | null;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      adminEmail,
      action,
      targetEntity,
      targetId: targetId ? String(targetId) : null,
      details: details || '',
      ipAddress: ipAddress || '127.0.0.1',
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
