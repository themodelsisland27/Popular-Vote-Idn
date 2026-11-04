import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Vote,
  Instagram,
  Award,
  Share2,
  Check,
  Sparkles,
  User,
  Tag,
  Download,
  MessageCircle,
  Copy,
  Trophy,
  Flame,
  Heart,
  TrendingUp,
  MessageSquare,
  Users,
  Info
} from 'lucide-react';
import { CandidateItem, EventItem } from '../types/index.ts';
import { formatNumber, apiRequest } from '../api/client.ts';

interface CandidateModalProps {
  candidateId: number;
  event: EventItem;
  onClose: () => void;
  onOpenVote: (candidate: CandidateItem) => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  candidateId,
  event,
  onClose,
  onOpenVote,
}) => {
  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'supporters' | 'comments'>('profile');
  const [showGreetingCard, setShowGreetingCard] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await apiRequest(`/api/candidates/${candidateId}`);
        if (isMounted) setCandidate(data);
      } catch (e) {
        console.error('Failed to load candidate:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [candidateId]);

  // Construct absolute candidate vote URL
  const candidateShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${event.slug}?candidate=${candidate?.id || candidateId}`
    : `https://popularvoteid.my.id/events/${event.slug}?candidate=${candidate?.id || candidateId}`;

  const posterOrPhotoUrl = candidate?.photoUrl?.startsWith('http')
    ? candidate.photoUrl
    : typeof window !== 'undefined'
      ? `${window.location.origin}${candidate?.photoUrl || ''}`
      : `https://popularvoteid.my.id${candidate?.photoUrl || ''}`;

  // 1. WhatsApp Share integration (Includes candidate poster/photo link & vote URL)
  const handleShareWhatsApp = () => {
    if (!candidate) return;
    const text = `🌟 DUKUNG FINALIS FAVORIT ANDA! 🌟\n\nNama: *${candidate.name}*\nNomor Urut: *#${candidate.candidateNumber}*\nKategori: *${candidate.category?.name || candidate.categoryName || 'Umum'}*\nKompetisi: *${event.title}*\n\n📸 *Poster Resmi Finalis:*\n${posterOrPhotoUrl}\n\n🗳️ *Berikan Suara Anda Sekarang (Resmi & Terverifikasi):*\n${candidateShareUrl}\n\n✨ "Your Vote, Your Power" — POPULAR VOTE ID`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // 2. Salin Tautan (Integrates Poster Peserta & Candidate Vote URL)
  const handleCopyLink = () => {
    if (!candidate) return;
    const shareText = `Dukung ${candidate.name} (Nomor Urut #${candidate.candidateNumber}) di ${event.title}!\n\nLink Voting: ${candidateShareUrl}\nPoster Resmi: ${posterOrPhotoUrl}`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 3. Unduh Poster Resmi (Canvas-generated official event poster)
  const handleDownloadPoster = async () => {
    if (!candidate) return;
    setDownloadingPoster(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background Gradient (Modern Blue & Deep Navy)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350);
      bgGrad.addColorStop(0, '#0B1730');
      bgGrad.addColorStop(0.4, '#172554');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Top Decorative Glow
      const glow = ctx.createRadialGradient(540, 200, 50, 540, 200, 600);
      glow.addColorStop(0, 'rgba(37, 99, 235, 0.45)');
      glow.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 700);

      // Header Brand
      ctx.fillStyle = '#60A5FA';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POPULAR VOTE ID — OFFICIAL COMPETITOR', 540, 70);

      // Event Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 42px Inter, sans-serif';
      ctx.fillText(event.title.toUpperCase(), 540, 125);

      // Category Pill
      const catText = (candidate.category?.name || candidate.categoryName || 'KATEGORI UMUM').toUpperCase();
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.roundRect(390, 145, 300, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText(catText, 540, 174);

      // Draw Photo or Frame
      const imgX = 140;
      const imgY = 220;
      const imgW = 800;
      const imgH = 760;

      // Photo background card with border
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 32);
      ctx.fill();

      // Attempt to load and render the candidate photo
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if CORS fails
          img.src = candidate.photoUrl;
        });

        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, 32);
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgW, imgH);
          ctx.restore();
        } else {
          // Fallback avatar graphic
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(540, 600, 120, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94A3B8';
          ctx.font = 'bold 48px Inter, sans-serif';
          ctx.fillText(candidate.name.charAt(0), 540, 615);
        }
      } catch (err) {
        console.warn('Canvas image load fallback:', err);
      }

      // Candidate Number Badge overlay on photo
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.roundRect(170, 250, 220, 64, 32);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 30px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${candidate.candidateNumber}`, 280, 293);

      // Candidate Name
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 58px Inter, sans-serif';
      ctx.fillText(candidate.name, 540, 1050);

      // Title Tag or Subtitle
      if (candidate.titleTag) {
        ctx.fillStyle = '#93C5FD';
        ctx.font = '600 28px Inter, sans-serif';
        ctx.fillText(candidate.titleTag, 540, 1095);
      }

      // Bottom Call-to-Action Bar
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.roundRect(120, 1140, 840, 130, 24);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3B82F6';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Inter, sans-serif';
      ctx.fillText('DUKUNG & VOTE SEKARANG', 540, 1195);

      ctx.fillStyle = '#93C5FD';
      ctx.font = '500 22px Inter, sans-serif';
      ctx.fillText('Kunjungi popularvoteid.my.id • Your Vote, Your Power', 540, 1235);

      // Footer disclaimer
      ctx.fillStyle = '#64748B';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('Poster Resmi Terverifikasi Sistem Single Administrator POPULAR VOTE ID', 540, 1315);

      // Export to PNG & download
      const link = document.createElement('a');
      link.download = `Poster-Resmi-${candidate.candidateNumber}-${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Error generating poster:', e);
    } finally {
      setDownloadingPoster(false);
    }
  };

  // 4. Kartu Ucapan Dukungan Bertema Event
  const greetingCardText = candidate
    ? `✨ KARTU UCAPAN & DUKUNGAN RESMI ✨\n\n"Semangat berjuang untuk ${candidate.name} (No. #${candidate.candidateNumber}) di ${event.title}! Semoga sukses menampilkan yang terbaik dan meraih kemenangan!"\n\nKategori: ${candidate.category?.name || candidate.categoryName || 'Umum'}\n\nYuk berikan vote dukungan Anda di:\n${candidateShareUrl}\n\n#PopularVoteID #YourVoteYourPower #${candidate.name.replace(/\s+/g, '')}`
    : '';

  const handleCopyGreetingCard = () => {
    navigator.clipboard.writeText(greetingCardText);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">Memuat profil dan statistik peserta...</p>
          </div>
        ) : !candidate ? (
          <div className="p-16 text-center text-slate-500">
            <p>Data peserta tidak ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {/* Top Hero Section */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                {/* Photo & Number Badge */}
                <div className="relative shrink-0 mx-auto sm:mx-0">
                  <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-slate-800">
                    <img
                      src={candidate.photoUrl}
                      alt={candidate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-lg border border-white/30 whitespace-nowrap">
                    No. {candidate.candidateNumber}
                  </div>
                </div>

                {/* Candidate Overview & Badges */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {candidate.category?.name || candidate.categoryName || 'Kategori Umum'}
                    </span>
                    {candidate.titleTag && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-200">
                        {candidate.titleTag}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {candidate.name}
                  </h3>

                  <p className="text-xs text-slate-300 font-medium">
                    Event: <span className="text-white font-semibold">{event.title}</span>
                  </p>

                  {candidate.instagram && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-pink-300 font-semibold pt-1">
                      <Instagram className="w-3.5 h-3.5" />
                      <span>{candidate.instagram}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* JUMLAH DUKUNGAN, PERINGKAT DAN POSISI PERSAINGAN */}
            <div className="p-5 sm:p-6 bg-slate-50/70">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Jumlah Dukungan */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Jumlah Dukungan</span>
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-blue-700">
                      {formatNumber(candidate.totalVotes)}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">Suara Sah</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Perolehan suara terverifikasi sistem
                  </p>
                </div>

                {/* Peringkat */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Peringkat</span>
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-600">
                      #{candidate.rankOverall || 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      dari {candidate.totalCandidatesOverall || 1} Finalis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Peringkat #{candidate.rankCategory || 1} di Kategori {candidate.category?.name || 'Umum'}
                  </p>
                </div>

                {/* Posisi Persaingan */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs sm:col-span-1">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Posisi Persaingan</span>
                    <Flame className="w-4 h-4 text-rose-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {candidate.competitionStatus || `Peringkat #${candidate.rankOverall || 1} di kompetisi ini`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Update realtime Leaderboard resmi
                  </p>
                </div>
              </div>
            </div>

            {/* FITUR BAGIKAN KANDIDAT */}
            <div className="p-5 sm:p-6 bg-white space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Bagikan Profil Kandidat</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ajak teman mendukung lewat WhatsApp, unduh poster resmi, buat kartu ucapan bertema event, atau salin tautannya
                  </p>
                </div>
              </div>

              {/* Action Buttons for Sharing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                {/* 1. Bagikan ke WhatsApp (Integrasi Poster Peserta) */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Bagikan ke WhatsApp</span>
                </button>

                {/* 2. Unduh Poster Resmi */}
                <button
                  type="button"
                  onClick={handleDownloadPoster}
                  disabled={downloadingPoster}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Download className={`w-4 h-4 ${downloadingPoster ? 'animate-bounce' : ''}`} />
                  <span>{downloadingPoster ? 'Membuat Poster...' : 'Unduh Poster Resmi'}</span>
                </button>

                {/* 3. Buat Kartu Ucapan Bertema Event */}
                <button
                  type="button"
                  onClick={() => setShowGreetingCard(!showGreetingCard)}
                  className="px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span>Kartu Ucapan Event</span>
                </button>

                {/* 4. Salin Tautan (Integrasi Poster Peserta) */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Tautan & Poster Tersalin!' : 'Salin Tautan'}</span>
                </button>
              </div>

              {/* Collapsible Greeting Card Preview */}
              {showGreetingCard && (
                <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 animate-in fade-in duration-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Kartu Ucapan & Pesan Semangat untuk Finalis</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyGreetingCard}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedCard ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCard ? 'Tersalin!' : 'Salin Ucapan'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-indigo-950 font-medium whitespace-pre-line leading-relaxed bg-white/70 p-3 rounded-xl border border-indigo-100">
                    {greetingCardText}
                  </p>
                </div>
              )}
            </div>

            {/* TAB CONTENT: PROFILE, TOP SUPPORTER & KOMENTAR DUKUNGAN */}
            <div className="p-5 sm:p-6 bg-white space-y-4">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Profil & Visi
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('supporters')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'supporters'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Top Supporter</span>
                  {(candidate.topSupporters?.length || 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {candidate.topSupporters?.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'comments'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Komentar Dukungan</span>
                  {(candidate.supportComments?.length || 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {candidate.supportComments?.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab 1: Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tentang & Biodata Peserta
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {candidate.bio || 'Belum ada deskripsi profil untuk peserta ini.'}
                  </p>
                </div>
              )}

              {/* Tab 2: Top Supporter (Nama Supporter & Jumlah Vote yang di Beli) */}
              {activeTab === 'supporters' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Top Supporter ({candidate.name})
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Pendukung dengan kontribusi perolehan vote terbanyak setelah di-ACC oleh Admin
                      </p>
                    </div>
                  </div>

                  {(!candidate.topSupporters || candidate.topSupporters.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Belum ada Top Supporter</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Jadilah yang pertama mendukung {candidate.name} dengan membeli paket vote untuk memuncaki daftar Top Supporter!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {candidate.topSupporters.map((supporter) => {
                        const isGold = supporter.rank === 1;
                        const isSilver = supporter.rank === 2;
                        const isBronze = supporter.rank === 3;

                        return (
                          <div
                            key={`${supporter.voterName}-${supporter.rank}`}
                            className={`p-3 rounded-2xl border flex items-center justify-between ${
                              isGold
                                ? 'bg-amber-50/70 border-amber-200'
                                : isSilver
                                ? 'bg-slate-100/70 border-slate-200'
                                : isBronze
                                ? 'bg-orange-50/70 border-orange-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isGold
                                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                                    : isSilver
                                    ? 'bg-slate-300 text-slate-800'
                                    : isBronze
                                    ? 'bg-orange-300 text-orange-950'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                #{supporter.rank}
                              </div>
                              <div>
                                <h6 className="font-bold text-xs text-slate-900 leading-tight">
                                  {supporter.voterName}
                                </h6>
                                <span className="text-[10px] text-slate-500">
                                  {supporter.txCount} kali transaksi
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-black text-blue-700 text-sm block">
                                {formatNumber(supporter.totalVotes)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">Suara</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Komentar Dukungan */}
              {activeTab === 'comments' && (
                <div className="space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Pesan & Komentar Dukungan
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Ucapan penyemangat dari para pendukung yang telah di-ACC Admin
                    </p>
                  </div>

                  {(!candidate.supportComments || candidate.supportComments.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Belum ada komentar dukungan</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Tuliskan pesan dukungan Anda saat melakukan pembelian vote agar tampil di sini!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {candidate.supportComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                {comment.voterName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-xs text-slate-900">
                                {comment.voterName}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              +{comment.voteCount} Suara
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 italic pl-8">
                            "{comment.message}"
                          </p>

                          <div className="text-right text-[10px] text-slate-400">
                            {new Date(comment.date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="hidden sm:block">
                <span className="text-[11px] text-slate-500 block">Dukungan Finalis</span>
                <span className="font-bold text-xs text-slate-800">
                  {candidate.name} (No. {candidate.candidateNumber})
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVote(candidate);
                }}
                className="flex-1 sm:flex-initial sm:px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <Vote className="w-4 h-4" />
                <span>Vote {candidate.name} Sekarang</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
