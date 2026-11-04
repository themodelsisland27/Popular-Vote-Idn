import React from 'react';
import { BarChart3, Download, FileSpreadsheet, Calendar, Users, Receipt, DollarSign } from 'lucide-react';

export const AdminReports: React.FC = () => {
  const downloadReport = (type: string) => {
    window.open(`/api/admin/reports/${type}`, '_blank');
  };

  const reports = [
    {
      type: 'events',
      title: 'Laporan Seluruh Event',
      desc: 'Daftar semua event, status publisitas, tipe kompetisi, dan tanggal pelaksanaan.',
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      type: 'candidates',
      title: 'Laporan Data Peserta & Suara',
      desc: 'Data seluruh kontestan per event beserta total akumulasi suara sah yang diperoleh.',
      icon: Users,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      type: 'transactions',
      title: 'Laporan Transaksi Lengkap',
      desc: 'Seluruh riwayat transaksi pesanan suara, status pembayaran QRIS/VA, nominal rupiah, dan nama voter.',
      icon: Receipt,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Laporan & Ekspor Data</h2>
        <p className="text-xs text-slate-500">
          Unduh rekapan data platform dalam format CSV untuk keperluan audit dan rekapitulasi panitia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.type}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${r.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{r.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => downloadReport(r.type)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File CSV</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
