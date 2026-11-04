import React, { useState, useEffect } from 'react';
import { FileText, Edit2, Trash2, Plus, CheckCircle2, HelpCircle } from 'lucide-react';
import { apiRequest } from '../api/client.ts';

export const AdminCMS: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Page state
  const [selectedPage, setSelectedPage] = useState<any | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [savingPage, setSavingPage] = useState(false);

  // FAQ Modal
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);

  const loadCMS = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/admin/cms');
      setPages(res.pages || []);
      setFaqs(res.faqs || []);
      if (res.pages && res.pages.length > 0 && !selectedPage) {
        setSelectedPage(res.pages[0]);
        setPageTitle(res.pages[0].title);
        setPageContent(res.pages[0].content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCMS();
  }, []);

  const handleSelectPage = (page: any) => {
    setSelectedPage(page);
    setPageTitle(page.title);
    setPageContent(page.content);
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;
    setSavingPage(true);
    try {
      await apiRequest(`/api/admin/cms/pages/${selectedPage.slug}`, {
        method: 'PUT',
        body: JSON.stringify({ title: pageTitle, content: pageContent }),
      });
      alert('Halaman CMS berhasil disimpan');
      await loadCMS();
    } catch (err: any) {
      alert('Gagal menyimpan halaman: ' + err.message);
    } finally {
      setSavingPage(false);
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaq?.id) {
        await apiRequest(`/api/admin/cms/faqs/${editingFaq.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingFaq),
        });
      } else {
        await apiRequest('/api/admin/cms/faqs', {
          method: 'POST',
          body: JSON.stringify(editingFaq),
        });
      }
      setIsFaqModalOpen(false);
      setEditingFaq(null);
      await loadCMS();
    } catch (err: any) {
      alert('Gagal menyimpan FAQ: ' + err.message);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm('Hapus FAQ ini?')) return;
    try {
      await apiRequest(`/api/admin/cms/faqs/${id}`, { method: 'DELETE' });
      await loadCMS();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Konten Website (CMS)</h2>
        <p className="text-xs text-slate-500">
          Ubah narasi halaman publik, syarat & ketentuan, peraturan voting resmi, serta daftar tanya-jawab (FAQ).
        </p>
      </div>

      {/* Pages Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Page Selector Sidebar */}
        <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-2">
            Halaman Publik
          </span>
          <div className="space-y-1">
            {pages.map((p) => {
              const isSelected = selectedPage?.slug === p.slug;
              return (
                <button
                  key={p.slug}
                  onClick={() => handleSelectPage(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Form */}
        <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs">
          {selectedPage ? (
            <form onSubmit={handleSavePage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Halaman</label>
                <input
                  type="text"
                  required
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Konten ({selectedPage.slug})
                </label>
                <textarea
                  rows={12}
                  required
                  value={pageContent}
                  onChange={(e) => setPageContent(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPage}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  {savingPage ? 'Menyimpan...' : 'Perbarui Halaman'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">Pilih halaman dari daftar di kiri.</div>
          )}
        </div>
      </div>

      {/* FAQ Management Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Kelola Tanya Jawab (FAQ)</h3>
            <p className="text-xs text-slate-500">Tampil di beranda dan halaman FAQ publik</p>
          </div>
          <button
            onClick={() => {
              setEditingFaq({ question: '', answer: '', category: 'General', displayOrder: 1 });
              setIsFaqModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah FAQ</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {faqs.map((faq) => (
            <div key={faq.id} className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-bold">
                    {faq.category}
                  </span>
                  <span>{faq.question}</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed pl-1">{faq.answer}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingFaq(faq);
                    setIsFaqModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteFaq(faq.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Modal */}
      {isFaqModalOpen && editingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">{editingFaq.id ? 'Edit FAQ' : 'Tambah FAQ'}</h3>
              <button onClick={() => setIsFaqModalOpen(false)} className="text-white">✕</button>
            </div>
            <form onSubmit={handleSaveFaq} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pertanyaan *</label>
                <input
                  type="text"
                  required
                  value={editingFaq.question || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jawaban *</label>
                <textarea
                  rows={4}
                  required
                  value={editingFaq.answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editingFaq.category || 'Voting'}
                    onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urutan</label>
                  <input
                    type="number"
                    value={editingFaq.displayOrder || 1}
                    onChange={(e) => setEditingFaq({ ...editingFaq, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md"
                >
                  Simpan FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
