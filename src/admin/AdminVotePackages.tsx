import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Filter, CheckCircle2, XCircle, Gift, Sparkles } from 'lucide-react';
import { apiRequest, formatIDR } from '../api/client.ts';
import { VotePackage, EventItem } from '../types/index.ts';

export const AdminVotePackages: React.FC = () => {
  const [packages, setPackages] = useState<VotePackage[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Partial<VotePackage> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgList, evList] = await Promise.all([
        apiRequest(selectedEventId !== 'all' ? `/api/admin/vote-packages?eventId=${selectedEventId}` : '/api/admin/vote-packages'),
        apiRequest('/api/admin/events'),
      ]);
      setPackages(pkgList);
      setEvents(evList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingPkg, setDeletingPkg] = useState<VotePackage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast((prev) => (prev?.message === message ? null : prev)), 4000);
  };

  const handleCreate = () => {
    setEditingPkg({
      eventId: selectedEventId !== 'all' ? Number(selectedEventId) : events[0]?.id || 1,
      name: '',
      votesCount: 50,
      bonusVotes: 0,
      price: 50000,
      description: '',
      badgeLabel: '',
      displayOrder: 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleCreateFreeVote = () => {
    setEditingPkg({
      eventId: selectedEventId !== 'all' ? Number(selectedEventId) : events[0]?.id || 1,
      name: 'Paket Free Vote',
      votesCount: 1,
      bonusVotes: 0,
      price: 0,
      description: '1 Suara Vote Gratis (Rp 0)',
      badgeLabel: 'Gratis',
      displayOrder: 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPkg?.id) {
        await apiRequest(`/api/admin/vote-packages/${editingPkg.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingPkg),
        });
        showToast('Paket vote berhasil diperbarui', 'success');
      } else {
        await apiRequest('/api/admin/vote-packages', {
          method: 'POST',
          body: JSON.stringify(editingPkg),
        });
        showToast('Paket vote berhasil dibuat', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('Gagal menyimpan paket: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deletingPkg) return;
    try {
      await apiRequest(`/api/admin/vote-packages/${deletingPkg.id}`, { method: 'DELETE' });
      setDeletingPkg(null);
      loadData();
      showToast('Paket vote berhasil dihapus', 'success');
    } catch (err: any) {
      showToast('Gagal menghapus paket: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kelola Paket Vote</h2>
          <p className="text-xs text-slate-500">
            Atur paket voting per event (Starter, Bronze, Silver, Gold, Platinum, Grand, Star) beserta bonus & harga IDR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCreateFreeVote}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>+ Paket Free Vote (1 Suara)</span>
          </button>

          <button
            onClick={handleCreate}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket Berbayar</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-3.5 px-4">Nama Paket</th>
                <th className="py-3.5 px-4">Jumlah Suara</th>
                <th className="py-3.5 px-4">Bonus Suara</th>
                <th className="py-3.5 px-4">Harga (IDR)</th>
                <th className="py-3.5 px-4">Badge</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      {p.price === 0 && <Gift className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-black text-blue-700 text-sm">{p.votesCount} Suara</td>
                  <td className="py-3 px-4 font-semibold text-emerald-600">
                    {p.bonusVotes > 0 ? `+${p.bonusVotes} Bonus` : '-'}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    {p.price === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        GRATIS (Rp 0)
                      </span>
                    ) : (
                      <span className="text-slate-800">{formatIDR(p.price)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {p.badgeLabel ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {p.badgeLabel}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {p.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingPkg(p);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingPkg(p)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Paket"
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

      {isModalOpen && editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">{editingPkg.id ? 'Edit Paket Vote' : 'Tambah Paket Vote'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event *</label>
                <select
                  required
                  value={editingPkg.eventId || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, eventId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Paket *</label>
                <input
                  type="text"
                  required
                  placeholder="Starter / Silver / Gold / Star"
                  value={editingPkg.name || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Suara Pokok *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingPkg.votesCount || 10}
                    onChange={(e) => setEditingPkg({ ...editingPkg, votesCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bonus Suara</label>
                  <input
                    type="number"
                    min={0}
                    value={editingPkg.bonusVotes || 0}
                    onChange={(e) => setEditingPkg({ ...editingPkg, bonusVotes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Harga Paket (Rupiah IDR) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  value={editingPkg.price || 0}
                  onChange={(e) => setEditingPkg({ ...editingPkg, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Label Badge (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Populer / Best Value"
                    value={editingPkg.badgeLabel || ''}
                    onChange={(e) => setEditingPkg({ ...editingPkg, badgeLabel: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    value={editingPkg.displayOrder || 1}
                    onChange={(e) => setEditingPkg({ ...editingPkg, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPkg.isActive !== false}
                    onChange={(e) => setEditingPkg({ ...editingPkg, isActive: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Paket Aktif & Dapat Dibeli</span>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETE VOTE PACKAGE */}
      {deletingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Paket Vote</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus paket <strong>"{deletingPkg.name}"</strong> ({deletingPkg.votesCount} Suara)?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPkg(null)}
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
