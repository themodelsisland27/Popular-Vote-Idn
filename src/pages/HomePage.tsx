import React, { useState, useEffect } from 'react';
import {
  Vote,
  Trophy,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Search,
  Calendar,
  Users,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Award,
  ChevronRight,
  Flame,
  Clock
} from 'lucide-react';
import { EventItem, WinnerItem } from '../types/index.ts';
import { apiRequest, formatNumber } from '../api/client.ts';

interface HomePageProps {
  onNavigate: (path: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'voting_open' | 'upcoming' | 'completed'>('voting_open');

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsData, winnersData, faqsData] = await Promise.all([
          apiRequest('/api/events'),
          apiRequest('/api/winners'),
          apiRequest('/api/cms/faqs'),
        ]);
        setEvents(eventsData);
        setWinners(winnersData.slice(0, 3));
        setFaqs(faqsData.slice(0, 4));
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter events by tab
  const filteredEvents = events.filter((ev) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'voting_open') return ev.status === 'voting_open' || ev.status === 'published';
    if (activeTab === 'upcoming') return ev.status === 'upcoming';
    if (activeTab === 'completed') return ev.status === 'completed';
    return true;
  });

  const featuredEvents = events.filter((e) => e.isFeatured);

  // Platform dynamic stats
  const totalVotesAcrossPlatform = events.reduce((sum, e) => sum + (e.totalEventVotes || 0), 0);
  const totalCandidatesAcrossPlatform = events.reduce((sum, e) => sum + (e.candidateCount || 0), 0);

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md animate-in fade-in duration-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Event Online Voting Platform #1 di Indonesia</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
              Your Vote, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                Your Power.
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              Platform voting digital terintegrasi untuk berbagai kompetisi bergengsi — dari Modelling Competition, Beauty Pageant, hingga Entertainment Awards. Suara Anda sah, transparan, dan realtime.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={() => onNavigate('events')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Jelajahi Event Sekarang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('check-transaction')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 text-slate-300" />
                <span>Cek Status Transaksi</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <span className="text-2xl sm:text-3xl font-black text-blue-400">
                {events.length}+
              </span>
              <p className="text-xs text-slate-400 font-medium mt-1">Total Event</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <span className="text-2xl sm:text-3xl font-black text-sky-400">
                {formatNumber(totalCandidatesAcrossPlatform)}+
              </span>
              <p className="text-xs text-slate-400 font-medium mt-1">Kandidat Terdaftar</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatNumber(totalVotesAcrossPlatform)}+
              </span>
              <p className="text-xs text-slate-400 font-medium mt-1">Suara Sah Dialokasikan</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">100%</span>
              <p className="text-xs text-slate-400 font-medium mt-1">Audit Terverifikasi</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED EVENTS SHOWCASE */}
      {featuredEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-200/60">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Featured Competitions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Event Pilihan & Terpopuler
              </h2>
            </div>
            <button
              onClick={() => onNavigate('events')}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start md:self-auto"
            >
              <span>Lihat Semua Event</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onNavigate('event-detail', { slug: ev.slug })}
                className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative h-60 overflow-hidden bg-slate-900">
                  <img
                    src={ev.bannerUrl}
                    alt={ev.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                      {ev.eventType}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{ev.status === 'voting_open' ? 'Voting Dibuka' : 'Event Aktif'}</span>
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider block">
                      {ev.organizerName}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-200 transition-colors">
                      {ev.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {ev.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{ev.candidateCount || 0} Peserta Finalis</span>
                    </div>

                    <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                      <span>Lihat Detail & Vote</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. ALL EVENTS DIRECTORY WITH TABS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daftar Seluruh Kompetisi
          </h2>
          <p className="text-sm text-slate-500">
            Pilih event favorit Anda untuk melihat profil kontestan dan memberikan vote dukungan.
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'voting_open', label: 'Voting Sedang Berlangsung' },
            { id: 'upcoming', label: 'Event Mendatang' },
            { id: 'completed', label: 'Event Selesai' },
            { id: 'all', label: 'Semua Event' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Memuat daftar kompetisi...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <p className="text-sm">Tidak ada event dalam kategori status ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onNavigate('event-detail', { slug: ev.slug })}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-slate-900">
                    <img
                      src={ev.bannerUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-md">
                        {ev.eventType}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          ev.status === 'voting_open'
                            ? 'bg-emerald-600 text-white'
                            : ev.status === 'upcoming'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {ev.status === 'voting_open'
                          ? 'Voting Open'
                          : ev.status === 'upcoming'
                          ? 'Upcoming'
                          : 'Completed'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                      {ev.organizerName}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {ev.candidateCount || 0} Kandidat
                  </span>
                  <span className="font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Detail Event</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="bg-slate-100/80 py-16 sm:py-20 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Kemudahan & Kecepatan
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Bagaimana Cara Melakukan Voting?
            </h2>
            <p className="text-sm text-slate-500">
              Hanya butuh 4 langkah mudah untuk mengantarkan sang idola menjadi juara favorit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Pilih Event & Kontestan',
                desc: 'Temukan kompetisi yang sedang berlangsung dan pilih kandidat favorit Anda dari direktori peserta.',
                icon: Users,
              },
              {
                step: '02',
                title: 'Tentukan Paket Suara',
                desc: 'Tersedia pilihan Free Vote serta aneka Paket Vote (Starter, Bronze, Silver, hingga Star Ultimate).',
                icon: Vote,
              },
              {
                step: '03',
                title: 'Bayar via QRIS / VA',
                desc: 'Pindai QRIS dinamis melalui GoPay, OVO, Dana, BCA, Mandiri, atau gunakan Virtual Account bank resmi.',
                icon: ShieldCheck,
              },
              {
                step: '04',
                title: 'Suara Masuk Realtime',
                desc: 'Sistem webhook instan mengalokasikan suara Anda ke database dan leaderboard langsung ter-update.',
                icon: TrendingUp,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
                >
                  <span className="text-4xl font-black text-slate-100 absolute top-2 right-4 select-none">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. HALL OF FAME / WINNERS PREVIEW */}
      {winners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-200">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Hall of Fame</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pemenang Resmi Kompetisi
              </h2>
            </div>
            <button
              onClick={() => onNavigate('winners')}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Lihat Semua Pemenang</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {winners.map((win) => (
              <div
                key={win.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs p-5 text-center flex flex-col items-center space-y-3"
              >
                <div className="relative">
                  <img
                    src={win.candidatePhoto}
                    alt={win.candidateName}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-400/30"
                  />
                  <div className="absolute -bottom-2 -right-1 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {win.positionTitle}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base">{win.candidateName}</h4>
                  <p className="text-xs text-slate-500">{win.eventTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. FAQ PREVIEW */}
      {faqs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-sm text-slate-500">
              Pelajari transparansi, metode pembayaran, dan kesahan suara di platform kami.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2"
              >
                <h4 className="font-bold text-slate-900 text-sm flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{faq.question}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed pl-6.5">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => onNavigate('faq')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Lihat Seluruh Tanya Jawab (FAQ) →
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
