/**
 * Helper to generate an authentic-looking Indonesian transfer receipt image (Data URL)
 * for testing and demonstration of the Payment Proof Upload & ACC feature.
 */
export function generateSampleReceipt(data: {
  transactionCode: string;
  amount: number;
  voterName: string;
  candidateName: string;
  bankName?: string;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 780;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Receipt Card
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillRect(40, 40, 520, 700);
  ctx.shadowColor = 'transparent';

  // Card Header Band
  const grad = ctx.createLinearGradient(40, 40, 560, 40);
  grad.addColorStop(0, '#1d4ed8');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(40, 40, 520, 110);

  // Header Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUKTI TRANSFER BERHASIL', 300, 85);

  ctx.font = '13px Inter, sans-serif';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('POPULAR VOTE ID — PAYMENT GATEWAY', 300, 115);

  // Success Checkmark Circle
  ctx.beginPath();
  ctx.arc(300, 195, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(288, 195);
  ctx.lineTo(296, 204);
  ctx.lineTo(314, 186);
  ctx.stroke();

  // Amount
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px Inter, sans-serif';
  ctx.fillText(`Rp ${data.amount.toLocaleString('id-ID')}`, 300, 260);

  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = '#10b981';
  ctx.fillText('TRANSAKSI BERHASIL DIPROSES PENGIRIM', 300, 285);

  // Divider dashed
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(70, 315);
  ctx.lineTo(530, 315);
  ctx.stroke();
  ctx.setLineDash([]);

  // Detail rows helper
  const drawRow = (label: string, value: string, y: number, isMono = false) => {
    ctx.textAlign = 'left';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(label, 70, y);

    ctx.textAlign = 'right';
    ctx.font = isMono ? 'bold 12px monospace' : 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(value, 530, y);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  drawRow('Waktu Transfer', dateStr, 355);
  drawRow('Nomor Transaksi', data.transactionCode, 395, true);
  drawRow('Metode Pembayaran', data.bankName ? 'Transfer Bank BCA' : 'QRIS (Noxaz Creative)', 435);
  drawRow('Nama Pengirim (Voter)', data.voterName, 475);
  drawRow('Kandidat Pilihan', data.candidateName, 515);
  drawRow('Penerima', data.bankName ? 'BCA 6110838067 (I Gede Sakha)' : 'Noxaz Creative, Service', 555);
  drawRow('Status Bukti', 'Siap Diverifikasi Admin', 595);

  // Footer notes box
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(70, 630, 460, 70);
  ctx.fillStyle = '#475569';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Simpan bukti transfer ini sebagai referensi resmi.', 300, 658);
  ctx.fillText('Suara akan masuk otomatis begitu di-ACC oleh Admin Portal CMS.', 300, 678);

  return canvas.toDataURL('image/png');
}
