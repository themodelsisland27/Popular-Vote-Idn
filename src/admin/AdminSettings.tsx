import React, { useState, useEffect } from 'react';
import { Settings, Save, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api/client.ts';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const list = await apiRequest('/api/admin/settings');
      const map: Record<string, string> = {};
      for (const item of list) {
        map[item.key] = item.value;
      }
      setSettings(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: payload }),
      });
      setSuccessMsg('Pengaturan platform berhasil disimpan');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Memuat pengaturan...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Platform</h2>
        <p className="text-xs text-slate-500">
          Konfigurasi identitas, mata uang Rupiah IDR, zona waktu WITA (Asia/Makassar), kontak, dan payment gateway.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Platform */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Identitas & Branding
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Platform</label>
              <input
                type="text"
                value={settings['platform_name'] || 'POPULAR VOTE ID'}
                onChange={(e) => handleChange('platform_name', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Resmi</label>
              <input
                type="text"
                value={settings['platform_tagline'] || 'Your Vote, Your Power'}
                onChange={(e) => handleChange('platform_tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mata Uang Default</label>
              <input
                type="text"
                disabled
                value={settings['currency'] || 'IDR'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Format Rupiah (IDR) otomatis di seluruh checkout</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zona Waktu Platform</label>
              <input
                type="text"
                disabled
                value={settings['timezone'] || 'Asia/Makassar'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">WITA (Waktu Indonesia Tengah - Asia/Makassar)</span>
            </div>
          </div>
        </div>

        {/* Kontak Bantuan & Sosial Media */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Kontak Bantuan & Sosmed
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                value={settings['contact_email'] || 'support@popularvote.id'}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Customer Care</label>
              <input
                type="text"
                value={settings['contact_whatsapp'] || '+6281234567890'}
                onChange={(e) => handleChange('contact_whatsapp', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instagram Resmi</label>
              <input
                type="text"
                value={settings['social_instagram'] || '@popularvote.id'}
                onChange={(e) => handleChange('social_instagram', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kanal YouTube</label>
              <input
                type="text"
                value={settings['social_youtube'] || 'POPULAR VOTE ID Official'}
                onChange={(e) => handleChange('social_youtube', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateway & Maintenance */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Payment Gateway & Operasional
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mode Gateway</label>
              <select
                value={settings['payment_gateway_mode'] || 'sandbox'}
                onChange={(e) => handleChange('payment_gateway_mode', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sandbox">Sandbox (Testing / Simulasi)</option>
                <option value="production">Production (Live Gateway)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Merchant QRIS</label>
              <input
                type="text"
                value={settings['qris_merchant_name'] || 'POPULAR VOTE ID INDONESIA'}
                onChange={(e) => handleChange('qris_merchant_name', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings['maintenance_mode'] === 'true'}
                onChange={(e) => handleChange('maintenance_mode', e.target.checked ? 'true' : 'false')}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-semibold text-rose-700">Aktifkan Maintenance Mode (Situs Hanya Dapat Diakses Admin)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
