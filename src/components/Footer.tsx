import React from 'react';
import { Vote, Shield, Heart, Mail, Phone, MapPin, Instagram, Youtube, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className="flex items-center gap-3 cursor-pointer group inline-flex"
              onClick={() => onNavigate('home')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Vote className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  POPULAR VOTE<span className="text-blue-500">.ID</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Your Vote, Your Power
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Platform voting digital multi-event profesional dan terpercaya di Indonesia. Menghubungkan voter dengan ajang kompetisi modelling, beauty pageant, talent search, dan penghargaan pilihan publik secara transparan, aman, dan realtime.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Single Admin Certified</span>
              </div>
            </div>
          </div>

          {/* Navigasi Cepat */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-blue-400 transition-colors">
                  Beranda
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('events')} className="hover:text-blue-400 transition-colors">
                  Jelajahi Event
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('winners')} className="hover:text-blue-400 transition-colors">
                  Hall of Fame (Pemenang)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('check-transaction')} className="hover:text-blue-400 transition-colors">
                  Cek Status Transaksi
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-blue-400 transition-colors">
                  Tanya Jawab (FAQ)
                </button>
              </li>
            </ul>
          </div>

          {/* Aturan & Kebijakan */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Kebijakan & Panduan</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('info', { slug: 'voting-rules' })} className="hover:text-blue-400 transition-colors">
                  Peraturan Voting Resmi
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('info', { slug: 'terms' })} className="hover:text-blue-400 transition-colors">
                  Syarat & Ketentuan
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('info', { slug: 'privacy' })} className="hover:text-blue-400 transition-colors">
                  Kebijakan Privasi
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('info', { slug: 'about' })} className="hover:text-blue-400 transition-colors">
                  Tentang Platform
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
                  <span>Login Administrator</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
            </ul>
          </div>

          {/* Layanan Dukungan */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Bantuan Resmi</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>support@popularvote.id</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>+62 851-2804-6632 (WhatsApp 24/7)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Denpasar, Bali</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Metode Pembayaran
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-semibold text-blue-400">QRIS</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">BCA</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Mandiri</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">BNI</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">BRI</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">GoPay</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">OVO</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">DANA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} POPULAR VOTE ID. Hak Cipta Dilindungi Undang-Undang.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Platform Pemungutan Suara Digital Terintegrasi Multi-Event
          </p>
        </div>
      </div>
    </footer>
  );
};
