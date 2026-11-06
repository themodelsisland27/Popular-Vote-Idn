import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  Activity,
  RefreshCw,
  Search,
  Database,
  Server,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Clock,
  Send,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Check,
  Globe,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { apiRequest } from '../api/client.ts';
import { AuditLogItem, EnvironmentSyncInfo, ActivityLogsResponse } from '../types/index.ts';

export const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentSyncInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5000); // 5 seconds
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  // Ping test state
  const [pingNote, setPingNote] = useState<string>('Tes sinkronisasi langsung dari Admin Portal');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingSuccessMessage, setPingSuccessMessage] = useState<string | null>(null);

  // Clear confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Guide accordion
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const fetchLogs = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedEntity !== 'ALL') params.append('entity', selectedEntity);
      if (selectedAction !== 'ALL') params.append('action', selectedAction);
      params.append('limit', '150');

      const res = await apiRequest<ActivityLogsResponse>(`/api/admin/activity-logs?${params.toString()}`);
      if (res && res.logs) {
        setLogs(res.logs);
        setEnvironment(res.environment);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedEntity, selectedAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live auto-refresh polling
  useEffect(() => {
    if (!isAutoRefreshActive || autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [isAutoRefreshActive, autoRefreshInterval, fetchLogs]);

  // Send real-time ping test
  const handleSendPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingNote.trim()) return;
    setIsPinging(true);
    setPingSuccessMessage(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string; timestamp: string }>('/api/admin/activity-logs/ping', {
        method: 'POST',
        body: JSON.stringify({ note: pingNote.trim() }),
      });
      if (res && res.success) {
        setPingSuccessMessage(res.message);
        setTimeout(() => setPingSuccessMessage(null), 4000);
        // Refresh logs immediately to show the ping record
        await fetchLogs(true);
      }
    } catch (err: any) {
      alert('Gagal mengirim ping sinkronisasi: ' + (err.message || 'Error'));
    } finally {
      setIsPinging(false);
    }
  };

  // Clear logs action
  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      await apiRequest('/api/admin/activity-logs/clear', { method: 'DELETE' });
      setShowClearConfirm(false);
      await fetchLogs();
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Waktu', 'Admin', 'Action', 'Entity', 'Target ID', 'IP Address', 'Details'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.createdAt).toLocaleString('id-ID'),
      l.adminEmail,
      l.action,
      l.targetEntity,
      l.targetId || '-',
      l.ipAddress || '-',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Statistics
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = logs.filter((l) => new Date(l.createdAt).toDateString() === today).length;
    const paymentAccCount = logs.filter((l) => l.action === 'APPROVE_PAYMENT' || l.action.includes('PAYMENT_ACC')).length;
    const pingCount = logs.filter((l) => l.action === 'ENVIRONMENT_SYNC_PING').length;
    return {
      total: logs.length,
      today: todayCount,
      payments: paymentAccCount,
      pings: pingCount,
    };
  }, [logs]);

  // Unique entities for filter
  const availableEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.targetEntity) set.add(l.targetEntity);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Format relative time helper
  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${Math.max(1, diffSec)} detik yang lalu`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} menit yang lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam yang lalu`;
      return `${Math.floor(diffHour / 24)} hari yang lalu`;
    } catch {
      return isoString;
    }
  };

  // Badge styling
  const getActionBadge = (action: string) => {
    if (action.includes('ACC') || action.includes('APPROVE') || action.includes('CREATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('PING')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (action.includes('REJECT') || action.includes('DELETE') || action.includes('LOCK')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Activity Logs & Sync Monitor
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Monitor
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan riwayat aksi admin secara real-time dan diagnosa sinkronisasi antar-environment (Preview, Cloud Run, Vercel).
              </p>
            </div>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoRefreshActive(!isAutoRefreshActive)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              isAutoRefreshActive
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isAutoRefreshActive ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
            Auto-Refresh: {isAutoRefreshActive ? 'Aktif (5s)' : 'Nonaktif'}
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!logs.length}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Bersihkan Log
          </button>
        </div>
      </div>

      {/* Environment Diagnostics Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-blue-300">
                Diagnostik Status Server & Database Aktif
              </h2>
              <p className="text-xs text-slate-300">
                Informasi instance backend yang sedang melayani request Admin Portal ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showGuide ? 'Tutup Panduan Sync' : 'Kenapa Preview vs Publish Berbeda?'}
          </button>
        </div>

        {/* Diagnostic Key Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Tipe Database
            </div>
            <div className="text-white font-semibold text-sm truncate" title={environment?.dbHostType || 'PostgreSQL'}>
              {environment?.dbHostType || 'Google Cloud SQL'}
            </div>
            <div className="text-[11px] text-blue-300 mt-1 truncate">
              DB: {environment?.dbName || 'cloud_sql_development_database'}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Environment Host
            </div>
            <div className="text-white font-semibold text-sm truncate" title={environment?.appUrl || ''}>
              {environment?.nodeEnv === 'production' ? 'Production (Live)' : 'Development (AI Studio)'}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 truncate">
              {environment?.appUrl || 'localhost:3000'}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Waktu Server (UTC/WIB)
            </div>
            <div className="text-white font-semibold text-sm">
              {environment?.serverTime
                ? new Date(environment.serverTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '-'}
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              {environment?.serverTime ? new Date(environment.serverTime).toLocaleDateString('id-ID') : '-'}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              Server Uptime
            </div>
            <div className="text-white font-semibold text-sm">
              {environment?.uptimeSeconds ? `${Math.floor(environment.uptimeSeconds / 60)} menit` : 'Online'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Siap menerima transaksi
            </div>
          </div>
        </div>

        {/* Live Sync Ping Tester */}
        <form onSubmit={handleSendPing} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-blue-200 mb-1">
              Tes Ping Sinkronisasi Real-Time (Pastikan perubahan tersimpan ke DB):
            </label>
            <input
              type="text"
              value={pingNote}
              onChange={(e) => setPingNote(e.target.value)}
              placeholder="Tulis catatan tes ping..."
              className="w-full px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPinging || !pingNote.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
            >
              {isPinging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Kirim Tes Ping
            </button>
          </div>
        </form>

        {pingSuccessMessage && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pingSuccessMessage}</span>
          </div>
        )}

        {/* Multi-Environment Guide Accordion */}
        {showGuide && (
          <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-xl text-xs space-y-3 text-slate-200">
            <div className="font-semibold text-blue-300 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Penjelasan Mengapa Preview AI Studio vs Publish vs Vercel Bisa Berbeda
            </div>
            <ol className="list-decimal pl-4 space-y-2 text-slate-300">
              <li>
                <strong className="text-white">AI Studio Preview vs Published Container:</strong> Ketika Anda mengedit di AI Studio, perubahan langsung aktif di <em>Preview</em>. Namun URL publik (seperti <code>popular-vote-id27.ai.studio</code>) baru diperbarui setelah Anda menekan tombol <strong>"Republish"</strong> di pojok kanan atas AI Studio.
              </li>
              <li>
                <strong className="text-white">Vercel (popularvoteid.my.id) HTTP 404 pada API:</strong> Vercel secara default adalah host frontend static (Vite). Agar endpoint backend seperti <code>/api/admin/login</code> berfungsi di Vercel, proyek memerlukan serverless handler <code>api/[...all].ts</code> dan rewrite di <code>vercel.json</code> (sudah kami perbaiki dan konfigurasikan!).
              </li>
              <li>
                <strong className="text-white">Sinkronisasi Database di Vercel:</strong> AI Studio menggunakan Google Cloud SQL Unix Socket internal. Agar Vercel dapat membaca database yang sama secara real-time, masukkan environment variable <code>DATABASE_URL</code> pada dashboard Vercel (Project Settings &rarr; Environment Variables) mengarah ke connection string PostgreSQL Anda.
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total Log Tercatat</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Aktivitas Hari Ini</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.today}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">ACC Pembayaran</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.payments}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Tes Ping Sync</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.pings}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aksi, rincian aktivitas, email admin, atau entitas..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Entitas:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Entitas</option>
              {availableEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Aksi:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="APPROVE_PAYMENT">APPROVE_PAYMENT (ACC)</option>
              <option value="REJECT_PAYMENT">REJECT_PAYMENT</option>
              <option value="CREATE_EVENT">CREATE_EVENT</option>
              <option value="UPDATE_EVENT">UPDATE_EVENT</option>
              <option value="CREATE_CANDIDATE">CREATE_CANDIDATE</option>
              <option value="UPDATE_CANDIDATE">UPDATE_CANDIDATE</option>
              <option value="ENVIRONMENT_SYNC_PING">ENVIRONMENT_SYNC_PING</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Daftar Log Aktivitas ({logs.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Terakhir diperbarui: {new Date().toLocaleTimeString('id-ID')}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>Memuat catatan aktivitas real-time...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-700">Belum ada riwayat aktivitas yang cocok</p>
            <p className="text-slate-400 mt-1">Gunakan tombol "Kirim Tes Ping" di atas untuk membuat entri tes baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Entitas & Target</th>
                  <th className="py-3 px-4">Rincian Aktivitas</th>
                  <th className="py-3 px-4">Admin & IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{getRelativeTime(log.createdAt)}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Entity & Target */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{log.targetEntity}</div>
                      {log.targetId && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {log.targetId}
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-slate-700 max-w-md">
                      <div className="line-clamp-2 leading-relaxed" title={log.details || ''}>
                        {log.details || '-'}
                      </div>
                    </td>

                    {/* Admin & IP */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{log.adminEmail}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        IP: {log.ipAddress || '127.0.0.1'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Bersihkan Riwayat Log Aktivitas?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan menghapus catatan audit sebelumnya.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Riwayat aksi audit log akan dibersihkan, dan satu entri baru akan dicatat bahwa log telah dibersihkan oleh Administrator.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isClearing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition disabled:opacity-50"
              >
                {isClearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Ya, Bersihkan Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
