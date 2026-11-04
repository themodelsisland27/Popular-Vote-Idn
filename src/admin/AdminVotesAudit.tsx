import React, { useState, useEffect } from 'react';
import {
  Vote,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Lock
} from 'lucide-react';
import { apiRequest, formatDateWITA, formatNumber } from '../api/client.ts';
import { EventItem, CandidateItem } from '../types/index.ts';

export const AdminVotesAudit: React.FC = () => {
  const [votes, setVotes] = useState<any[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adjustEventId, setAdjustEventId] = useState<number>(1);
  const [adjustCandidateId, setAdjustCandidateId] = useState<number | ''>('');
  const [deltaVotes, setDeltaVotes] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjusting, setAdjusting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [votesData, evList, candList] = await Promise.all([
        apiRequest(selectedEventId !== 'all' ? `/api/admin/votes?eventId=${selectedEventId}` : '/api/admin/votes'),
        apiRequest('/api/admin/events'),
        apiRequest('/api/admin/candidates'),
      ]);
      setVotes(votesData);
      setEvents(evList);
      setCandidates(candList);
      if (evList.length > 0 && !adjustEventId) {
        setAdjustEventId(evList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustEventId || !adjustCandidateId || !deltaVotes || !adjustReason.trim()) {
      alert('Semua kolom penyesuaian suara termasuk alasan audit wajib diisi');
      return;
    }
    setAdjusting(true);

    try {
      const res = await apiRequest('/api/admin/votes/adjust', {
        method: 'POST',
        body: JSON.stringify({
          eventId: adjustEventId,
          candidateId: adjustCandidateId,
          deltaVotes,
          reason: adjustReason.trim(),
        }),
      });
      alert(res.message);
      setIsModalOpen(false);
      setAdjustReason('');
      await loadData();
    } catch (err: any) {
      alert('Gagal menyesuaikan suara: ' + err.message);
    } finally {
      setAdjusting(false);
    }
  };

  const candsForAdjust = candidates.filter((c) => c.eventId === Number(adjustEventId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Log Suara & Audit Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Pencatatan suara independen dari transaksi dan koreksi manual resmi dengan jejak audit ketat.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold shadow-md flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <Lock className="w-4 h-4 text-blue-400" />
          <span>Penyesuaian Suara Resmi (Audit)</span>
        </button>
      </div>

      {/* Filter by Event */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Seluruh Event Kompetisi</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400 font-semibold">Menampilkan 100 log terbaru</span>
      </div>

      {/* Votes Log Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Memuat log suara...</p>
        </div>
      ) : votes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
          Belum ada rekam suara tersimpan.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Kontestan</th>
                  <th className="py-3.5 px-4">Event</th>
                  <th className="py-3.5 px-4">Tipe Suara</th>
                  <th className="py-3.5 px-4">Jumlah</th>
                  <th className="py-3.5 px-4">IP / Identitas Voter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {votes.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 font-sans">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDateWITA(v.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {v.candidateName} (#{v.candidateNumber})
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {v.eventTitle}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.voteType === 'paid'
                            ? 'bg-blue-100 text-blue-800'
                            : v.voteType === 'free'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {v.voteType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-sm">
                      <span className={v.voteCount > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {v.voteCount > 0 ? `+${v.voteCount}` : v.voteCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 font-mono max-w-xs truncate">
                      {v.voterIdentifier || v.voterIp || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Audit Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Penyesuaian Suara Resmi</h3>
                <p className="text-xs text-slate-400">Seluruh aksi tercatat permanen di Audit Log</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white">✕</button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Event *</label>
                <select
                  required
                  value={adjustEventId}
                  onChange={(e) => {
                    setAdjustEventId(Number(e.target.value));
                    setAdjustCandidateId('');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Kontestan *</label>
                <select
                  required
                  value={adjustCandidateId}
                  onChange={(e) => setAdjustCandidateId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Kontestan --</option>
                  {candsForAdjust.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.candidateNumber} - {c.name} ({formatNumber(c.totalVotes)} suara saat ini)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perubahan Suara (Gunakan tanda minus untuk pengurangan) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50 atau -20"
                  value={deltaVotes}
                  onChange={(e) => setDeltaVotes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Audit Koreksi Suara *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Wajib mencantumkan alasan resmi koreksi, misal: Surat keputusan panitia / diskualifikasi bot / pembatalan transaksi"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjusting || !adjustCandidateId}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-bold text-white shadow-md"
                >
                  {adjusting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
