import React, { useState, useEffect } from 'react';
import {
  X,
  Vote,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Clock,
  QrCode,
  Building2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Gift,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CandidateItem, EventItem, VotePackage, TransactionItem } from '../types/index.ts';
import { formatIDR, apiRequest } from '../api/client.ts';
import { generateSampleReceipt } from '../utils/receiptGenerator.ts';

interface VotingModalProps {
  candidate: CandidateItem;
  event: EventItem;
  onClose: () => void;
  onVoteSuccess?: () => void;
  onViewTransaction?: (code: string) => void;
}

export const VotingModal: React.FC<VotingModalProps> = ({
  candidate,
  event,
  onClose,
  onVoteSuccess,
  onViewTransaction,
}) => {
  const [step, setStep] = useState<'package' | 'voter' | 'payment' | 'awaiting_approval' | 'success'>('package');
  const [selectedPackageId, setSelectedPackageId] = useState<number | 'free' | null>(null);
  const [voterName, setVoterName] = useState('');
  const [voterEmail, setVoterEmail] = useState('');
  const [voterPhone, setVoterPhone] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bank_transfer'>('qris');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [transaction, setTransaction] = useState<TransactionItem | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(1800); // 30 mins

  // Payment proof upload states
  const [proofImage, setProofImage] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofNotes, setProofNotes] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState<boolean>(false);
  const [checkingApproval, setCheckingApproval] = useState<boolean>(false);

  const packages = event.votePackages || [];
  const allowsFreeVote =
    event.votingMode === 'free' ||
    event.votingMode === 'both' ||
    packages.some((p) => p.price === 0 && p.isActive);

  // Parse candidate unique number: semisal Finalis No Urut 1 -> +1
  const candidateNumberInt = parseInt(String(candidate.candidateNumber || '').replace(/\D/g, ''), 10) || 1;
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const basePrice = selectedPkg?.price || 0;
  const isSelectedPkgFree = selectedPackageId === 'free' || (selectedPkg && selectedPkg.price === 0);
  const totalWithUniqueCode = isSelectedPkgFree ? 0 : basePrice + candidateNumberInt;

  // Countdown timer for payment step
  useEffect(() => {
    let interval: any;
    if ((step === 'payment' || step === 'awaiting_approval') && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, secondsRemaining]);

  // Polling when in awaiting_approval: check if Admin has ACC'ed the payment
  useEffect(() => {
    let pollInterval: any;
    if (step === 'awaiting_approval' && transaction) {
      pollInterval = setInterval(async () => {
        try {
          const res = await apiRequest(`/api/transactions/${transaction.transactionCode}`);
          if (res && res.status === 'paid' && res.votesAllocated) {
            setTransaction(res);
            setStep('success');
            triggerCelebration();
            if (onVoteSuccess) onVoteSuccess();
          }
        } catch (e) {
          // ignore transient poll error
        }
      }, 3500);
    }
    return () => clearInterval(pollInterval);
  }, [step, transaction]);

  // Trigger confetti on success
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }
  };

  const handleProceedToVoter = () => {
    if (!selectedPackageId) {
      setErrorMsg('Pilih paket suara terlebih dahulu');
      return;
    }
    setErrorMsg('');
    setStep('voter');
  };

  // Langsung konfirmasi dan tambah vote otomatis untuk Paket Free Vote
  const handleDirectFreeVote = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const finalVoterName = voterName.trim() || `Pendukung #${candidate.candidateNumber}`;
      const payload: any = {
        eventId: event.id,
        candidateId: candidate.id,
        packageId: selectedPackageId === 'free' ? null : selectedPackageId,
        voterName: finalVoterName,
        voterEmail: voterEmail.trim() || undefined,
        voterPhone: voterPhone.trim() || undefined,
        paymentMethod: 'free',
        bankName: undefined,
        supportMessage: supportMessage.trim() || undefined,
      };

      const res = await apiRequest('/api/voting/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.isFreeVote || res.transaction?.status === 'paid') {
        setTransaction(res.transaction);
        setStep('success');
        triggerCelebration();
        if (onVoteSuccess) onVoteSuccess();
      } else {
        setErrorMsg('Gagal memproses alokasi suara gratis');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan vote gratis');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const isFree = selectedPackageId === 'free' || (selectedPkg && selectedPkg.price === 0);
    const finalVoterName = voterName.trim() || (isFree ? `Pendukung #${candidate.candidateNumber}` : '');

    if (!isFree && !finalVoterName) {
      setErrorMsg('Nama lengkap voter wajib diisi');
      return;
    }
    if (!isFree && !agreedTerms) {
      setErrorMsg('Harap setujui peraturan dan ketentuan voting');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload: any = {
        eventId: event.id,
        candidateId: candidate.id,
        packageId: selectedPackageId === 'free' ? null : selectedPackageId,
        voterName: finalVoterName,
        voterEmail: voterEmail.trim() || undefined,
        voterPhone: voterPhone.trim() || undefined,
        paymentMethod: isFree ? 'free' : paymentMethod,
        bankName: isFree ? undefined : 'BCA',
        supportMessage: supportMessage.trim() || undefined,
      };

      const res = await apiRequest('/api/voting/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.isFreeVote || res.transaction?.status === 'paid') {
        setTransaction(res.transaction);
        setStep('success');
        triggerCelebration();
        if (onVoteSuccess) onVoteSuccess();
      } else {
        setTransaction(res.transaction);
        setStep('payment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses checkout voting');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
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

  // Helper: Load sample receipt for instant testing
  const handleUseSampleReceipt = () => {
    if (!transaction) return;
    const sample = generateSampleReceipt({
      transactionCode: transaction.transactionCode,
      amount: transaction.amount,
      voterName: voterName || transaction.voterName,
      candidateName: candidate.name,
      bankName: transaction.paymentMethod === 'bank_transfer' ? 'BCA' : undefined,
    });
    setProofImage(sample);
    setProofFileName(`bukti_transfer_${transaction.transactionCode}.png`);
    setErrorMsg('');
  };

  // Submit proof to server -> marks status as pending_verification
  const handleSubmitProof = async () => {
    if (!transaction) return;
    if (!proofImage) {
      setErrorMsg('Silakan pilih foto atau gambar bukti pembayaran terlebih dahulu');
      return;
    }

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
        setStep('awaiting_approval');
      } else {
        setErrorMsg('Gagal mengunggah bukti pembayaran');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah bukti pembayaran');
    } finally {
      setUploadingProof(false);
    }
  };

  // Check approval manually
  const handleCheckApproval = async () => {
    if (!transaction) return;
    setCheckingApproval(true);
    setErrorMsg('');
    try {
      const res = await apiRequest(`/api/transactions/${transaction.transactionCode}`);
      if (res) {
        setTransaction(res);
        if (res.status === 'paid' && res.votesAllocated) {
          setStep('success');
          triggerCelebration();
          if (onVoteSuccess) onVoteSuccess();
        } else {
          setErrorMsg('Status saat ini masih Pending Verification (Menunggu ACC oleh Admin Portal CMS).');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memeriksa status pembayaran');
    } finally {
      setCheckingApproval(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'va' | 'amount') => {
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

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Vote className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {step === 'success'
                  ? 'Voting Berhasil Dialokasikan!'
                  : step === 'awaiting_approval'
                  ? 'Pending Verification (Menunggu ACC Admin)'
                  : 'Dukung Kandidat Pilihan'}
              </h3>
              <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                <span>{event.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Candidate Mini Card */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3.5">
          <img
            src={candidate.photoUrl}
            alt={candidate.name}
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/30"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                Finalis No. {candidate.candidateNumber}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate">
                {candidate.categoryName || candidate.titleTag || 'Kandidat'}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm truncate mt-0.5">{candidate.name}</h4>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: SELECT PACKAGE */}
          {step === 'package' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pilih Paket Dukungan Suara
                </span>
                <span className="text-xs text-blue-600 font-medium">Langkah 1 dari 2</span>
              </div>

              {/* Free Vote Option if allowed */}
              {allowsFreeVote && (
                <div
                  onClick={() => setSelectedPackageId('free')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    selectedPackageId === 'free'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-slate-900 text-sm">Free Vote (Gratis)</h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          1x Suara
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Dukungan cuma-cuma dari sistem</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 text-sm">Rp0</span>
                  </div>
                </div>
              )}

              {/* Paid Packages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  const totalVotes = pkg.votesCount + (pkg.bonusVotes || 0);

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-md ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      {pkg.badgeLabel && (
                        <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                          {pkg.badgeLabel}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-900 text-sm">{pkg.name}</h5>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        </div>

                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-blue-700">{totalVotes}</span>
                          <span className="text-xs font-semibold text-slate-500">Suara</span>
                          {pkg.bonusVotes > 0 && (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                              +{pkg.bonusVotes} Bonus
                            </span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {pkg.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">Harga Dasar</span>
                        {pkg.price === 0 ? (
                          <span className="font-black text-emerald-600 text-sm">GRATIS</span>
                        ) : (
                          <span className="font-bold text-slate-900 text-sm">{formatIDR(pkg.price)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                {isSelectedPkgFree ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-left">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <Gift className="w-4 h-4 text-emerald-600" />
                        <span>Paket Free Vote Terpilih (1 Suara Gratis)</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Klik tombol di bawah untuk langsung mengonfirmasi dan menambahkan suara sah secara otomatis ke Leaderboard tanpa perlu bayar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDirectFreeVote}
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menambahkan Suara Otomatis...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Lanjut Konfirmasi Vote (Otomatis Bertambah)</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToVoter}
                    disabled={!selectedPackageId}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Lanjutkan Konfirmasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: VOTER INFO & PAYMENT METHOD */}
          {step === 'voter' && (
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('package')}
                  className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  ← Kembali ke Pilih Paket
                </button>
                <span className="text-xs text-blue-600 font-medium">Langkah 2 dari 2</span>
              </div>

              {/* Package Summary Box with Unique Finalis Number */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-medium">
                      Paket Dipilih
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedPackageId === 'free'
                        ? 'Free Vote (1 Suara)'
                        : `${selectedPkg?.name} (${
                            (selectedPkg?.votesCount || 0) + (selectedPkg?.bonusVotes || 0)
                          } Suara)`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-medium">
                      Total Bayar
                    </span>
                    <span className="font-black text-blue-700 text-base">
                      {selectedPackageId === 'free' ? 'Rp0' : formatIDR(totalWithUniqueCode)}
                    </span>
                  </div>
                </div>

                {selectedPackageId !== 'free' && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Harga Paket: {formatIDR(basePrice)}</span>
                    <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      +Rp{candidateNumberInt} (Kode Unik Finalis #{candidate.candidateNumber})
                    </span>
                  </div>
                )}
              </div>

              {/* Voter Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Voter <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. WhatsApp / HP (Opsional)
                    </label>
                    <input
                      type="tel"
                      placeholder="0812xxxxxxx"
                      value={voterPhone}
                      onChange={(e) => setVoterPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Voter (Opsional)
                    </label>
                    <input
                      type="email"
                      placeholder="voter@email.com"
                      value={voterEmail}
                      onChange={(e) => setVoterEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Pesan Dukungan / Ucapan untuk Finalis (Opsional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pesan Dukungan / Ucapan untuk Finalis (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={250}
                    placeholder={`Tuliskan ucapan penyemangat atau doa untuk ${candidate.name}...`}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Akan tampil di kolom Komentar Dukungan & profil finalis</span>
                    <span>{supportMessage.length}/250</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector (HANYA 2 METODE: QRIS & TRANSFER BCA) */}
              {selectedPackageId !== 'free' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`p-3.5 rounded-xl border-2 flex items-start gap-2.5 transition-all text-left cursor-pointer ${
                        paymentMethod === 'qris'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold">QRIS (Instan)</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Scan QRIS resmi (BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`p-3.5 rounded-xl border-2 flex items-start gap-2.5 transition-all text-left cursor-pointer ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold">Transfer Bank BCA</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Rek. 6110838067 A/N I Gede Sakha Ari Wibawa
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Agreement checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms || isSelectedPkgFree}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    {isSelectedPkgFree
                      ? `Saya menyetujui ketentuan voting resmi untuk memberikan suara kepada ${candidate.name}.`
                      : 'Saya menyetujui ketentuan voting resmi dan memahami pembayaran wajib di-ACC oleh Admin Portal CMS sebelum suara otomatis masuk ke Leaderboard.'}
                  </span>
                </label>
              </div>

              <div className="pt-2">
                {isSelectedPkgFree ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menambahkan Suara Otomatis...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Lanjut Konfirmasi Vote (Otomatis Bertambah)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyiapkan Pesanan...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Lanjut ke Pembayaran & Upload Bukti</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* STEP 3: PAYMENT SCREEN & UPLOAD BUKTI PEMBAYARAN */}
          {step === 'payment' && transaction && (
            <div className="space-y-4">
              {/* Payment Alert & Timer */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">Selesaikan Pembayaran Dalam:</span>
                </div>
                <span className="font-mono font-bold text-sm text-blue-700 bg-white px-2.5 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                  {formatTimer(secondsRemaining)}
                </span>
              </div>

              {/* Transaction Code Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                    Kode Transaksi Unik
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800">
                    {transaction.transactionCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(transaction.transactionCode, 'code')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedCode ? 'Disalin' : 'Salin'}</span>
                </button>
              </div>

              {/* QRIS Display (User-Uploaded QRIS Asset) */}
              {transaction.paymentMethod === 'qris' && (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center space-y-3">
                  <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-sm max-w-[280px]">
                    <img
                      src="/assets/aistudio/QRIS_a4298f73.jpeg"
                      alt="QRIS Standar Pembayaran Nasional - Noxaz Creative, Service"
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

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-1">
                      <span>Noxaz Creative, Service</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-[11px]">NMID: ID1026594269932</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">Total Transfer Tepat:</span>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className="text-2xl font-black text-blue-700">
                        {formatIDR(transaction.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(transaction.amount.toString(), 'amount')}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        title="Salin Nominal"
                      >
                        {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Nominal sudah ditambahkan angka unik (+Rp{candidateNumberInt}) sesuai nomor urut Finalis #{candidate.candidateNumber}. Harap transfer tepat sesuai nominal.
                    </p>
                  </div>
                </div>
              )}

              {/* Bank Transfer BCA Display (Sesuai Permintaan User) */}
              {transaction.paymentMethod === 'bank_transfer' && (
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center space-y-3.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                    <Building2 className="w-4 h-4" />
                    <span>Transfer Bank Central Asia (BCA)</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Nomor Rekening BCA Resmi:
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-mono font-black text-2xl text-slate-900 tracking-wider">
                        6110838067
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('6110838067', 'va')}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-2xs cursor-pointer"
                        title="Salin Nomor Rekening BCA"
                      >
                        {copiedVa ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      Atas Nama: <span className="text-blue-700">I Gede Sakha Ari Wibawa</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[11px] text-amber-800 block">Total Nominal Transfer Tepat (Wajib Sesuai):</span>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className="text-2xl font-black text-slate-900">{formatIDR(transaction.amount)}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(transaction.amount.toString(), 'amount')}
                        className="p-1 rounded bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 cursor-pointer"
                        title="Salin Nominal"
                      >
                        {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-amber-700 font-medium block mt-1">
                      Termasuk angka unik nomor urut finalis: +Rp{candidateNumberInt}
                    </span>
                  </div>
                </div>
              )}

              {/* FEATURE: UPLOAD BUKTI PEMBAYARAN */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Upload Bukti Pembayaran</span>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    Wajib di-ACC Admin
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Setelah transfer berhasil, unggah screenshot atau struk bukti pembayaran di bawah ini. Status akan menjadi <strong>Pending Verification</strong> dan suara langsung bertambah ke Leaderboard begitu di-ACC Admin.
                </p>

                {/* Upload Area / Preview with EXACT TEXT REQUESTED BY USER */}
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

                    {/* Quick Sample Button for Testing */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleUseSampleReceipt}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1.5 underline underline-offset-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gunakan Contoh Bukti Struk Otomatis (Uji Coba Cepat)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
                      <img
                        src={proofImage}
                        alt="Preview Bukti Pembayaran"
                        className="w-16 h-20 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Foto Bukti Pembayaran Terpilih</span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{proofFileName || 'bukti_bayar.png'}</p>
                        <span className="text-[10px] text-slate-400">Siap dikirim ke Admin Portal CMS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProofImage('');
                          setProofFileName('');
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus foto ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Notes field */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Rekening Pengirim / Catatan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Transfer a.n Pengirim dari Bank BCA"
                        value={proofNotes}
                        onChange={(e) => setProofNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={uploadingProof || !proofImage}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {uploadingProof ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Bukti ke Admin Portal CMS...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Kirim Bukti Pembayaran ke Admin</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info Note */}
              <p className="text-[11px] text-center text-slate-400">
                Setelah bukti dikirim, status menjadi <strong>Pending Verification</strong> dan Admin akan memverifikasi pembayaran Anda.
              </p>
            </div>
          )}

          {/* STEP: AWAITING ADMIN APPROVAL (PENDING VERIFICATION) */}
          {step === 'awaiting_approval' && transaction && (
            <div className="space-y-4 text-center py-2">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-8 ring-amber-50">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Status: Pending Verification
                </span>
                <h4 className="text-lg font-black text-slate-900">Bukti Pembayaran Sukses Terkirim!</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                  Admin Portal CMS akan memverifikasi bukti pembayaran Anda. Saat Admin <strong>Klik ACC Bayar</strong>, suara <strong>(+{transaction.voteCount} Suara)</strong> langsung otomatis masuk ke Leaderboard kompetisi.
                </p>
              </div>

              {/* Status details card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Kode Transaksi:</span>
                  <span className="font-mono font-bold text-blue-700">{transaction.transactionCode}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Kandidat Tujuan:</span>
                  <span className="font-bold text-slate-900">{candidate.name} (#{candidate.candidateNumber})</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Alokasi Suara:</span>
                  <span className="font-bold text-blue-700">+{transaction.voteCount} Suara</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Total Nominal Ditransfer:</span>
                  <span className="font-bold text-slate-900">{formatIDR(transaction.amount)}</span>
                </div>
                {proofImage && (
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-slate-500">Bukti Pembayaran:</span>
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tersimpan di Server (Pending Verification)
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCheckApproval}
                  disabled={checkingApproval}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {checkingApproval ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Cek Ulang Status ACC Sekarang</span>
                </button>

                <div className="flex gap-2">
                  {onViewTransaction && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onViewTransaction(transaction.transactionCode);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Buka Halaman Cek Transaksi</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Tutup Sementara
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 'success' && transaction && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pembayaran Terverifikasi & Di-ACC
                </span>
                <h4 className="text-xl font-extrabold text-slate-900">Dukungan Berhasil Masuk!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Terima kasih, <span className="font-semibold text-slate-700">{transaction.voterName}</span>. Suara Anda telah sah teralokasi langsung ke Leaderboard kompetisi.
                </p>
              </div>

              {/* Details card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Kandidat</span>
                  <span className="font-bold text-slate-900">{candidate.name} (#{candidate.candidateNumber})</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Jumlah Suara Masuk</span>
                  <span className="font-bold text-emerald-700">+{transaction.voteCount} Suara Sah</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Kode Transaksi</span>
                  <span className="font-mono font-bold text-blue-700">{transaction.transactionCode}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Status Pembayaran</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lunas & Di-ACC Admin</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Leaderboard</span>
                  <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Otomatis Terupdate Realtime</span>
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {onViewTransaction && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewTransaction(transaction.transactionCode);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Cek Tanda Terima Resmi</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
