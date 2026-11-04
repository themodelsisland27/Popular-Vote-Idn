import React, { useState, useEffect } from 'react';
import { Trophy, Award, Sparkles, Calendar, ChevronRight, Share2, Check, ExternalLink } from 'lucide-react';
import { apiRequest, formatDateWITA, formatNumber } from '../api/client.ts';
import { WinnerItem } from '../types/index.ts';

interface WinnersPageProps {
  onNavigate: (path: string, params?: any) => void;
}

export const WinnersPage: React.FC<WinnersPageProps> = ({ onNavigate }) => {
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  useEffect(() => {
    async function loadWinners() {
      try {
        const data = await apiRequest('/api/winners');
        setWinners(data);
      } catch (err) {
        console.error('Failed to load winners:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWinners();
  }, []);

  const uniqueEvents = Array.from(new Set(winners.map((w) => w.eventTitle)));

  const filteredWinners = winners.filter((w) => {
    if (selectedEvent === 'all') return true;
    return w.eventTitle === selectedEvent;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-8 sm:p-12 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-amber-200 border border-white/20 text-xs font-semibold backdrop-blur-md">
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Official Hall of Fame</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Pemenang Resmi Kompetisi
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 leading-relaxed font-normal">
            Daftar pemenang dan peraih penghargaan yang telah disahkan secara resmi oleh Single Administrator berdasarkan audit suara sah POPULAR VOTE ID.
          </p>
        </div>
      </div>

      {/* Filter by event */}
      {uniqueEvents.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Pilih Event:</span>
          <button
            onClick={() => setSelectedEvent('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedEvent === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Event ({winners.length})
          </button>
          {uniqueEvents.map((evt) => (
            <button
              key={evt}
              onClick={() => setSelectedEvent(evt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedEvent === evt
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {evt}
            </button>
          ))}
        </div>
      )}

      {/* Winners Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Memuat daftar pemenang...</p>
        </div>
      ) : filteredWinners.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Belum Ada Pemenang Dipublikasikan</h3>
          <p className="text-xs text-slate-400">
            Hasil resmi akan tampil di sini setelah masa voting selesai dan disahkan oleh Administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWinners.map((win) => (
            <div
              key={win.id}
              className="bg-white rounded-3xl overflow-hidden border border-amber-200/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-64 overflow-hidden bg-slate-900">
                  <img
                    src={win.candidatePhoto}
                    alt={win.candidateName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{win.positionTitle}</span>
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider block">
                      {win.eventTitle}
                    </span>
                    <h3 className="text-xl font-black mt-0.5">{win.candidateName}</h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Nomor Kontestan:</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      #{win.candidateNumber}
                    </span>
                  </div>

                  {win.candidateVotes && (
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Total Suara Sah:</span>
                      <span className="font-black text-blue-700 text-sm">
                        {formatNumber(win.candidateVotes)} Vote
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Tanggal Pengesahan:</span>
                    <span className="text-slate-700 font-semibold">{formatDateWITA(win.announcementDate)}</span>
                  </div>

                  {win.notes && (
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900 leading-relaxed">
                      "{win.notes}"
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  type="button"
                  onClick={() => onNavigate('event-detail', { slug: win.eventSlug })}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Lihat Arsip Event</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
