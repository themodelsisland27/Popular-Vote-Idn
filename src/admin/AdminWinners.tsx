import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Edit2, Trash2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { apiRequest, formatDateWITA } from '../api/client.ts';
import { WinnerItem, EventItem, CandidateItem } from '../types/index.ts';

export const AdminWinners: React.FC = () => {
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWinner, setEditingWinner] = useState<Partial<WinnerItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [winList, evList, candList] = await Promise.all([
        apiRequest('/api/admin/winners'),
        apiRequest('/api/admin/events'),
        apiRequest('/api/admin/candidates'),
      ]);
      setWinners(winList);
      setEvents(evList);
      setCandidates(candList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    const defaultEventId = events[0]?.id || 1;
    setEditingWinner({
      eventId: defaultEventId,
      candidateId: candidates.find((c) => c.eventId === defaultEventId)?.id || 1,
      positionTitle: 'Juara 1 / Winner',
      rankOrder: 1,
      isPublished: true,
      notes: 'Pemenang resmi pilihan publik',
    });
    setIsModalOpen(true);
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingWinner, setDeletingWinner] = useState<WinnerItem | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast((prev) => (prev?.message === message ? null : prev)), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingWinner?.id) {
        await apiRequest(`/api/admin/winners/${editingWinner.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingWinner),
        });
        showToast('Penetapan pemenang berhasil diperbarui', 'success');
      } else {
        await apiRequest('/api/admin/winners', {
          method: 'POST',
          body: JSON.stringify(editingWinner),
        });
        showToast('Penetapan pemenang berhasil diterbitkan', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('Gagal menyimpan pemenang: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deletingWinner) return;
    try {
      await apiRequest(`/api/admin/winners/${deletingWinner.id}`, { method: 'DELETE' });
      setDeletingWinner(null);
      loadData();
      showToast('Penetapan pemenang berhasil dihapus', 'success');
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const candsForWinner = candidates.filter((c) => c.eventId === Number(editingWinner?.eventId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pengesahan Pemenang</h2>
          <p className="text-xs text-slate-500">
            Tentukan juara resmi, urutan peringkat, dan terbitkan pengumuman pemenang ke publik.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tetapkan Pemenang</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-3.5 px-4">Peringkat</th>
                <th className="py-3.5 px-4">Gelar Juara</th>
                <th className="py-3.5 px-4">Kontestan</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {winners.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-black text-amber-600 text-sm">#{w.rankOrder}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{w.positionTitle}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {w.candidateName} (#{w.candidateNumber})
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{w.eventTitle}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {w.isPublished ? 'Dipublikasikan' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingWinner(w);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingWinner(w)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Penetapan Pemenang"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && editingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-amber-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Tetapkan Pemenang Resmi</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Event *</label>
                <select
                  required
                  value={editingWinner.eventId || ''}
                  onChange={(e) => setEditingWinner({ ...editingWinner, eventId: Number(e.target.value) })}
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
                  value={editingWinner.candidateId || ''}
                  onChange={(e) => setEditingWinner({ ...editingWinner, candidateId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {candsForWinner.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.candidateNumber} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gelar / Posisi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Juara 1 / Winner"
                    value={editingWinner.positionTitle || ''}
                    onChange={(e) => setEditingWinner({ ...editingWinner, positionTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Peringkat</label>
                  <input
                    type="number"
                    min={1}
                    value={editingWinner.rankOrder || 1}
                    onChange={(e) => setEditingWinner({ ...editingWinner, rankOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pemenang</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan pengesahan atau prestasi..."
                  value={editingWinner.notes || ''}
                  onChange={(e) => setEditingWinner({ ...editingWinner, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWinner.isPublished !== false}
                    onChange={(e) => setEditingWinner({ ...editingWinner, isPublished: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Terbitkan ke Halaman Pemenang Publik</span>
                </label>
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pemenang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETE WINNER */}
      {deletingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Penetapan Pemenang</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus gelar <strong>"{deletingWinner.positionTitle}"</strong> untuk peserta <strong>{deletingWinner.candidateName}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWinner(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-500/50'
              : 'bg-rose-950 text-white border-rose-500/50'
          }`}
        >
          <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
