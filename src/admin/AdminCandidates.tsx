import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Filter,
  Instagram,
  Sparkles,
  Camera,
  X,
  Check,
  RefreshCw,
  Layers
} from 'lucide-react';
import { apiRequest, formatNumber } from '../api/client.ts';
import { CandidateItem, EventItem, EventCategory } from '../types/index.ts';

// Preset portrait photos for quick selection if user does not have a local file ready
const PRESET_CANDIDATE_PHOTOS = [
  {
    name: 'Model Portrait 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Model Portrait 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Model Portrait 3',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Model Portrait 4',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Model Portrait 5',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  },
];

export const AdminCandidates: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // In-App Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Partial<CandidateItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete Confirmation Modal
  const [deletingCandidate, setDeletingCandidate] = useState<CandidateItem | null>(null);

  // CSV Import Modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvEventId, setCsvEventId] = useState('');
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [candList, evList, catList] = await Promise.all([
        apiRequest(
          selectedEventId !== 'all'
            ? `/api/admin/candidates?eventId=${selectedEventId}`
            : '/api/admin/candidates'
        ),
        apiRequest('/api/admin/events'),
        apiRequest('/api/admin/categories'),
      ]);
      setCandidates(candList);
      setEvents(evList);
      setCategories(catList);
      if (evList.length > 0 && !csvEventId) {
        setCsvEventId(String(evList[0].id));
      }
    } catch (err: any) {
      console.error('Failed to load candidates:', err);
      showToast('Gagal memuat peserta: ' + (err.message || 'Error server'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedCategoryId('all');
  }, [selectedEventId]);

  const handleCreateNew = () => {
    const defaultEventId = selectedEventId !== 'all' ? Number(selectedEventId) : events[0]?.id || 1;
    const catIdNum = selectedCategoryId !== 'all' ? Number(selectedCategoryId) : undefined;

    // Hitung nomor urut otomatis berdasarkan kategori agar berurutan
    const candidatesInGroup = candidates.filter(
      (c) => c.eventId === defaultEventId && (!catIdNum || c.categoryId === catIdNum)
    );
    const nextSequence = candidatesInGroup.length + 1;
    const autoNumber = String(nextSequence).padStart(2, '0');

    setEditingCandidate({
      eventId: defaultEventId,
      categoryId: catIdNum || null,
      candidateNumber: autoNumber,
      name: '',
      titleTag: '',
      photoUrl: PRESET_CANDIDATE_PHOTOS[0].url,
      bio: '',
      instagram: '',
      isPublished: true,
      displayOrder: nextSequence,
    });
    setIsModalOpen(true);
    setErrorMsg('');
  };

  const handleEdit = (c: CandidateItem) => {
    setEditingCandidate({ ...c });
    setIsModalOpen(true);
    setErrorMsg('');
  };

  // Handle Photo File Upload via FileReader
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result && editingCandidate) {
        setEditingCandidate({
          ...editingCandidate,
          photoUrl: result,
        });
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const executeDelete = async () => {
    if (!deletingCandidate) return;
    try {
      await apiRequest(`/api/admin/candidates/${deletingCandidate.id}`, { method: 'DELETE' });
      const delName = deletingCandidate.name;
      setDeletingCandidate(null);
      await loadData();
      showToast(`Peserta "${delName}" berhasil dihapus`, 'success');
    } catch (err: any) {
      showToast('Gagal menghapus peserta: ' + (err.message || 'Error server'), 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate?.name || !editingCandidate?.candidateNumber || !editingCandidate?.photoUrl) {
      setErrorMsg('Nomor peserta, nama, dan foto wajib diisi/diunggah');
      return;
    }
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingCandidate.id) {
        await apiRequest(`/api/admin/candidates/${editingCandidate.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingCandidate),
        });
        showToast(`Peserta "${editingCandidate.name}" berhasil diperbarui`, 'success');
      } else {
        await apiRequest('/api/admin/candidates', {
          method: 'POST',
          body: JSON.stringify(editingCandidate),
        });
        showToast(`Peserta "${editingCandidate.name}" berhasil ditambahkan`, 'success');
      }
      setIsModalOpen(false);
      setEditingCandidate(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan peserta');
    } finally {
      setSaving(false);
    }
  };

  // CSV Import Parsing
  const handleImportCsv = async () => {
    if (!csvEventId || !csvText.trim()) {
      showToast('Pilih event dan masukkan baris data CSV', 'error');
      return;
    }
    setImporting(true);

    try {
      const lines = csvText.trim().split('\n');
      const rows = [];
      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          // Format: candidateNumber, name, titleTag, photoUrl, bio, instagram
          rows.push({
            candidateNumber: parts[0],
            name: parts[1],
            titleTag: parts[2] || '',
            photoUrl: parts[3] || PRESET_CANDIDATE_PHOTOS[0].url,
            bio: parts[4] || '',
            instagram: parts[5] || '',
          });
        }
      }

      await apiRequest('/api/admin/candidates/import-csv', {
        method: 'POST',
        body: JSON.stringify({ eventId: Number(csvEventId), rows }),
      });

      setIsCsvModalOpen(false);
      setCsvText('');
      await loadData();
      showToast(`Berhasil mengimpor ${rows.length} kontestan`, 'success');
    } catch (err: any) {
      showToast('Gagal mengimpor CSV: ' + (err.message || 'Error server'), 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/admin/reports/candidates', '_blank');
  };

  const availableCategories =
    selectedEventId !== 'all'
      ? categories.filter((cat) => cat.eventId === Number(selectedEventId))
      : categories;

  const filtered = candidates
    .filter((c) => {
      const matchesCategory =
        selectedCategoryId === 'all' || String(c.categoryId) === String(selectedCategoryId);
      const matchesSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.candidateNumber.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // 1. Urutkan berdasarkan Kategori terlebih dahulu
      const catA = a.categoryName || 'Z';
      const catB = b.categoryName || 'Z';
      if (catA !== catB) return catA.localeCompare(catB);

      // 2. Kemudian urutkan secara sekuensial berdasarkan nomor urut peserta
      const numA = parseInt(a.candidateNumber.replace(/\D/g, ''), 10);
      const numB = parseInt(b.candidateNumber.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
      return (a.candidateNumber || '').localeCompare(b.candidateNumber || '');
    });

  const eventCategories = categories.filter((cat) => cat.eventId === editingCandidate?.eventId);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Peserta / Kontestan</h2>
          <p className="text-xs text-slate-500">
            Daftarkan peserta untuk setiap event, urutkan berdasarkan kategori, unggah foto profil, atur nomor peserta, dan import via CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Peserta</span>
          </button>
        </div>
      </div>

      {/* Filters Bar: Event, Category, Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Event Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:w-56 text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Event Kompetisi</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Layers className="w-4 h-4 text-blue-500 shrink-0" />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full sm:w-52 text-xs font-semibold py-1.5 px-3 rounded-xl border border-blue-200 bg-blue-50/40 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori ({availableCategories.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nomor atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Memuat peserta...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3.5 px-4">Kontestan</th>
                  <th className="py-3.5 px-4">Event</th>
                  <th className="py-3.5 px-4">Kategori / Gelar</th>
                  <th className="py-3.5 px-4">Perolehan Suara</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                              #{c.candidateNumber}
                            </span>
                            <h4 className="font-bold text-slate-900">{c.name}</h4>
                          </div>
                          {c.instagram && (
                            <span className="text-[10px] text-pink-600 block">{c.instagram}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-[160px] truncate">
                      {c.eventTitle}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 block">{c.categoryName || 'Umum'}</span>
                      {c.titleTag && <span className="text-[10px] text-slate-400">{c.titleTag}</span>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-black text-blue-700 text-sm">{formatNumber(c.totalVotes)}</span>
                      <span className="text-[10px] text-slate-400 ml-1">Suara Sah</span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {c.isPublished ? 'Publik' : 'Disembunyikan'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Edit Peserta"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCandidate(c)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus Peserta"
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
      )}

      {/* Edit / Create Candidate Modal */}
      {isModalOpen && editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">
                  {editingCandidate.id ? 'Edit Data Peserta' : 'Tambah Peserta Baru'}
                </h3>
                <p className="text-xs text-slate-400">Hubungkan peserta dengan event dan unggah foto profil</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Event & Category Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event *</label>
                  <select
                    required
                    value={editingCandidate.eventId || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, eventId: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={editingCandidate.categoryId || ''}
                    onChange={(e) =>
                      setEditingCandidate({
                        ...editingCandidate,
                        categoryId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">(Tanpa Kategori / Umum)</option>
                    {eventCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nomor Peserta & Nama */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Peserta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 01 / A-12"
                    value={editingCandidate.candidateNumber || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, candidateNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Kontestan"
                    value={editingCandidate.name || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Gelar & Instagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gelar / Tagline</label>
                  <input
                    type="text"
                    placeholder="Contoh: Finalist Jawa Barat"
                    value={editingCandidate.titleTag || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, titleTag: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Instagram (@username)</label>
                  <input
                    type="text"
                    placeholder="@nama.akun"
                    value={editingCandidate.instagram || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, instagram: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* FITUR TAMBAH GAMBAR FOTO PESERTA (URL FOTO DIHILANGKAN SESUAI INSTRUKSI USER) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Foto Profil Peserta *</label>

                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Avatar Preview */}
                  <div className="relative shrink-0">
                    {editingCandidate.photoUrl ? (
                      <div className="relative group">
                        <img
                          src={editingCandidate.photoUrl}
                          alt="Foto Profil Peserta"
                          className="w-24 h-28 object-cover rounded-2xl shadow-md border-2 border-white ring-2 ring-blue-500/30"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-mono font-black text-[9px] shadow-xs">
                          #{editingCandidate.candidateNumber || '00'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-24 h-28 rounded-2xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 gap-1">
                        <Camera className="w-6 h-6 text-slate-300" />
                        <span className="text-[10px]">Belum ada foto</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Pilih Foto dari Komputer / HP</span>
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Disarankan foto close-up vertikal/portrait (JPG, PNG, WEBP, Maksimal 8MB)
                      </p>
                    </div>

                    {editingCandidate.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingCandidate({ ...editingCandidate, photoUrl: '' })}
                        className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Hapus Foto Ini
                      </button>
                    )}
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </div>

                {/* Preset Avatars for fast testing/selection */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
                    Atau gunakan contoh foto model siap pakai:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_CANDIDATE_PHOTOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingCandidate({ ...editingCandidate, photoUrl: preset.url })}
                        className={`shrink-0 rounded-xl overflow-hidden border-2 p-0.5 transition-all cursor-pointer ${
                          editingCandidate.photoUrl === preset.url
                            ? 'border-blue-600 ring-2 ring-blue-500/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-12 h-14 object-cover rounded-lg"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Biografi & Pengalaman</label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi singkat kontestan..."
                  value={editingCandidate.bio || ''}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Publish Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCandidate.isPublished !== false}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, isPublished: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Publikasikan Profil di Website</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETE CANDIDATE */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Data Peserta</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus peserta <strong>"{deletingCandidate.name}"</strong> (#{deletingCandidate.candidateNumber})? Seluruh perolehan suara yang dialokasikan akan dihapus dari leaderboard.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCandidate(null)}
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

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Import Peserta via CSV</h3>
                <p className="text-xs text-slate-400">Format baris: nomor, nama, gelar, photoUrl, bio, instagram</p>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Event</label>
                <select
                  value={csvEventId}
                  onChange={(e) => setCsvEventId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data CSV (Satu per baris)</label>
                <textarea
                  rows={6}
                  placeholder={`01, Aurelia Clarissa, Finalist Jakarta, https://..., Bio singkat, @aurelia\n02, Devan Pratama, Finalist Bandung, https://..., Bio singkat, @devan`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  disabled={importing}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  {importing ? 'Mengimpor...' : 'Proses Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
