import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import { admins } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// In-memory session store mapped to admin token with expiration
interface AdminSession {
  adminId: number;
  email: string;
  fullName: string;
  expiresAt: number;
}

const sessions = new Map<string, AdminSession>();

export function createAdminSession(adminId: number, email: string, fullName: string): string {
  const token = 'pvi_adm_' + crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, { adminId, email, fullName, expiresAt });
  return token;
}

export function revokeAdminSession(token: string) {
  sessions.delete(token);
}

export interface AdminAuthRequest extends Request {
  admin?: AdminSession;
}

export async function requireAdmin(req: AdminAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak: Token otentikasi admin diperlukan' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Sesi admin tidak valid atau telah kedaluwarsa' });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Sesi admin telah kedaluwarsa, silakan login kembali' });
  }

  req.admin = session;
  next();
}
