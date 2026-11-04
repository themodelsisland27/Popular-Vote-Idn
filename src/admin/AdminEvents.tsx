import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Flame,
  Users,
  Upload,
  Image as ImageIcon,
  X,
  Check,
  RefreshCw,
  Clock
} from 'lucide-react';
import { apiRequest, formatDateWITA, formatNumber } from '../api/client.ts';
import { EventItem } from '../types/index.ts';

// 6 Jenis Kompetisi Resmi POPULAR VOTE ID
export const OFFICIAL_EVENT_TYPES = [
  'Ajang Pencarian Bakat',
  'Modeling Competition',
  'Sport Competition',
  'Festival / Hiburan',
  'Pageant Competition',
  'Penghargaan dan Voting Publik',
];

// Preset banner options for instant selection
const PRESET_BANNERS = [
  {
    title: 'Ajang Pencarian Bakat',
    url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Modeling Competition',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Sport Competition',
    url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Festival / Hiburan',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Pageant Competition',
    url: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Penghargaan dan Voting Publik',
    url: 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=1200&q=80',
  },
];

const toInputDateTime = (dateVal?: string | Date | null) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingEvent, setEditingEvent] = useState<Partial<EventItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // In-App Toast & Confirmation Modal
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/admin/events');
      setEvents(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat event');
      showToast('Gagal memuat data event: ' + (err.message || 'Error server'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreateNew = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setEditingEvent({
      title: '',
      slug: '',
      organizerName: 'POPULAR VOTE ID Official',
      eventType: 'Ajang Pencarian Bakat',
      bannerUrl: PRESET_BANNERS[0].url,
      description: '',
      rules: '',
      votingGuide: '',
      status: 'voting_open',
      votingMode: 'paid',
      isLeaderboardPublic: true,
      showVoteCounts: true,
      isFeatured: false,
      votingStartDate: now.toISOString(),
      votingEndDate: end.toISOString(),
    });
    setIsModalOpen(true);
    setErrorMsg('');
  };

  const handleEdit = (ev: EventItem) => {
    setEditingEvent({ ...ev });
    setIsModalOpen(true);
    setErrorMsg('');
  };

  // Handle Banner Image File Upload via FileReader
  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto banner maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result && editingEvent) {
        setEditingEvent({
          ...editingEvent,
          bannerUrl: result,
        });
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDuplicate = async (id: number) => {
    setDuplicatingId(id);
    try {
      await apiRequest(`/api/admin/events/${id}/duplicate`, { method: 'POST' });
      await loadEvents();
      showToast('Event berhasil diduplikasi sebagai draft baru', 'success');
    } catch (err: any) {
      showToast('Gagal menggandakan event: ' + (err.message || 'Error server'), 'error');
    } finally {
      setDuplicatingId(null);
    }
  };

  const executeDelete = async () => {
    if (!deletingEvent) return;
    try {
      await apiRequest(`/api/admin/events/${deletingEvent.id}`, { method: 'DELETE' });
      const delTitle = deletingEvent.title;
      setDeletingEvent(null);
      await loadEvents();
      showToast(`Event "${delTitle}" berhasil dihapus`, 'success');
    } catch (err: any) {
      showToast('Gagal menghapus event: ' + (err.message || 'Error server'), 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title || !editingEvent?.slug || !editingEvent?.bannerUrl) {
      setErrorMsg('Judul, slug, dan foto banner wajib diisi/diunggah');
      return;
    }
    setSaving(true);
    setErrorMsg('');

    try {
      const payload: any = {
        title: editingEvent.title,
        slug: editingEvent.slug,
        organizerName: editingEvent.organizerName,
        eventType: editingEvent.eventType,
        status: editingEvent.status,
        votingMode: editingEvent.votingMode,
        bannerUrl: editingEvent.bannerUrl,
        description: editingEvent.description || `Kompetisi resmi ${editingEvent.title}`,
        rules: editingEvent.rules || '',
        votingGuide: editingEvent.votingGuide || '',
        isLeaderboardPublic: editingEvent.isLeaderboardPublic !== false,
        showVoteCounts: editingEvent.showVoteCounts !== false,
        isFeatured: Boolean(editingEvent.isFeatured),
        votingStartDate: editingEvent.votingStartDate || null,
        votingEndDate: editingEvent.votingEndDate || null,
      };

      if (editingEvent.id) {
        await apiRequest(`/api/admin/events/${editingEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast(`Event "${editingEvent.title}" berhasil diperbarui`, 'success');
      } else {
        await apiRequest('/api/admin/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast(`Event "${editingEvent.title}" berhasil dibuat`, 'success');
      }
      setIsModalOpen(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan event');
      showToast(err.message || 'Gagal menyimpan event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = events.filter((ev) =>
    ev.title.toLowerCase().includes(search.toLowerCase()) ||
    ev.slug.toLowerCase().includes(search.toLowerCase()) ||
    ev.eventType.toLowerCase().includes(search.toLowerCase())
  );

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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Event</h2>
          <p className="text-xs text-slate-500">
            Kelola kompetisi, terbitkan event baru, atur periode voting (tanggal mulai & berakhir), dan unggah banner.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Event Baru</span>
        </button>
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari event berdasarkan judul, slug, atau jenis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">Total: {filtered.length} Event</span>
      </div>

      {/* Events Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Memuat event...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3.5 px-4">Event & Banner</th>
                  <th className="py-3.5 px-4">Jenis & Penyelenggara</th>
                  <th className="py-3.5 px-4">Periode Voting</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Peserta / Suara</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={ev.bannerUrl}
                          alt={ev.title}
                          className="w-16 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 shadow-2xs"
                        />
                        <div className="min-w-0 max-w-[200px]">
                          <h4 className="font-bold text-slate-900 truncate">{ev.title}</h4>
                          <span className="text-[10px] text-slate-400 block font-mono">/{ev.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 inline-block mb-1">
                        {ev.eventType}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">{ev.organizerName}</span>
                    </td>

                    <td className="py-3 px-4">
                      {ev.votingStartDate || ev.votingEndDate ? (
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Mulai: {ev.votingStartDate ? formatDateWITA(ev.votingStartDate) : '-'}</span>
                          </span>
                          <span className="text-[10px] text-rose-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Selesai: {ev.votingEndDate ? formatDateWITA(ev.votingEndDate) : '-'}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Tidak ditentukan</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.status === 'voting_open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'upcoming'
                            ? 'bg-amber-100 text-amber-800'
                            : ev.status === 'draft'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{ev.candidateCount || 0} Peserta</span>
                      <span className="text-[10px] text-blue-600 block font-semibold">
                        {formatNumber(ev.totalVotes || 0)} Suara
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(ev)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(ev.id)}
                          disabled={duplicatingId === ev.id}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Duplikasi Event"
                        >
                          {duplicatingId === ev.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeletingEvent(ev)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus Event"
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

      {/* Edit / Create Modal */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">
                  {editingEvent.id ? 'Edit Event Kompetisi' : 'Buat Event Baru'}
                </h3>
                <p className="text-xs text-slate-400">Atur parameter kompetisi, tanggal mulai & berakhir voting, serta unggah banner</p>
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul Event *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title || ''}
                    onChange={(e) => {
                      const t = e.target.value;
                      setEditingEvent({
                        ...editingEvent,
                        title: t,
                        slug: editingEvent.id
                          ? editingEvent.slug
                          : t
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/(^-|-$)/g, ''),
                      });
                    }}
                    placeholder="Contoh: Audisi Bintang Pop Indonesia 2027"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL Unik *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.slug || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, slug: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Penyelenggara, Jenis & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penyelenggara</label>
                  <input
                    type="text"
                    value={editingEvent.organizerName || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, organizerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kompetisi *</label>
                  <select
                    value={editingEvent.eventType || OFFICIAL_EVENT_TYPES[0]}
                    onChange={(e) => setEditingEvent({ ...editingEvent, eventType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-900 bg-blue-50/50"
                  >
                    {OFFICIAL_EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Event</label>
                  <select
                    value={editingEvent.status || 'voting_open'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="published">Published</option>
                    <option value="voting_open">Voting Open</option>
                    <option value="voting_closed">Voting Closed</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* FITUR TANGGAL MULAI DAN TANGGAL BERAKHIR VOTE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80">
                <div>
                  <label className="block text-xs font-extrabold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tanggal & Jam Mulai Voting</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={toInputDateTime(editingEvent.votingStartDate)}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        votingStartDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Waktu voting resmi dibuka untuk voter</span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>Tanggal & Jam Berakhir Voting</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={toInputDateTime(editingEvent.votingEndDate)}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        votingEndDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Waktu voting otomatis ditutup</span>
                </div>
              </div>

              {/* FITUR TAMBAH GAMBAR BANNER (URL DIHILANGKAN SESUAI INSTRUKSI USER) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Foto Banner Event *</label>

                {/* Banner Preview & Upload Area */}
                <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col items-center justify-center gap-3 overflow-hidden">
                  {editingEvent.bannerUrl ? (
                    <div className="w-full space-y-2">
                      <div className="relative w-full h-44 rounded-xl overflow-hidden shadow-md border border-slate-200 bg-slate-900">
                        <img
                          src={editingEvent.bannerUrl}
                          alt="Banner Event Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-3">
                          <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs">
                            ✓ Banner Terpasang
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Ganti Gambar Banner dari Komputer / HP</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingEvent({ ...editingEvent, bannerUrl: '' })}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Hapus Banner
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100/70 rounded-xl transition-colors"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-800">
                        Klik untuk Memilih Gambar Banner Event
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Format didukung: JPG, PNG, WEBP (Maksimal 8MB)
                      </span>
                    </div>
                  )}

                  {/* Hidden native file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="hidden"
                  />
                </div>

                {/* Preset Banner Selector (Quick Alternative) */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
                    Atau pilih template banner kompetisi siap pakai:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {PRESET_BANNERS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingEvent({ ...editingEvent, bannerUrl: preset.url })}
                        className={`relative rounded-xl overflow-hidden border-2 text-left p-1 transition-all cursor-pointer ${
                          editingEvent.bannerUrl === preset.url
                            ? 'border-blue-600 ring-2 ring-blue-500/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-12 object-cover rounded-lg"
                        />
                        <span className="text-[9px] font-bold text-slate-700 truncate block mt-1">
                          {preset.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Informasi singkat tentang event kompetisi ini..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rules & Voting Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peraturan Kompetisi</label>
                  <textarea
                    rows={2}
                    value={editingEvent.rules || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, rules: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Panduan Voting</label>
                  <textarea
                    rows={2}
                    value={editingEvent.votingGuide || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, votingGuide: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingEvent.isLeaderboardPublic !== false}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isLeaderboardPublic: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Leaderboard Terbuka untuk Publik</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingEvent.showVoteCounts !== false}
                    onChange={(e) => setEditingEvent({ ...editingEvent, showVoteCounts: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Tampilkan Angka Perolehan Suara</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingEvent.isFeatured)}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isFeatured: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Tampilkan di Featured Hero</span>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Menyimpan...' : 'Simpan Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETE EVENT */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Event Kompetisi</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus event <strong>"{deletingEvent.title}"</strong>? Seluruh peserta, suara, dan data transaksi terkait event ini akan dihapus dari sistem.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
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
    </div>
  );
};
