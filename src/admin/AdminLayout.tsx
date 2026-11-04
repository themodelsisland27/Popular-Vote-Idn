import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  Package,
  Vote,
  Receipt,
  QrCode,
  Trophy,
  BarChart3,
  FileText,
  Settings,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { AdminUser } from '../types/index.ts';

interface AdminLayoutProps {
  admin: AdminUser;
  activeSection: string;
  onSelectSection: (section: string) => void;
  onLogout: () => void;
  onViewPublicSite: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  admin,
  activeSection,
  onSelectSection,
  onLogout,
  onViewPublicSite,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'events', label: 'Kelola Event', icon: Calendar },
    { id: 'categories', label: 'Kelola Kategori', icon: Layers },
    { id: 'candidates', label: 'Kelola Peserta', icon: Users },
    { id: 'packages', label: 'Paket Vote', icon: Package },
    { id: 'votes', label: 'Suara & Audit Log', icon: Vote },
    { id: 'transactions', label: 'Transaksi & Bayar', icon: Receipt },
    { id: 'winners', label: 'Kelola Pemenang', icon: Trophy },
    { id: 'reports', label: 'Laporan & Ekspor', icon: BarChart3 },
    { id: 'cms', label: 'Konten Website', icon: FileText },
    { id: 'settings', label: 'Pengaturan Sistem', icon: Settings },
    { id: 'security', label: 'Keamanan Admin', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight">POPULAR VOTE ID</h1>
            <span className="text-[10px] text-blue-400 block -mt-0.5">Admin Portal CMS</span>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <Vote className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-base font-black text-white tracking-tight block">
                  POPULAR VOTE<span className="text-blue-500">.ID</span>
                </span>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                  Single Admin CMS
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </button>
              );
            })}
          </nav>

          {/* Bottom user card & actions */}
          <div className="p-4 border-t border-slate-800/80 space-y-3">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
              <img
                src={admin.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={admin.fullName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/40"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{admin.fullName}</h4>
                <p className="text-[10px] text-blue-400 truncate">{admin.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onViewPublicSite}
                className="flex-1 py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                title="Buka Website Publik"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>Lihat Web</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Keluar dari Admin Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
        {children}
      </main>
    </div>
  );
};
