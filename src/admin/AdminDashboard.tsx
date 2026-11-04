import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Vote,
  Receipt,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
  FileCheck,
  ArrowRight,
  Eye
} from 'lucide-react';
import { apiRequest, formatIDR, formatDateWITA, formatNumber } from '../api/client.ts';

interface AdminDashboardProps {
  onNavigateSection: (section: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateSection }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/admin/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Menghitung analitik platform dari Cloud SQL...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recentTransactions = data?.recentTransactions || [];
  const recentLogs = data?.recentLogs || [];
  const topCandidates = data?.topCandidates || [];
  const pendingProofsCount = kpis.pendingProofsCount || 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-200 border border-white/20 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            <span>Single Administrator Central Command</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Ringkasan Operasional & Transaksi
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
            Seluruh data di bawah dihitung langsung dari basis data PostgreSQL Cloud SQL secara realtime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateSection('events')}
            className="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Event Baru</span>
          </button>
          <button
            onClick={loadDashboard}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ACTION BANNER: PENDING PAYMENT PROOFS AWAITING ADMIN ACC */}
      {pendingProofsCount > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>{pendingProofsCount} Bukti Pembayaran Menunggu ACC</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  Perlu Tindakan
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Voter telah mengunggah bukti transfer. Konfirmasi & ACC sekarang agar suara langsung masuk ke Leaderboard.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateSection('transactions')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <span>Buka & ACC Bukti Bayar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Total Gross Revenue */}
        <div className="col-span-2 sm:col-span-1 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              Rp
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block truncate">
            {formatIDR(kpis.grossRevenue || 0)}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
            Transaksi terverifikasi
          </span>
        </div>

        {/* Total Votes */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Suara</span>
            <Vote className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-blue-700 block">
            {formatNumber(kpis.totalVotes || 0)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Sah di database
          </span>
        </div>

        {/* Menunggu ACC Bukti Bayar */}
        <div
          onClick={() => onNavigateSection('transactions')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-400 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Menunggu ACC</span>
            <FileCheck className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 block">
            {pendingProofsCount}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Bukti bayar voter
          </span>
        </div>

        {/* Active Events */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Event Aktif</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block">
            {kpis.activeEvents || 0}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            dari {kpis.totalEvents || 0} total event
          </span>
        </div>

        {/* Total Candidates */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kontestan</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block">
            {kpis.totalCandidates || 0}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Terdaftar di sistem
          </span>
        </div>
      </div>

      {/* Main Charts & Rankings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Candidates by Vote Share */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Top Kontestan Terpopuler</h3>
            <button
              onClick={() => onNavigateSection('candidates')}
              className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Kelola
            </button>
          </div>

          <div className="space-y-3">
            {topCandidates.map((cand: any, idx: number) => {
              const maxVotes = topCandidates[0]?.totalVotes || 1;
              const barWidth = Math.max(10, Math.min(100, Math.round((cand.totalVotes / maxVotes) * 100)));

              return (
                <div key={cand.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                      <span className="w-4 text-slate-400 font-bold">{idx + 1}.</span>
                      <span>{cand.name}</span>
                    </span>
                    <span className="font-black text-blue-700">{formatNumber(cand.totalVotes)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">{cand.eventTitle}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Transaksi Pembayaran Terbaru</h3>
            <button
              onClick={() => onNavigateSection('transactions')}
              className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Lihat Seluruh Transaksi
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">Belum ada transaksi tercatat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="pb-2.5 font-bold">Kode</th>
                    <th className="pb-2.5 font-bold">Kandidat</th>
                    <th className="pb-2.5 font-bold">Voter</th>
                    <th className="pb-2.5 font-bold">Nominal</th>
                    <th className="pb-2.5 font-bold">Bukti Bayar</th>
                    <th className="pb-2.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 font-mono font-bold text-blue-700 truncate max-w-[130px]">
                        {tx.transactionCode}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800">{tx.candidateName}</td>
                      <td className="py-2.5 text-slate-600">{tx.voterName}</td>
                      <td className="py-2.5 font-bold text-slate-900">{formatIDR(tx.amount)}</td>
                      <td className="py-2.5">
                        {tx.paymentProofUrl ? (
                          <span
                            onClick={() => onNavigateSection('transactions')}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ada Bukti</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'pending'
                              ? tx.paymentProofUrl
                                ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                                : 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.status === 'pending' && tx.paymentProofUrl
                            ? 'Menunggu ACC'
                            : tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Audit Activity Stream */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Audit Log Sistem Terkini</h3>
          </div>
          <button
            onClick={() => onNavigateSection('security')}
            className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            Buka Riwayat Lengkap
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentLogs.map((log: any) => (
            <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-900 mr-2">{log.action}</span>
                <span className="text-slate-600">{log.details}</span>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">{formatDateWITA(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
