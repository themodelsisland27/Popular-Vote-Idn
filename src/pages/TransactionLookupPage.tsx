import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ShieldCheck,
  Vote,
  Printer,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileCheck,
  ExternalLink,
  Building2,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiRequest, formatIDR, formatDateWITA } from '../api/client.ts';
import { generateSampleReceipt } from '../utils/receiptGenerator.ts';

interface TransactionLookupPageProps {
  initialCode?: string;
  onNavigate: (path: string, params?: any) => void;
}

export const TransactionLookupPage: React.FC<TransactionLookupPageProps> = ({
  initialCode = '',
  onNavigate,
}) => {
  const [code, setCode] = useState(initialCode);
  const [transaction, setTransaction] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Upload proof state (dedicated UI component within detail view)
  const [proofImage, setProofImage] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofNotes, setProofNotes] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState<boolean>(false);
  const [simulatingAcc, setSimulatingAcc] = useState<boolean>(false);

  const handleLookup = async (lookupCode: string) => {
    if (!lookupCode.trim()) {
      setErrorMsg('Masukkan kode transaksi unik Anda');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const data = await apiRequest(`/api/transactions/${lookupCode.trim()}`);
      setTransaction(data);
      if (data.paymentProofUrl) {
        setProofImage(data.paymentProofUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Kode transaksi tidak ditemukan. Pastikan format benar.');
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  // Polling if pending or pending_verification
  useEffect(() => {
    let interval: any;
    if (
      transaction &&
      (transaction.status === 'pending' || transaction.status === 'pending_verification')
    ) {
      interval = setInterval(async () => {
        try {
          const res = await apiRequest(`/api/transactions/${transaction.transactionCode}`);
          if (res && res.status === 'paid' && res.votesAllocated) {
            setTransaction(res);
            try {
              confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
            } catch (e) {}
          }
        } catch (e) {}
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [transaction?.transactionCode, transaction?.status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(code);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap unggah file foto bukti pembayaran (JPG, PNG, atau WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 8MB');
      return;
    }

    setErrorMsg('');
    setProofFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleReceipt = () => {
    if (!transaction) return;
    const sample = generateSampleReceipt({
      transactionCode: transaction.transactionCode,
      amount: transaction.amount,
      voterName: transaction.voterNameMasked || 'Voter',
      candidateName: transaction.candidateName,
      bankName: transaction.paymentMethod === 'bank_transfer' ? 'BCA' : undefined,
    });
    setProofImage(sample);
    setProofFileName(`bukti_transfer_${transaction.transactionCode}.png`);
  };

  const handleSubmitProof = async () => {
    if (!transaction || !proofImage) return;
    setUploadingProof(true);
    setErrorMsg('');

    try {
      const res = await apiRequest('/api/voting/upload-proof', {
        method: 'POST',
        body: JSON.stringify({
          transactionCode: transaction.transactionCode,
          proofImage,
          notes: proofNotes.trim() || undefined,
        }),
      });

      if (res.success && res.transaction) {
        setTransaction(res.transaction);
        alert('Bukti pembayaran berhasil dikirim! Status kini: Pending Verification. Menunggu ACC dari Admin Portal CMS.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengunggah bukti pembayaran');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSimulateAdminAcc = async () => {
    if (!transaction) return;
    setSimulatingAcc(true);
    try {
      const res = await apiRequest(`/api/admin/transactions/${transaction.id}/acc-payment`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Di-ACC langsung dari pengujian simulasi halaman Cek Transaksi',
        }),
      });
      if (res.success) {
        setTransaction(res.transaction);
        try {
          confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses ACC');
    } finally {
      setSimulatingAcc(false);
    }
  };

  const copyCode = (text: string, type: 'code' | 'va' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else if (type === 'va') {
      setCopiedVa(true);
      setTimeout(() => setCopiedVa(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Verifikasi Transaksi Resmi</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Cek Transaksi & Upload Bukti Pembayaran
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Masukkan kode transaksi Anda (contoh: PVI-2027-XXXXXX) untuk memeriksa status pembayaran, instruksi transfer, upload bukti struk, dan status ACC suara ke Leaderboard.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Contoh: PVI-2027-123456-ABC"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder:normal-case"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Cek Status</span>
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Transaction Details Result */}
      {transaction && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Banner */}
          <div
            className={`p-6 text-white flex items-center justify-between ${
              transaction.status === 'paid'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : transaction.status === 'pending_verification'
                ? 'bg-gradient-to-r from-amber-600 to-orange-700'
                : transaction.status === 'pending'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-800'
                : 'bg-gradient-to-r from-rose-600 to-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                {transaction.status === 'paid' ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <Clock className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-white/80 font-bold block">
                  Status Transaksi
                </span>
                <h3 className="text-xl font-black">
                  {transaction.status === 'paid'
                    ? 'Pembayaran Di-ACC (Lunas)'
                    : transaction.status === 'pending_verification'
                    ? 'Pending Verification (Menunggu ACC Admin)'
                    : transaction.status === 'pending'
                    ? 'Menunggu Upload Bukti Pembayaran'
                    : 'Transaksi Gagal / Dibatalkan'}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-white/80 block">Alokasi Suara</span>
              <span className="text-xl font-black">
                {transaction.votesAllocated ? `+${transaction.voteCount} Suara Sah` : '0 Suara Masuk'}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Candidate Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
              <img
                src={transaction.candidatePhoto}
                alt={transaction.candidateName}
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500/30"
              />
              <div className="min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  Finalis No. {transaction.candidateNumber}
                </span>
                <h4 className="font-extrabold text-slate-900 text-base mt-0.5 truncate">
                  {transaction.candidateName}
                </h4>
                <p className="text-xs text-slate-500 truncate">{transaction.eventTitle}</p>
              </div>
            </div>

            {/* Transaction Data Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Kode Transaksi:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 truncate">
                    {transaction.transactionCode}
                  </span>
                  <button onClick={() => copyCode(transaction.transactionCode, 'code')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Total Nominal Transfer:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{formatIDR(transaction.amount)}</span>
                  <button onClick={() => copyCode(transaction.amount.toString(), 'amount')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Metode Pembayaran:</span>
                <span className="font-bold text-slate-900 uppercase">
                  {transaction.paymentMethod === 'bank_transfer' ? 'Transfer Bank BCA' : 'QRIS (Noxaz Creative)'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Nama Voter:</span>
                <span className="font-bold text-slate-900">{transaction.voterNameMasked || 'Voter'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Waktu Transaksi:</span>
                <span className="font-medium text-slate-700">{formatDateWITA(transaction.createdAt)}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Status Leaderboard:</span>
                <span className={`font-bold ${transaction.votesAllocated ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {transaction.votesAllocated ? '✓ Sah Masuk Leaderboard' : '⏳ Menunggu ACC Admin'}
                </span>
              </div>
            </div>

            {/* PAYMENT INSTRUCTION DETAILS (Jika Belum Lunas) */}
            {transaction.status !== 'paid' && (
              <div className="space-y-4">
                {transaction.paymentMethod === 'qris' ? (
                  /* QRIS Noxaz Creative Service Display */
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      <QrCode className="w-4 h-4" />
                      <span>QRIS Standar Pembayaran Nasional</span>
                    </div>

                    <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-sm max-w-[260px] mx-auto">
                      <img
                        src="/assets/aistudio/QRIS_a4298f73.jpeg"
                        alt="QRIS Noxaz Creative, Service"
                        className="w-full h-auto object-contain rounded-lg"
                      />
                      <a
                        href="/assets/aistudio/QRIS_a4298f73.jpeg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka / Unduh Gambar QRIS</span>
                      </a>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-slate-900 text-xs">Noxaz Creative, Service</div>
                      <div className="text-[11px] font-mono text-slate-500">NMID: ID1026594269932 • A01</div>
                      <div className="mt-2 text-xs text-slate-600">
                        Total Transfer Tepat: <strong className="text-blue-700 text-base">{formatIDR(transaction.amount)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Transfer Bank BCA Display (Only BCA Rek 6110838067) */
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      <Building2 className="w-4 h-4" />
                      <span>Transfer Bank Central Asia (BCA)</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 max-w-md mx-auto">
                      <span className="text-[11px] text-slate-500 block uppercase font-semibold">
                        Nomor Rekening BCA Resmi:
                      </span>
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-mono font-black text-2xl text-slate-900 tracking-wider">
                          6110838067
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode('6110838067', 'va')}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Salin Nomor Rekening"
                        >
                          {copiedVa ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        Atas Nama: <span className="text-blue-700">I Gede Sakha Ari Wibawa</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600">
                      Total Nominal Transfer Tepat: <strong className="text-blue-700 text-base">{formatIDR(transaction.amount)}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DEDICATED UI COMPONENT: UPLOAD BUKTI PEMBAYARAN */}
            {transaction.status !== 'paid' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border-2 border-dashed border-blue-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Upload Bukti Pembayaran</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    {transaction.paymentProofUrl ? 'Bukti Terkirim (Pending Verification)' : 'Wajib di-ACC Admin'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Unggah file foto struk atau screenshot bukti transfer Anda di bawah. Server akan menandai pembayaran sebagai <strong>'Pending Verification'</strong> di database, dan saat Admin mengklik <strong>ACC Bayar</strong>, suara langsung masuk ke Leaderboard.
                </p>

                {/* Upload box with exact requested text */}
                {!proofImage ? (
                  <div className="space-y-2">
                    <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center mb-2 transition-colors">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                        Klik untuk Memilih Foto Bukti Pembayaran
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Format JPG, PNG, atau WebP (Maks 8MB)
                      </span>
                    </label>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleUseSampleReceipt}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 underline cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gunakan Contoh Bukti Struk Otomatis (Uji Coba Cepat)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
                      <img
                        src={proofImage}
                        alt="Preview Bukti Pembayaran"
                        className="w-16 h-20 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Foto Bukti Pembayaran Terpilih</span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{proofFileName || 'bukti_bayar.png'}</p>
                        <span className="text-[10px] text-slate-400">
                          {transaction.paymentProofUrl === proofImage
                            ? 'Telah tersimpan di server (Pending Verification)'
                            : 'Siap dikirim ke server'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProofImage('');
                          setProofFileName('');
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Rekening Pengirim / Catatan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Transfer a.n Pengirim dari BCA"
                        value={proofNotes}
                        onChange={(e) => setProofNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitProof}
                      disabled={uploadingProof}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {uploadingProof ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengirim Bukti ke Server...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4" />
                          <span>{transaction.paymentProofUrl ? 'Kirim Ulang Bukti Pembayaran' : 'Kirim Bukti Pembayaran ke Server'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* If already uploaded, show Pending Verification alert and instant simulator */}
                {(transaction.status === 'pending_verification' || transaction.paymentProofUrl) && (
                  <div className="p-3 bg-amber-100/70 border border-amber-300 text-amber-900 text-xs rounded-xl space-y-2 mt-2">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Status: Pending Verification</strong>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Bukti pembayaran telah tersimpan di server database. Saat Admin mengklik <strong>ACC Bayar</strong> di Admin Portal CMS, suara +{transaction.voteCount} akan langsung otomatis masuk ke Leaderboard.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateAdminAcc}
                      disabled={simulatingAcc}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      {simulatingAcc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Simulasikan Admin ACC Bayar Langsung (Uji Coba Cepat)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* IF STATUS IS PAID: SUCCESS BADGE */}
            {transaction.status === 'paid' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Pembayaran Telah di-ACC oleh Admin Portal CMS</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Seluruh suara (+{transaction.voteCount} Suara) telah sah teralokasi ke database dan tercermin langsung pada Leaderboard kompetisi.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Cetak Tanda Terima</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('event-detail', { slug: transaction.eventSlug })}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span>Lihat Leaderboard Event</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
