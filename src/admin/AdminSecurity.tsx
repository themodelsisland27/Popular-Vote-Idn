import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { apiRequest, formatDateWITA } from '../api/client.ts';
import { AdminUser, AuditLogItem } from '../types/index.ts';

interface AdminSecurityProps {
  admin: AdminUser;
  onAdminUpdated: (admin: AdminUser) => void;
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({ admin, onAdminUpdated }) => {
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState(admin.email);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await apiRequest('/api/admin/audit-logs');
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Konfirmasi password baru tidak cocok', error: true });
      return;
    }
    setSavingPass(true);
    setPasswordMsg(null);

    try {
      await apiRequest('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ text: 'Password administrator berhasil diperbarui', error: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadLogs();
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Gagal mengubah password', error: true });
    } finally {
      setSavingPass(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMsg(null);

    try {
      await apiRequest('/api/admin/change-email', {
        method: 'POST',
        body: JSON.stringify({ newEmail, password: verifyPassword }),
      });
      setEmailMsg({ text: 'Email administrator berhasil diperbarui', error: false });
      onAdminUpdated({ ...admin, email: newEmail });
      setVerifyPassword('');
      await loadLogs();
    } catch (err: any) {
      setEmailMsg({ text: err.message || 'Gagal mengubah email', error: true });
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Keamanan Administrator & Log Audit</h2>
        <p className="text-xs text-slate-500">
          Ubah kredensial Single Administrator dan tinjau seluruh rekaman log tindakan sistem.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Ubah Password Administrator</h3>
          </div>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passwordMsg.error
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {passwordMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Saat Ini</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru (Min. 8 Karakter)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {savingPass ? 'Memproses...' : 'Ubah Password'}
            </button>
          </form>
        </div>

        {/* Change Email Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Ubah Email Administrator</h3>
          </div>

          {emailMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                emailMsg.error
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {emailMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{emailMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangeEmail} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Administrator Baru</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Verifikasi</label>
              <input
                type="password"
                required
                placeholder="Masukkan password akun Anda saat ini"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingEmail}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {savingEmail ? 'Memproses...' : 'Perbarui Email Admin'}
            </button>
          </form>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Audit Trail Log Permanen</h3>
            <p className="text-xs text-slate-500">Mencatat seluruh tindakan administratif untuk kepatuhan sistem.</p>
          </div>
          <button
            onClick={loadLogs}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
            title="Refresh Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadingLogs ? (
          <div className="py-10 text-center text-slate-400 text-xs">Memuat log audit...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-3">Admin</th>
                  <th className="py-3 px-3">Tindakan</th>
                  <th className="py-3 px-3">Entitas</th>
                  <th className="py-3 px-3">Rincian Audit</th>
                  <th className="py-3 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDateWITA(l.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{l.adminEmail}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-700">{l.action}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{l.targetEntity}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-sm truncate">{l.details}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{l.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
