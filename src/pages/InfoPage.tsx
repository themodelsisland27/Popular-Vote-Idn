import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../api/client.ts';

interface InfoPageProps {
  slug: string;
  onNavigate: (path: string, params?: any) => void;
}

export const InfoPage: React.FC<InfoPageProps> = ({ slug, onNavigate }) => {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState('');

  const isFaq = slug === 'faq';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isFaq) {
          const list = await apiRequest('/api/cms/faqs');
          setFaqs(list);
          if (list.length > 0) setOpenFaqId(list[0].id);
        } else {
          const data = await apiRequest(`/api/cms/pages/${slug}`);
          setPage(data);
        }
      } catch (err) {
        console.error('Failed to load page info:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, isFaq]);

  const filteredFaqs = faqs.filter(
    (f) =>
      !faqSearch.trim() ||
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Informasi Resmi Platform</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {isFaq ? 'Pertanyaan yang Sering Diajukan (FAQ)' : page?.title || 'Informasi'}
        </h1>
        <p className="text-xs text-slate-500">
          POPULAR VOTE ID — "Your Vote, Your Power"
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Memuat informasi...</p>
        </div>
      ) : isFaq ? (
        <div className="space-y-6">
          {/* FAQ Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari pertanyaan seputar voting, pembayaran QRIS, atau leaderboard..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{faq.question}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
          <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {page?.content}
          </div>
        </div>
      )}
    </div>
  );
};
