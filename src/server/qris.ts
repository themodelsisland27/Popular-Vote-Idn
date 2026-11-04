import QRCode from 'qrcode';

/**
 * Generates an Indonesian Standard QRIS EMVCo mock payload and data URL.
 * Includes Merchant Name, Transaction Code, and Rupiah Amount.
 */
export async function generateQrisData(transactionCode: string, amount: number, merchantName = 'POPULAR VOTE ID INDONESIA') {
  // EMVCo format simplified string for QRIS payload
  const payload = `00020101021226680016ID.POPULARVOTE.WWW01189360091438910023450215${transactionCode}52045814530336054${amount.toString().length < 10 ? '0' + amount.toString().length : amount.toString().length}${amount}5802ID59${merchantName.length < 10 ? '0' + merchantName.length : merchantName.length}${merchantName}6014JAKARTA PUSAT61051011062${transactionCode.length < 10 ? '0' + transactionCode.length : transactionCode.length}${transactionCode}6304ABCD`;

  const qrImageUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0B1730',
      light: '#FFFFFF',
    },
  });

  return { payload, qrImageUrl };
}

/**
 * Generates a mock Bank Virtual Account number (e.g. BCA, Mandiri, BNI, BRI)
 */
export function generateVaNumber(bankName: string, transactionId: number) {
  const prefixes: Record<string, string> = {
    BCA: '80777',
    Mandiri: '88908',
    BNI: '98801',
    BRI: '12800',
  };
  const prefix = prefixes[bankName.toUpperCase()] || '80777';
  const suffix = String(10000000 + transactionId).slice(-7);
  return `${prefix}${suffix}`;
}
