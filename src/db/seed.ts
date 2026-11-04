import bcrypt from 'bcryptjs';
import { db } from './index.ts';
import {
  admins,
  events,
  eventCategories,
  candidates,
  votePackages,
  cmsPages,
  faqs,
  siteSettings,
  auditLogs,
  winners
} from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Single Administrator
  const existingAdmin = await db.select().from(admins).limit(1);
  let adminId = existingAdmin[0]?.id;

  if (!existingAdmin || existingAdmin.length === 0) {
    const passwordHash = bcrypt.hashSync('admin123456', 10);
    const [newAdmin] = await db.insert(admins).values({
      email: 'admin@popularvote.id',
      passwordHash,
      fullName: 'Chief Administrator POPULAR VOTE ID',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    }).returning();
    adminId = newAdmin.id;
    console.log('Seeded single administrator: admin@popularvote.id / admin123456');

    await db.insert(auditLogs).values({
      adminEmail: 'system',
      action: 'SYSTEM_INIT',
      targetEntity: 'admins',
      targetId: String(adminId),
      details: 'Initial single administrator initialized with default credentials',
      ipAddress: '127.0.0.1',
    });
  }

  // 2. Seed Site Settings
  const defaultSettings = [
    { key: 'platform_name', value: 'POPULAR VOTE ID', description: 'Nama resmi platform voting' },
    { key: 'platform_tagline', value: 'Your Vote, Your Power', description: 'Tagline resmi platform' },
    { key: 'currency', value: 'IDR', description: 'Mata uang default (Rupiah)' },
    { key: 'timezone', value: 'Asia/Makassar', description: 'Zona waktu platform (WITA)' },
    { key: 'contact_email', value: 'support@popularvote.id', description: 'Email bantuan resmi' },
    { key: 'contact_whatsapp', value: '+6281234567890', description: 'Nomor WhatsApp resmi' },
    { key: 'contact_address', value: 'Popular Vote ID Tower, Jl. Jend. Sudirman Kav. 28, Jakarta Selatan / Makassar Hub', description: 'Alamat kantor resmi' },
    { key: 'social_instagram', value: '@popularvote.id', description: 'Akun Instagram resmi' },
    { key: 'social_tiktok', value: '@popularvoteid', description: 'Akun TikTok resmi' },
    { key: 'social_youtube', value: 'POPULAR VOTE ID Official', description: 'Kanal YouTube resmi' },
    { key: 'maintenance_mode', value: 'false', description: 'Status mode pemeliharaan (true/false)' },
    { key: 'payment_gateway_mode', value: 'sandbox', description: 'Mode payment gateway: sandbox / production' },
    { key: 'payment_gateway_provider', value: 'midtrans_qris', description: 'Provider gateway aktif' },
    { key: 'auto_confirm_free_vote', value: 'true', description: 'Konfirmasi otomatis vote gratis' },
    { key: 'qris_merchant_name', value: 'POPULAR VOTE ID INDONESIA', description: 'Nama Merchant QRIS' },
  ];

  for (const setting of defaultSettings) {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, setting.key));
    if (existing.length === 0) {
      await db.insert(siteSettings).values(setting);
    }
  }

  // 3. Seed CMS Pages
  const defaultPages = [
    {
      slug: 'about',
      title: 'Tentang POPULAR VOTE ID',
      content: `POPULAR VOTE ID adalah platform digital multi-event online voting terkemuka di Indonesia yang mengusung prinsip "Your Vote, Your Power". 

Didirikan untuk menghadirkan transparansi, akurasi, dan kemudahan dalam penyelenggaraan berbagai ajang bergengsi:
• Modelling Competition & Runway
• Beauty Pageant & Duta Budaya
• Kids Talent & Modelling Search
• Music, Dance & Entertainment Awards
• Public Choice & Popularity Contests

Platform kami dibangun dengan infrastruktur enterprise berkeamanan tinggi, integrasi pembayaran instan (QRIS & Virtual Account), enkripsi anti-fraud, dan penghitungan suara realtime berbasis audit log.`,
    },
    {
      slug: 'voting-rules',
      title: 'Peraturan & Tata Cara Voting',
      content: `1. KETENTUAN UMUM
Setiap voter berhak memberikan dukungan kepada kandidat pilihan melalui sistem Free Vote (jika event mengaktifkan mode gratis) maupun Paid Vote (Paket Suara).

2. KESAHAN SUARA
• Suara dari transaksi berbayar hanya dialokasikan 1 (satu) kali setelah status pembayaran diverifikasi sukses oleh sistem / Payment Gateway.
• Transaksi yang gagal atau kedaluwarsa tidak akan menghasilkan penambahan suara.
• Sistem dilengkapi proteksi idempotency dan anti-duplikasi otomatis.

3. PEMBAYARAN QRIS & BANK TRANSFER
• QRIS dapat dipindai menggunakan seluruh aplikasi perbankan (BCA, Mandiri, BRI, BNI) maupun dompet digital (GoPay, OVO, Dana, ShopeePay).
• Pembayaran diverifikasi dalam hitungan detik.

4. INTEGRITAS & AUDIT
Penyelenggara dan Administrator menerapkan zero-tolerance terhadap kecurangan atau manipulasi suara. Seluruh log transaksi dan suara tercatat permanen di database.`,
    },
    {
      slug: 'terms',
      title: 'Syarat & Ketentuan Layanan',
      content: `Dengan mengakses dan menggunakan platform POPULAR VOTE ID, Anda menyetujui seluruh syarat dan ketentuan berikut:
1. Suara yang telah dibeli dan sukses dialokasikan bersifat final dan tidak dapat dibatalkan (non-refundable), kecuali event resmi dibatalkan oleh penyelenggara.
2. Pengguna dilarang melakukan serangan brute force, manipulasi API, atau upaya rekayasa pembayaran.
3. Hak cipta materi event, foto peserta, dan logo dilindungi undang-undang.
4. Keputusan pengumuman pemenang akhir yang disahkan Administrator bersifat mutlak.`,
    },
    {
      slug: 'privacy',
      title: 'Kebijakan Privasi',
      content: `POPULAR VOTE ID menghargai privasi voter dan kandidat.
1. Informasi voter (nama, nomor telepon/WhatsApp, email) hanya digunakan untuk pengiriman tanda terima transaksi dan verifikasi suara.
2. Data pribadi tidak akan dijual atau dipindahtangankan kepada pihak ketiga tanpa izin.
3. Seluruh transmisi data dienkripsi dengan standar TLS/SSL modern.`,
    },
    {
      slug: 'contact',
      title: 'Hubungi Kami',
      content: `Layanan Pengaduan & Bantuan POPULAR VOTE ID:
• Customer Care WhatsApp: +62 851-2804-6632 (Aktif 24/7 selama periode voting)
• Email Resmi: support@popularvote.id
• Jam Operasional Admin: Senin - Minggu, 08:00 - 22:00 WITA (Asia/Makassar)
• Alamat: POPULAR VOTE ID HQ, Denpasar, Bali.`,
    },
    {
      slug: 'faq',
      title: 'Pertanyaan Umum (FAQ)',
      content: `Pertanyaan umum mengenai tata cara voting, pembayaran QRIS, perolehan leaderboard, dan konfirmasi transaksi.`,
    },
  ];

  for (const page of defaultPages) {
    const existing = await db.select().from(cmsPages).where(eq(cmsPages.slug, page.slug));
    if (existing.length === 0) {
      await db.insert(cmsPages).values(page);
    }
  }

  // 4. Seed FAQs
  const defaultFaqs = [
    {
      question: 'Bagaimana cara melakukan voting untuk kandidat favorit saya?',
      answer: 'Pilih event yang sedang berlangsung, cari atau pilih kandidat pilihan Anda, klik tombol "Vote Now", tentukan paket suara (vote package), masukkan data nama dan kontak voter, lalu selesaikan pembayaran melalui QRIS atau Virtual Account.',
      category: 'Voting',
      displayOrder: 1,
    },
    {
      question: 'Berapa lama suara saya masuk ke Leaderboard setelah pembayaran?',
      answer: 'Sistem POPULAR VOTE ID menggunakan verifikasi webhook otomatis. Begitu pembayaran QRIS atau Bank Transfer Anda berhasil, suara akan teralokasi secara instan (1-3 detik) dan leaderboard langsung ter-update.',
      category: 'Voting',
      displayOrder: 2,
    },
    {
      question: 'Metode pembayaran apa saja yang didukung?',
      answer: 'Kami mendukung QRIS (dapat dibayar dari BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, LinkAja, ShopeePay) serta Transfer Bank Virtual Account.',
      category: 'Pembayaran',
      displayOrder: 3,
    },
    {
      question: 'Bagaimana cara mengecek status transaksi saya?',
      answer: 'Gunakan menu "Cek Transaksi" di bagian atas halaman website, lalu masukkan Kode Transaksi unik Anda (contoh: PVI-2027-XXXXXXXX) untuk melihat status pembayaran dan alokasi suara.',
      category: 'Transaksi',
      displayOrder: 4,
    },
    {
      question: 'Apakah hasil voting dijamin transparan dan tidak dimanipulasi?',
      answer: 'Ya. Seluruh suara dihitung secara matematis dari database transaksi sah yang memiliki referensi unik dan tercatat di audit log. Platform diawasi oleh Single Administrator dengan kontrol keamanan ketat.',
      category: 'Keamanan',
      displayOrder: 5,
    },
  ];

  const existingFaqs = await db.select().from(faqs).limit(1);
  if (existingFaqs.length === 0) {
    for (const faq of defaultFaqs) {
      await db.insert(faqs).values(faq);
    }
  }

  // 5. Seed Events, Categories, Candidates, and Vote Packages
  const existingEvents = await db.select().from(events).limit(1);
  if (existingEvents.length === 0) {
    // Event 1: Moon & Star Model Look 2027 (Active / Voting Open)
    const [event1] = await db.insert(events).values({
      slug: 'moon-star-model-look-2027',
      title: 'Moon & Star Model Look 2027',
      organizerName: 'Indonesia Fashion & Modelling Association',
      bannerUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80',
      description: 'Ajang pencarian bakat model runway, fotogenik, dan commercial model terbesar di Indonesia tahun 2027. Mengapresiasi talenta muda penuh karisma dan daya pikat bintang.',
      rules: `1. Voting terbuka untuk umum secara nasional dan internasional.
2. Voter dapat memilih lebih dari satu paket vote untuk kandidat yang sama atau kandidat berbeda.
3. Kategori dinilai berdasarkan akumulasi suara terbanyak dari publik yang disahkan panitia.
4. Pengumuman pemenang akan diumumkan secara langsung pada malam Grand Final di Bali Convention Center.`,
      votingGuide: `1. Pilih kandidat model favorit Anda pada daftar peserta.
2. Tentukan paket vote yang diinginkan (Starter hingga Star).
3. Isi nama dan WhatsApp/email untuk penerimaan bukti voting resmi.
4. Lakukan pembayaran dengan memindai kode QRIS dinamis yang muncul.
5. Suara akan langsung masuk secara realtime ke leaderboard kompetisi.`,
      eventType: 'Modelling Competition',
      status: 'voting_open',
      votingMode: 'both', // Free + Paid
      isLeaderboardPublic: true,
      showVoteCounts: true,
      isFeatured: true,
      startDate: new Date('2027-01-10T10:00:00+08:00'),
      endDate: new Date('2027-03-30T22:00:00+08:00'),
      votingStartDate: new Date('2026-10-01T00:00:00+08:00'),
      votingEndDate: new Date('2027-03-29T23:59:59+08:00'),
    }).returning();

    // Event 1 Categories
    const [cat1] = await db.insert(eventCategories).values({
      eventId: event1.id,
      name: 'Adult Female Model',
      code: 'AFM',
      description: 'Kategori Model Wanita Dewasa usia 17 - 25 tahun',
      displayOrder: 1,
    }).returning();

    const [cat2] = await db.insert(eventCategories).values({
      eventId: event1.id,
      name: 'Adult Male Model',
      code: 'AMM',
      description: 'Kategori Model Pria Dewasa usia 17 - 26 tahun',
      displayOrder: 2,
    }).returning();

    const [cat3] = await db.insert(eventCategories).values({
      eventId: event1.id,
      name: 'Teen Runway Look',
      code: 'TRL',
      description: 'Kategori Model Remaja usia 13 - 16 tahun',
      displayOrder: 3,
    }).returning();

    // Event 1 Vote Packages
    const packagesData = [
      { name: 'Starter', votesCount: 10, bonusVotes: 0, price: 10000, description: 'Paket vote awal untuk memberikan dukungan nyata', badgeLabel: null, displayOrder: 1 },
      { name: 'Bronze', votesCount: 25, bonusVotes: 0, price: 25000, description: 'Dukungan solid untuk melesatkan posisi kandidat', badgeLabel: null, displayOrder: 2 },
      { name: 'Silver', votesCount: 50, bonusVotes: 2, price: 50000, description: 'Paket populer dengan bonus 2 vote ekstra', badgeLabel: 'Populer', displayOrder: 3 },
      { name: 'Gold', votesCount: 100, bonusVotes: 8, price: 100000, description: 'Paket pilihan utama pendukung setia (+8 bonus vote)', badgeLabel: 'Best Value', displayOrder: 4 },
      { name: 'Platinum', votesCount: 250, bonusVotes: 25, price: 250000, description: 'Dukungan masif dengan bonus 25 vote ekstra', badgeLabel: 'Super Boost', displayOrder: 5 },
      { name: 'Grand', votesCount: 1000, bonusVotes: 150, price: 500000, description: 'Lonjakan 1.150 vote langsung mengamankan puncak ranking', badgeLabel: 'Mega Impact', displayOrder: 6 },
      { name: 'Star Ultimate', votesCount: 2500, bonusVotes: 450, price: 1000000, description: 'Paket tertinggi untuk mengantarkan sang bintang juara (+450 bonus)', badgeLabel: 'Champion Maker', displayOrder: 7 },
    ];

    for (const p of packagesData) {
      await db.insert(votePackages).values({
        eventId: event1.id,
        ...p,
      });
    }

    // Event 1 Candidates
    const candidatesData = [
      {
        candidateNumber: '01',
        name: 'Aurelia Clarissa',
        titleTag: 'Finalist DKI Jakarta',
        categoryId: cat1.id,
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        bio: 'Model runway dan fashion enthusiast dengan pengalaman di Jakarta Fashion Week. Bertekad membawa keanggunan busana nusantara ke kancah global.',
        instagram: '@aureliaclarissa',
        totalVotes: 1420,
        displayOrder: 1,
      },
      {
        candidateNumber: '02',
        name: 'Devan Pratama',
        titleTag: 'Finalist Jawa Barat',
        categoryId: cat2.id,
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
        bio: 'Commercial model dan atlet basket. Memiliki dedikasi tinggi dalam industri modelling profesional dan kepemimpinan generasi muda.',
        instagram: '@devanpratama_',
        totalVotes: 1285,
        displayOrder: 2,
      },
      {
        candidateNumber: '03',
        name: 'Nathania Zahra',
        titleTag: 'Finalist Jawa Timur',
        categoryId: cat1.id,
        photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
        bio: 'Mahasiswi Seni Rupa dan desainer muda yang aktif di panggung catwalk Surabaya dan Bali Fashion Festival.',
        instagram: '@nathania.zahra',
        totalVotes: 940,
        displayOrder: 3,
      },
      {
        candidateNumber: '04',
        name: 'Rian Bagaskara',
        titleTag: 'Finalist DI Yogyakarta',
        categoryId: cat2.id,
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
        bio: 'Aktor teater dan model editorial dengan karakter kuat. Mengusung konsep kesenian tradisi yang berpadu dengan modernitas.',
        instagram: '@rian_bagaskara',
        totalVotes: 810,
        displayOrder: 4,
      },
      {
        candidateNumber: '05',
        name: 'Chelsea Abigail',
        titleTag: 'Finalist Bali',
        categoryId: cat3.id,
        photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
        bio: 'Bakat muda dengan prestasi di berbagai kompetisi foto remaja nasional. Energik, berbakat, dan percaya diri.',
        instagram: '@chelsea.abigail',
        totalVotes: 650,
        displayOrder: 5,
      },
      {
        candidateNumber: '06',
        name: 'Kenzo Valentino',
        titleTag: 'Finalist Sumatera Utara',
        categoryId: cat3.id,
        photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
        bio: 'Remaja multitalenta dalam bidang public speaking dan modelling kasual kontemporer.',
        instagram: '@kenzovalentino',
        totalVotes: 490,
        displayOrder: 6,
      },
    ];

    for (const c of candidatesData) {
      await db.insert(candidates).values({
        eventId: event1.id,
        ...c,
      });
    }

    // Event 2: Fresh Model Hunt 2027 (Modeling Competition)
    const [event2] = await db.insert(events).values({
      slug: 'fresh-model-hunt-2027',
      title: 'Fresh Model Hunt 2027',
      organizerName: 'POPULAR VOTE ID Official',
      bannerUrl: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80',
      logoUrl: null,
      description: 'Ajang kompetisi pencarian bakat model muda berprestasi tingkat nasional tahun 2027.',
      rules: '1. Voting terbuka untuk umum.\n2. Suara dihitung transparan secara realtime.\n3. Keputusan dewan juri dan hasil vote resmi mengikat.',
      votingGuide: 'Pilih kandidat model favorit Anda, pilih paket vote, dan selesaikan pembayaran.',
      eventType: 'Modeling Competition',
      status: 'voting_open',
      votingMode: 'paid',
      isLeaderboardPublic: true,
      showVoteCounts: true,
      isFeatured: true,
      votingStartDate: new Date('2026-11-03T14:00:00+08:00'),
      votingEndDate: new Date('2026-11-09T16:00:00+08:00'),
    }).returning();

    // Event 2 Categories
    const [catFMHTK] = await db.insert(eventCategories).values({
      eventId: event2.id,
      name: 'TK',
      code: 'FMHTK',
      description: 'Kategori Tingkat Taman Kanak-Kanak',
      displayOrder: 1,
    }).returning();

    const [catFMHA] = await db.insert(eventCategories).values({
      eventId: event2.id,
      name: 'SD 1 - 3',
      code: 'FMHA',
      description: 'Kategori Tingkat Sekolah Dasar Kelas 1 - 3',
      displayOrder: 2,
    }).returning();

    const [catFMHB] = await db.insert(eventCategories).values({
      eventId: event2.id,
      name: 'SD 4 - 6',
      code: 'FMHB',
      description: 'Kategori Tingkat Sekolah Dasar Kelas 4 - 6',
      displayOrder: 3,
    }).returning();

    // Event 2 Vote Packages
    const freshPackages = [
      { name: 'Paket Free Vote', votesCount: 1, bonusVotes: 0, price: 0, description: '1 Suara Vote Gratis (Rp 0)', badgeLabel: 'Gratis', displayOrder: 0 },
      { name: 'Silver', votesCount: 50, bonusVotes: 2, price: 50000, description: '50 Vote + 2 Bonus', badgeLabel: 'Populer', displayOrder: 3 },
      { name: 'Gold', votesCount: 100, bonusVotes: 8, price: 100000, description: '100 Vote + 8 Bonus', badgeLabel: 'Best Value', displayOrder: 4 },
      { name: 'Popular', votesCount: 10000, bonusVotes: 500, price: 1000000, description: '10.000 Vote + 500 Bonus', badgeLabel: 'Mega Impact', displayOrder: 5 },
      { name: 'Popular Ultimate', votesCount: 100000, bonusVotes: 0, price: 2000000, description: '100.000 Vote Juara', badgeLabel: 'Champion Maker', displayOrder: 6 },
    ];

    for (const p of freshPackages) {
      await db.insert(votePackages).values({
        eventId: event2.id,
        ...p,
      });
    }

    // Event 2 Candidates
    const freshCandidates = [
      { candidateNumber: '1', name: 'FMHTK Wira', categoryId: catFMHTK.id, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 110502, displayOrder: 1 },
      { candidateNumber: '1', name: 'Dewa', categoryId: null, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 21002, displayOrder: 2 },
      { candidateNumber: '2', name: 'Satya - FMHTK', categoryId: catFMHTK.id, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 108, displayOrder: 3 },
      { candidateNumber: '3', name: 'Ningsih - FMHTK', categoryId: catFMHTK.id, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 52, displayOrder: 4 },
      { candidateNumber: '2', name: 'Ratna', categoryId: null, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 0, displayOrder: 5 },
      { candidateNumber: '3', name: 'Pasek', categoryId: null, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 0, displayOrder: 6 },
      { candidateNumber: '4', name: 'Cinta', categoryId: null, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', totalVotes: 0, displayOrder: 7 },
    ];

    for (const c of freshCandidates) {
      await db.insert(candidates).values({
        eventId: event2.id,
        isPublished: true,
        ...c,
      });
    }

    console.log('Successfully seeded Moon & Star Model Look 2027 and Fresh Model Hunt 2027.');
  }

  // Cleanup obsolete events if present in existing databases (e.g. Published or Vercel databases)
  const obsoleteSlugs = ['putra-putri-nusantara-2027', 'indonesian-kids-talent-search-2027', 'entertainment-awards-2026'];
  for (const slug of obsoleteSlugs) {
    const oldEv = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (oldEv.length > 0) {
      await db.delete(events).where(eq(events.id, oldEv[0].id));
      console.log(`Cleaned up obsolete event: ${slug}`);
    }
  }

  console.log('--- Database Seeding Complete ---');
}
