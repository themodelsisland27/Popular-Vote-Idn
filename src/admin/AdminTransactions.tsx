import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Download,
  Building2,
  QrCode,
  Sparkles,
  ExternalLink,
  Eye,
  FileCheck,
  XCircle,
  X,
  Check,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { apiRequest, formatIDR, formatDateWITA } from '../api/client.ts';
import { TransactionItem } from '../types/index.ts';

export const AdminTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // In-App Toast Notification (replaces window.alert)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // In-App Confirm ACC Modal (replaces window.confirm)
  const [confirmingAccTx, setConfirmingAccTx] = useState<TransactionItem | null>(null);

  // Proof Modal
  const [viewingProofTx, setViewingProofTx] = useState<TransactionItem | null>(null);

  // Refund Modal
  const [refundingTx, setRefundingTx] = useState<TransactionItem | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Reject Modal
  const [rejectingTx, setRejectingTx] = useState<TransactionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('Bukti transfer tidak valid atau dana belum masuk rekening');

  const [processing, setProcessing] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const data = await apiRequest(`/api/admin/transactions?${params.toString()}`);
      setTransactions(data);
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memuat transaksi: ' + (err.message || 'Koneksi bermasalah'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter]);

  // List of transactions currently awaiting verification (Pending Verification Queue)
  const pendingQueueTransactions = transactions.filter(
    (t) =>
      (t.status === 'pending_verification' ||
        (t.status === 'pending' && Boolean(t.paymentProofUrl))) &&
      !t.votesAllocated
  );

  // ACC Pembayaran Execute
  const executeAccPayment = async (tx: TransactionItem) => {
    setProcessing(true);
    try {
      await apiRequest(`/api/admin/transactions/${tx.id}/acc-payment`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Dikonfirmasi & Di-ACC resmi melalui Admin Portal CMS',
        }),
      });

      if (viewingProofTx?.id === tx.id) {
        setViewingProofTx(null);
      }
      if (confirmingAccTx?.id === tx.id) {
        setConfirmingAccTx(null);
      }

      await loadTransactions();
      showToast(
        `Pembayaran ${tx.transactionCode} BERHASIL DI-ACC! +${tx.voteCount} suara otomatis ditambahkan ke Leaderboard kandidat ${tx.candidateName}.`,
        'success'
      );
    } catch (err: any) {
      showToast('Gagal meng-ACC pembayaran: ' + (err.message || 'Terjadi kesalahan sistem'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Tolak Pembayaran
  const handleConfirmReject = async () => {
    if (!rejectingTx) return;
    setProcessing(true);
    try {
      await apiRequest(`/api/admin/transactions/${rejectingTx.id}/reject-payment`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const rejectedCode = rejectingTx.transactionCode;
      setRejectingTx(null);
      if (viewingProofTx?.id === rejectingTx.id) {
        setViewingProofTx(null);
      }
      await loadTransactions();
      showToast(`Transaksi ${rejectedCode} telah ditolak. Status diperbarui ke gagal.`, 'success');
    } catch (err: any) {
      showToast('Gagal menolak pembayaran: ' + (err.message || 'Kesalahan sistem'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Refund Transaksi
  const handleProcessRefund = async () => {
    if (!refundingTx) return;
    setProcessing(true);
    try {
      await apiRequest(`/api/admin/transactions/${refundingTx.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason: refundReason }),
      });
      const refundedCode = refundingTx.transactionCode;
      const votesPulled = refundingTx.voteCount;
      setRefundingTx(null);
      setRefundReason('');
      await loadTransactions();
      showToast(
        `Transaksi ${refundedCode} berhasil di-refund. -${votesPulled} suara ditarik dari Leaderboard secara aman.`,
        'success'
      );
    } catch (err: any) {
      showToast('Gagal memproses refund: ' + (err.message || 'Kesalahan server'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/admin/reports/transactions', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-500/50'
              : 'bg-rose-950 text-white border-rose-500/50'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Transaksi & ACC Suara</h2>
          <p className="text-xs text-slate-500">
            Periksa bukti pembayaran yang diunggah voter, lakukan konfirmasi (ACC) untuk memasukkan suara langsung ke Leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadTransactions}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Muat Ulang Transaksi"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* DEDICATED PENDING VERIFICATION QUEUE SECTION */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl border-2 border-amber-300/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Antrean Verifikasi Pembayaran (Pending Verification Queue)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                  {pendingQueueTransactions.length} Menunggu Tindakan
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Bukti transfer yang diunggah oleh voter. Klik <strong>ACC Bayar</strong> untuk langsung memasukkan suara ke Leaderboard event terkait.
              </p>
            </div>
          </div>
        </div>

        {pendingQueueTransactions.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xs rounded-2xl border border-amber-200/60 p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="font-bold text-slate-800">Semua bukti pembayaran telah selesai diverifikasi!</p>
            <span className="text-[11px] text-slate-400">Tidak ada antrean pembayaran yang pending saat ini.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingQueueTransactions.map((tx) => (
              <div
                key={`queue-${tx.id}`}
                className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {tx.transactionCode}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {formatDateWITA(tx.paymentProofUploadedAt || tx.createdAt)}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 ring-1 ring-amber-300">
                    Menunggu Verifikasi
                  </span>
                </div>

                {/* Body Details */}
                <div className="flex gap-3">
                  {/* Proof Thumbnail */}
                  <div className="shrink-0 relative group">
                    {tx.paymentProofUrl ? (
                      <div className="relative">
                        <img
                          src={tx.paymentProofUrl}
                          alt="Bukti Transfer"
                          onClick={() => setViewingProofTx(tx)}
                          className="w-20 h-24 object-cover rounded-xl border border-slate-200 group-hover:ring-2 group-hover:ring-amber-500 cursor-pointer shadow-xs transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setViewingProofTx(tx)}
                          className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          title="Perbesar Bukti"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 text-center p-1">
                        Belum ada foto
                      </div>
                    )}
                  </div>

                  {/* Transaction Metadata */}
                  <div className="flex-1 min-w-0 text-xs space-y-1">
                    <div className="font-bold text-slate-900 truncate">
                      {tx.candidateName}{' '}
                      <span className="text-blue-600 font-extrabold">(#{tx.candidateNumber})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{tx.eventTitle}</div>

                    <div className="pt-1">
                      <div className="text-[11px] text-slate-600">
                        Voter: <strong className="text-slate-800">{tx.voterName}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {tx.voterPhone || tx.voterEmail || '-'}
                      </div>
                    </div>

                    <div className="pt-1 flex items-baseline justify-between gap-1">
                      <span className="text-xs font-black text-slate-900">{formatIDR(tx.amount)}</span>
                      <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        +{tx.voteCount} Suara
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmingAccTx(tx)}
                    disabled={processing}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-xs shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>ACC Bayar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingProofTx(tx)}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    title="Periksa Bukti"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectingTx(tx)}
                    disabled={processing}
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                    title="Tolak Transaksi"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'pending_verification', label: 'Pending Verification', count: pendingQueueTransactions.length },
            { id: 'paid', label: 'Lunas / Di-ACC' },
            { id: 'pending', label: 'Pending (Belum Upload)' },
            { id: 'refunded', label: 'Refunded' },
            { id: 'failed', label: 'Ditolak / Gagal' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{st.label}</span>
              {typeof st.count === 'number' && st.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    statusFilter === st.id ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'
                  }`}
                >
                  {st.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kode atau nama voter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTransactions()}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Memuat data transaksi dari Cloud SQL...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
          Tidak ada transaksi yang cocok dengan filter.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3.5 px-4">Kode Transaksi</th>
                  <th className="py-3.5 px-4">Kandidat & Event</th>
                  <th className="py-3.5 px-4">Voter</th>
                  <th className="py-3.5 px-4">Suara</th>
                  <th className="py-3.5 px-4">Nominal</th>
                  <th className="py-3.5 px-4">Bukti Bayar</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-700 block truncate max-w-[140px]">
                        {tx.transactionCode}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDateWITA(tx.createdAt)}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[160px]">
                        {tx.candidateName} (#{tx.candidateNumber})
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[160px] block">
                        {tx.eventTitle}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{tx.voterName}</span>
                      <span className="text-[10px] text-slate-400 block">{tx.voterPhone || tx.voterEmail || '-'}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-black text-blue-700 text-sm">+{tx.voteCount} Suara</span>
                      <span
                        className={`text-[10px] font-semibold block ${
                          tx.votesAllocated ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {tx.votesAllocated ? '✓ Masuk Leaderboard' : '⏳ Belum di-ACC'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">{formatIDR(tx.amount)}</td>

                    {/* Bukti Bayar Column */}
                    <td className="py-3 px-4">
                      {tx.paymentProofUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={tx.paymentProofUrl}
                            alt="Bukti Bayar"
                            onClick={() => setViewingProofTx(tx)}
                            className="w-9 h-11 object-cover rounded-md border border-slate-200 hover:ring-2 hover:ring-blue-500 cursor-pointer transition-all shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => setViewingProofTx(tx)}
                            className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum unggah</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.status === 'pending_verification' ||
                              (tx.status === 'pending' && Boolean(tx.paymentProofUrl))
                            ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                            : tx.status === 'pending'
                            ? 'bg-slate-100 text-slate-700'
                            : tx.status === 'refunded'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.status === 'pending_verification'
                          ? 'Pending Verification'
                          : tx.status === 'pending' && tx.paymentProofUrl
                          ? 'Pending Verification'
                          : tx.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(tx.status === 'pending' || tx.status === 'pending_verification') && (
                          <>
                            <button
                              onClick={() => setConfirmingAccTx(tx)}
                              disabled={processing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="ACC Pembayaran & Langsung Masukkan Vote ke Leaderboard"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>ACC Bayar</span>
                            </button>
                            <button
                              onClick={() => setRejectingTx(tx)}
                              disabled={processing}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-[10px] transition-colors cursor-pointer"
                              title="Tolak Transaksi"
                            >
                              Tolak
                            </button>
                          </>
                        )}

                        {tx.status === 'paid' && (
                          <button
                            onClick={() => setRefundingTx(tx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold text-[10px] transition-colors cursor-pointer"
                            title="Refund Transaksi"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: IN-APP KONFIRMASI ACC PEMBAYARAN (REPLACES WINDOW.CONFIRM) */}
      {confirmingAccTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Konfirmasi ACC Pembayaran</h3>
                  <p className="text-xs text-emerald-100">
                    Kode: <span className="font-mono font-bold text-white">{confirmingAccTx.transactionCode}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmingAccTx(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
                <div className="font-black text-sm text-emerald-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Alokasi Suara Otomatis ke Leaderboard</span>
                </div>
                <p className="leading-relaxed">
                  Menekan tombol <strong>"ACC & Masukkan Suara"</strong> akan mengubah status transaksi menjadi{' '}
                  <span className="font-bold underline">PAID / LUNAS</span> dan secara instan menambahkan{' '}
                  <strong className="text-emerald-800 text-sm">+{confirmingAccTx.voteCount} suara</strong> ke kandidat{' '}
                  <strong>{confirmingAccTx.candidateName}</strong> (#{confirmingAccTx.candidateNumber}) pada Leaderboard publik.
                </p>
              </div>

              {/* Transaction details card */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Nominal Transfer</span>
                  <span className="font-black text-slate-900 text-base">{formatIDR(confirmingAccTx.amount)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Jumlah Suara</span>
                  <span className="font-black text-blue-700 text-base">+{confirmingAccTx.voteCount} Suara</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Nama Voter</span>
                  <span className="font-bold text-slate-800 truncate block">{confirmingAccTx.voterName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Event</span>
                  <span className="font-bold text-slate-800 truncate block">{confirmingAccTx.eventTitle}</span>
                </div>
              </div>

              {/* Proof Preview mini */}
              {confirmingAccTx.paymentProofUrl && (
                <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <img
                    src={confirmingAccTx.paymentProofUrl}
                    alt="Bukti Transfer"
                    className="w-14 h-16 object-cover rounded-lg border border-slate-300 shadow-xs"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Bukti Pembayaran Terlampir</span>
                    <span className="text-[11px] text-slate-500 block">
                      Pastikan mutasi rekening sesuai dengan nominal {formatIDR(confirmingAccTx.amount)}.
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmingAccTx(null)}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeAccPayment(confirmingAccTx)}
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-black text-white shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {processing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>{processing ? 'Memproses ACC...' : 'ACC & Masukkan Suara'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW BUKTI PEMBAYARAN */}
      {viewingProofTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-200" />
                  <span>Verifikasi Bukti Pembayaran</span>
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Kode: <span className="font-mono font-bold text-white">{viewingProofTx.transactionCode}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingProofTx(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Transaction Summary Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Nominal</span>
                  <span className="font-bold text-slate-900 text-sm">{formatIDR(viewingProofTx.amount)}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Suara Diterima</span>
                  <span className="font-bold text-blue-700 text-sm">+{viewingProofTx.voteCount} Suara</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Nama Voter</span>
                  <span className="font-bold text-slate-800 truncate block">{viewingProofTx.voterName}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Kandidat</span>
                  <span className="font-bold text-slate-800 truncate block">{viewingProofTx.candidateName}</span>
                </div>
              </div>

              {/* Uploaded Receipt Image */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-2 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-500 mb-2">Foto / Struk Bukti Transfer:</span>
                {viewingProofTx.paymentProofUrl ? (
                  <img
                    src={viewingProofTx.paymentProofUrl}
                    alt="Bukti Transfer"
                    className="max-h-96 w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Belum ada bukti pembayaran yang diunggah.
                  </div>
                )}
                {viewingProofTx.paymentProofUploadedAt && (
                  <span className="text-[10px] text-slate-500 mt-2">
                    Diunggah pada: {formatDateWITA(viewingProofTx.paymentProofUploadedAt)}
                  </span>
                )}
              </div>

              {/* Status / Notes Alert */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Aturan Konfirmasi Tunggal (Single Administrator)</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Ketika tombol <strong>"ACC Bayar"</strong> ditekan, sistem secara otomatis dan instan akan mengalokasikan{' '}
                  <strong>+{viewingProofTx.voteCount} suara</strong> ke kandidat <strong>{viewingProofTx.candidateName}</strong> dan memperbarui Leaderboard secara realtime.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {(viewingProofTx.status === 'pending' || viewingProofTx.status === 'pending_verification') &&
                !viewingProofTx.votesAllocated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingProofTx(null);
                        setConfirmingAccTx(viewingProofTx);
                      }}
                      disabled={processing}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ACC Bayar & Masukkan Vote ke Leaderboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingTx(viewingProofTx)}
                      disabled={processing}
                      className="py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak</span>
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-center py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                    Status: {viewingProofTx.status.toUpperCase()} (Telah Diproses)
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setViewingProofTx(null)}
                  className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TOLAK PEMBAYARAN */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Tolak Pembayaran Transaksi</h3>
                <p className="text-xs text-rose-200">Transaksi akan ditandai gagal dan suara tidak masuk</p>
              </div>
              <button onClick={() => setRejectingTx(null)} className="text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div>
                  Kode: <strong>{rejectingTx.transactionCode}</strong>
                </div>
                <div>
                  Voter: <strong>{rejectingTx.voterName}</strong>
                </div>
                <div>
                  Nominal: <strong>{formatIDR(rejectingTx.amount)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Penolakan *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Misal: Bukti pembayaran palsu, transfer tidak ditemukan di mutasi bank"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={processing || !rejectReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  {processing ? 'Memproses...' : 'Tolak Transaksi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REFUND */}
      {refundingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Refund Transaksi Suara</h3>
                <p className="text-xs text-rose-200">Suara yang pernah dialokasikan akan ditarik dari kandidat</p>
              </div>
              <button onClick={() => setRefundingTx(null)} className="text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div>
                  Kode: <strong>{refundingTx.transactionCode}</strong>
                </div>
                <div>
                  Kontestan: <strong>{refundingTx.candidateName}</strong>
                </div>
                <div>
                  Nominal: <strong>{formatIDR(refundingTx.amount)}</strong>
                </div>
                <div>
                  Suara Ditarik: <strong className="text-rose-600">-{refundingTx.voteCount} Suara</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Refund (Tercatat di Audit Log) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Misal: Pembatalan atas permintaan resmi voter / transfer ganda"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundingTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessRefund}
                  disabled={processing || !refundReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  {processing ? 'Memproses...' : 'Konfirmasi Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
