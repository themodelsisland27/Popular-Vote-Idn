import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Trophy,
  Vote,
  ShieldCheck,
  Search,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  Award,
  Share2,
  Check,
  Building,
  RefreshCw,
  Layers
} from 'lucide-react';
import { EventItem, CandidateItem, EventCategory } from '../types/index.ts';
import { apiRequest, formatNumber } from '../api/client.ts';
import { VotingModal } from '../components/VotingModal.tsx';
import { CandidateModal } from '../components/CandidateModal.tsx';

interface EventDetailPageProps {
  slug: string;
  onNavigate: (path: string, params?: any) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ slug, onNavigate }) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'candidates' | 'leaderboard' | 'rules'>('candidates');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchCandidate, setSearchCandidate] = useState('');

  // Leaderboard Category Filter & Real-Time Sync
  const [leaderboardCategory, setLeaderboardCategory] = useState<string>('all');
  const [isRefreshingLeaderboard, setIsRefreshingLeaderboard] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());

  // Modals
  const [votingCandidate, setVotingCandidate] = useState<CandidateItem | null>(null);
  const [viewingCandidateId, setViewingCandidateId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchEventData = async () => {
    try {
      const ev = await apiRequest(`/api/events/${slug}`);
      setEvent(ev);

      const cands = await apiRequest(`/api/events/${slug}/candidates`);
      setCandidates(cands);

      if (ev.isLeaderboardPublic) {
        try {
          const lb = await apiRequest(`/api/events/${slug}/leaderboard`);
          setLeaderboard(lb.rankings || []);
          setLastUpdatedTime(new Date());
        } catch (e) {
          console.warn('Leaderboard hidden or unavailable:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load event detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const candId = params.get('candidate');
      if (candId && !isNaN(Number(candId))) {
        setViewingCandidateId(Number(candId));
      }
    }
  }, [slug]);

  // Real-Time auto polling leaderboard setiap 10 detik saat tab leaderboard aktif
  useEffect(() => {
    if (activeTab !== 'leaderboard' || !event?.isLeaderboardPublic) return;

    const interval = setInterval(async () => {
      try {
        const lb = await apiRequest(`/api/events/${slug}/leaderboard`);
        if (lb && lb.rankings) {
          setLeaderboard(lb.rankings);
          setLastUpdatedTime(new Date());
        }
      } catch (e) {
        // silent polling catch
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, event?.isLeaderboardPublic, slug]);

  const handleRefreshLeaderboard = async () => {
    setIsRefreshingLeaderboard(true);
    try {
      const lb = await apiRequest(`/api/events/${slug}/leaderboard`);
      if (lb && lb.rankings) {
        setLeaderboard(lb.rankings);
        setLastUpdatedTime(new Date());
      }
    } catch (e) {
      console.error('Failed to refresh leaderboard:', e);
    } finally {
      setTimeout(() => setIsRefreshingLeaderboard(false), 400);
    }
  };

  // Filter candidates by category & search
  const filteredCandidates = candidates.filter((c) => {
    const matchesCategory =
      selectedCategory === 'all' || String(c.categoryId) === String(selectedCategory);
    const matchesSearch =
      !searchCandidate.trim() ||
      c.name.toLowerCase().includes(searchCandidate.toLowerCase()) ||
      c.candidateNumber.toLowerCase().includes(searchCandidate.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Memuat detail kompetisi...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Event Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500">Event yang Anda tuju mungkin sudah berakhir atau URL tidak valid.</p>
        <button
          onClick={() => onNavigate('events')}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md"
        >
          Kembali ke Daftar Event
        </button>
      </div>
    );
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return (
        d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      );
    } catch {
      return dateStr;
    }
  };

  const displayedLeaderboard = (
    leaderboardCategory === 'all'
      ? leaderboard
      : leaderboard.filter((item) => String(item.categoryId) === String(leaderboardCategory))
  )
    .sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0))
    .map((item, idx, arr) => {
      const totalGroupVotes = arr.reduce((sum, c) => sum + (c.totalVotes || 0), 0);
      const catPercentage =
        totalGroupVotes > 0 ? (((item.totalVotes || 0) / totalGroupVotes) * 100).toFixed(1) : '0.0';
      return {
        ...item,
        rank: idx + 1,
        displayPercentage: leaderboardCategory === 'all' ? item.percentage : catPercentage,
      };
    });

  return (
    <div className="space-y-10 pb-20">
      {/* 1. Event Hero Banner */}
      <div className="relative bg-slate-950 text-white">
        <div className="relative h-72 sm:h-96 w-full overflow-hidden">
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-32 sm:-mt-40 z-10 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                  {event.eventType}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    event.status === 'voting_open'
                      ? 'bg-emerald-600 text-white'
                      : event.status === 'upcoming'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {event.status === 'voting_open'
                    ? 'Voting Sedang Berlangsung'
                    : event.status === 'upcoming'
                    ? 'Segera Dimulai'
                    : 'Kompetisi Berakhir'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20">
                  {event.votingMode === 'both' ? 'Free + Paid Vote' : event.votingMode === 'free' ? 'Free Vote' : 'Paid Vote'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                {event.title}
              </h1>

              {/* Jadwal Periode Mulai & Berakhir Vote */}
              {(event.votingStartDate || event.votingEndDate) && (
                <div className="inline-flex flex-wrap items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200 backdrop-blur-md">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex flex-wrap items-center gap-2">
                    {event.votingStartDate && (
                      <span>
                        Mulai: <strong className="text-white font-bold">{formatDateTime(event.votingStartDate)}</strong>
                      </span>
                    )}
                    {event.votingStartDate && event.votingEndDate && <span className="text-slate-400">•</span>}
                    {event.votingEndDate && (
                      <span>
                        Berakhir: <strong className="text-amber-300 font-bold">{formatDateTime(event.votingEndDate)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building className="w-4 h-4 text-blue-400" />
                  <span>{event.organizerName}</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>{candidates.length} Kontestan Finalis</span>
                </span>
                {event.showVoteCounts && (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                    <span>{formatNumber(event.totalEventVotes || 0)} Suara Terkumpul</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Share */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2 transition-all"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Tautan Disalin' : 'Bagikan Event'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-200 flex items-center gap-8 overflow-x-auto">
          {[
            { id: 'candidates', label: `Daftar Kontestan (${candidates.length})`, icon: Users },
            { id: 'leaderboard', label: 'Leaderboard Realtime', icon: Trophy },
            { id: 'rules', label: 'Peraturan & Panduan', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-bold text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TAB 1: CANDIDATES */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {/* Category Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Kategori ({candidates.length})
                </button>
                {(event.categories || []).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(String(cat.id))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      String(selectedCategory) === String(cat.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Search Candidate */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nomor / nama kontestan..."
                  value={searchCandidate}
                  onChange={(e) => setSearchCandidate(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Candidates Grid */}
            {filteredCandidates.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                <p className="text-sm">Tidak ada kontestan yang sesuai kriteria filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    {/* Photo + Number */}
                    <div
                      className="relative aspect-3/4 overflow-hidden bg-slate-100 cursor-pointer"
                      onClick={() => setViewingCandidateId(cand.id)}
                    >
                      <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-md">
                          No. {cand.candidateNumber}
                        </span>
                      </div>

                      {/* Vote Count Overlay */}
                      {event.showVoteCounts && (
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white">
                          <span className="text-[10px] font-semibold text-slate-200 truncate">
                            {cand.categoryName || 'Kategori'}
                          </span>
                          <span className="text-xs font-bold bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-md">
                            {formatNumber(cand.totalVotes)} Vote
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Candidate Info */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          onClick={() => setViewingCandidateId(cand.id)}
                          className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight hover:text-blue-600 cursor-pointer line-clamp-1"
                        >
                          {cand.name}
                        </h4>
                        {cand.titleTag && (
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {cand.titleTag}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setVotingCandidate(cand)}
                          disabled={event.status !== 'voting_open'}
                          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98"
                        >
                          <Vote className="w-3.5 h-3.5" />
                          <span>{event.status === 'voting_open' ? 'Vote Now' : 'Voting Ditutup'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingCandidateId(cand.id)}
                          className="w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          Lihat Profil
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            {!event.isLeaderboardPublic ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-base">Leaderboard Ditutup Sementara</h3>
                <p className="text-xs text-slate-500">
                  Penyelenggara mengunci visibilitas perolehan suara untuk menjaga tensi babak final.
                </p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-500">Belum ada suara yang masuk untuk event ini.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Category Selection Filter & Realtime Status Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Category Pills: Menyeluruh (Semua Kategori) vs Per Kategori */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <button
                      type="button"
                      onClick={() => setLeaderboardCategory('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        leaderboardCategory === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Semua Kategori ({leaderboard.length})</span>
                    </button>

                    {(event.categories || []).map((cat) => {
                      const countInCat = leaderboard.filter((item) => String(item.categoryId) === String(cat.id)).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setLeaderboardCategory(String(cat.id))}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            String(leaderboardCategory) === String(cat.id)
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{cat.name}</span>
                          <span className="ml-1 opacity-80 text-[10px]">({countInCat})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Realtime Live Indicator & Refresh Button */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-slate-700">Live Sync Realtime</span>
                      <span className="text-slate-400">
                        • {lastUpdatedTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshLeaderboard}
                      disabled={isRefreshingLeaderboard}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Perbarui Suara Sekarang"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLeaderboard ? 'animate-spin text-blue-600' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                  </div>
                </div>

                {displayedLeaderboard.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Tidak ada perolehan suara pada kategori ini.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Podium Top 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {displayedLeaderboard.slice(0, 3).map((item, idx) => {
                        const podiumColors = [
                          { bg: 'from-amber-400 to-amber-600', ring: 'ring-amber-400', badge: 'Juara 1', icon: '🥇' },
                          { bg: 'from-slate-300 to-slate-500', ring: 'ring-slate-400', badge: 'Juara 2', icon: '🥈' },
                          { bg: 'from-amber-600 to-amber-800', ring: 'ring-amber-700', badge: 'Juara 3', icon: '🥉' },
                        ];
                        const p = podiumColors[idx];

                        return (
                          <div
                            key={item.id}
                            className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col items-center text-center space-y-3 relative overflow-hidden"
                          >
                            <div className="text-2xl">{p.icon}</div>
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              className={`w-24 h-24 rounded-full object-cover ring-4 ${p.ring} shadow-md`}
                            />
                            <div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                No. {item.candidateNumber}
                              </span>
                              <h4 className="font-extrabold text-slate-900 text-base mt-1 line-clamp-1">{item.name}</h4>
                              <p className="text-xs text-slate-500">{item.categoryName}</p>
                            </div>

                            {event.showVoteCounts && (
                              <div className="w-full pt-3 border-t border-slate-100">
                                <span className="text-xl font-black text-blue-700">{formatNumber(item.totalVotes)}</span>
                                <span className="text-xs text-slate-500 ml-1">Suara ({item.displayPercentage}%)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Table for All Ranks */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">
                          {leaderboardCategory === 'all'
                            ? 'Klasemen Seluruh Kategori (Menyeluruh)'
                            : `Klasemen Kategori: ${event.categories?.find((c) => String(c.id) === String(leaderboardCategory))?.name || 'Kategori'}`}
                        </h4>
                        <span className="text-xs text-slate-500">Diperbarui secara realtime</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {displayedLeaderboard.map((cand) => (
                          <div
                            key={cand.id}
                            className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                  cand.rank === 1
                                    ? 'bg-amber-100 text-amber-800'
                                    : cand.rank === 2
                                    ? 'bg-slate-200 text-slate-800'
                                    : cand.rank === 3
                                    ? 'bg-amber-50 text-amber-900'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {cand.rank}
                              </span>

                              <img
                                src={cand.photoUrl}
                                alt={cand.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                              />

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">{cand.name}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                    #{cand.candidateNumber}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500">{cand.categoryName}</span>
                              </div>
                            </div>

                            {event.showVoteCounts ? (
                              <div className="text-right shrink-0">
                                <span className="font-black text-blue-700 text-sm">
                                  {formatNumber(cand.totalVotes)}
                                </span>
                                <span className="text-[11px] text-slate-500 block">
                                  {cand.displayPercentage}% suara
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Peringkat {cand.rank}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RULES & VOTING GUIDE */}
        {activeTab === 'rules' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Ketentuan & Peraturan Kompetisi</span>
              </h3>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-7">
                {event.rules || 'Peraturan kompetisi mengikuti standar resmi POPULAR VOTE ID.'}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Vote className="w-5 h-5 text-blue-600" />
                <span>Panduan Melakukan Voting</span>
              </h3>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-7">
                {event.votingGuide || 'Pilih kandidat, pilih paket suara, selesaikan pembayaran via QRIS/VA, dan suara teralokasi instan.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voting Modal */}
      {votingCandidate && (
        <VotingModal
          candidate={votingCandidate}
          event={event}
          onClose={() => setVotingCandidate(null)}
          onVoteSuccess={fetchEventData}
          onViewTransaction={(code) => onNavigate('check-transaction', { code })}
        />
      )}

      {/* Candidate Profile Modal */}
      {viewingCandidateId && (
        <CandidateModal
          candidateId={viewingCandidateId}
          event={event}
          onClose={() => setViewingCandidateId(null)}
          onOpenVote={(c) => {
            setViewingCandidateId(null);
            setVotingCandidate(c);
          }}
        />
      )}
    </div>
  );
};
