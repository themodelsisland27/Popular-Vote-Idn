import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import {
  admins,
  events,
  eventCategories,
  candidates,
  candidateMedia,
  votePackages,
  voters,
  transactions,
  payments,
  votes,
  voteAdjustments,
  winners,
  announcements,
  cmsPages,
  faqs,
  siteSettings,
  auditLogs,
} from '../db/schema.ts';
import { eq, and, or, desc, sql, asc, inArray, ilike } from 'drizzle-orm';
import { requireAdmin, createAdminSession, revokeAdminSession, AdminAuthRequest } from './auth.ts';
import { logAdminAction } from './audit.ts';
import { generateQrisData, generateVaNumber } from './qris.ts';

export const apiRouter = Router();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// 1. Site Settings (Public)
apiRouter.get('/site/settings', async (req: Request, res: Response) => {
  try {
    const allSettings = await db.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }
    res.json(settingsMap);
  } catch (err: any) {
    console.error('Error fetching site settings:', err);
    res.status(500).json({ error: 'Gagal memuat pengaturan situs' });
  }
});

// 2. CMS Pages & FAQs (Public)
apiRouter.get('/cms/pages/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);
    if (!page.length) {
      return res.status(404).json({ error: 'Halaman tidak ditemukan' });
    }
    res.json(page[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat halaman' });
  }
});

apiRouter.get('/cms/faqs', async (req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(faqs)
      .where(eq(faqs.isPublished, true))
      .orderBy(asc(faqs.displayOrder));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat FAQ' });
  }
});

// 3. Events List (Public)
apiRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;
    let query = db.select().from(events);

    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(events.status, String(status)));
    }
    if (type && type !== 'all') {
      conditions.push(eq(events.eventType, String(type)));
    }
    if (search) {
      conditions.push(ilike(events.title, `%${String(search)}%`));
    }

    const eventList = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(events.createdAt))
      : await query.orderBy(desc(events.createdAt));

    // Enrich with candidate count and total votes count
    const enriched = await Promise.all(
      eventList.map(async (ev) => {
        const cands = await db
          .select({ count: sql<number>`count(*)::int`, totalVotes: sql<number>`sum(total_votes)::int` })
          .from(candidates)
          .where(and(eq(candidates.eventId, ev.id), eq(candidates.isPublished, true)));

        return {
          ...ev,
          candidateCount: cands[0]?.count || 0,
          totalEventVotes: cands[0]?.totalVotes || 0,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Gagal memuat daftar event' });
  }
});

// 4. Event Detail by Slug (Public)
apiRouter.get('/events/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const ev = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev.length) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }
    const eventData = ev[0];

    // Categories
    const categories = await db
      .select()
      .from(eventCategories)
      .where(eq(eventCategories.eventId, eventData.id))
      .orderBy(asc(eventCategories.displayOrder));

    // Vote Packages
    const packages = await db
      .select()
      .from(votePackages)
      .where(and(eq(votePackages.eventId, eventData.id), eq(votePackages.isActive, true)))
      .orderBy(asc(votePackages.displayOrder));

    // Aggregates
    const cands = await db
      .select({ count: sql<number>`count(*)::int`, totalVotes: sql<number>`sum(total_votes)::int` })
      .from(candidates)
      .where(and(eq(candidates.eventId, eventData.id), eq(candidates.isPublished, true)));

    res.json({
      ...eventData,
      categories,
      votePackages: packages,
      candidateCount: cands[0]?.count || 0,
      totalEventVotes: cands[0]?.totalVotes || 0,
    });
  } catch (err: any) {
    console.error('Error fetching event detail:', err);
    res.status(500).json({ error: 'Gagal memuat detail event' });
  }
});

// 5. Candidates for Event (Public)
apiRouter.get('/events/:slug/candidates', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { categoryId, search, sortBy } = req.query;

    const ev = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev.length) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }
    const eventData = ev[0];

    const conditions = [eq(candidates.eventId, eventData.id), eq(candidates.isPublished, true)];

    if (categoryId && categoryId !== 'all') {
      conditions.push(eq(candidates.categoryId, Number(categoryId)));
    }
    if (search) {
      conditions.push(ilike(candidates.name, `%${String(search)}%`));
    }

    let candList = await db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(sortBy === 'number' ? asc(candidates.candidateNumber) : desc(candidates.totalVotes));

    // Load category names
    const categories = await db
      .select()
      .from(eventCategories)
      .where(eq(eventCategories.eventId, eventData.id));

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const enriched = candList.map((c) => ({
      ...c,
      categoryName: c.categoryId ? categoryMap.get(c.categoryId) || 'Umum' : 'Umum',
      showVoteCounts: eventData.showVoteCounts,
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: 'Gagal memuat daftar peserta' });
  }
});

// 6. Single Candidate Detail (Public)
apiRouter.get('/candidates/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cand = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
    if (!cand.length) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan' });
    }

    const candData = cand[0];
    const ev = await db.select().from(events).where(eq(events.id, candData.eventId)).limit(1);
    const eventData = ev[0] || null;

    const media = await db
      .select()
      .from(candidateMedia)
      .where(eq(candidateMedia.candidateId, id))
      .orderBy(asc(candidateMedia.displayOrder));

    let category = null;
    if (candData.categoryId) {
      const cat = await db.select().from(eventCategories).where(eq(eventCategories.id, candData.categoryId)).limit(1);
      category = cat[0] || null;
    }

    // Rank & Competition Analysis
    const allPublished = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        candidateNumber: candidates.candidateNumber,
        totalVotes: candidates.totalVotes,
        categoryId: candidates.categoryId,
      })
      .from(candidates)
      .where(and(eq(candidates.eventId, candData.eventId), eq(candidates.isPublished, true)))
      .orderBy(desc(candidates.totalVotes), asc(candidates.candidateNumber));

    const totalCandidatesOverall = allPublished.length;
    const overallIndex = allPublished.findIndex((c) => c.id === candData.id);
    const rankOverall = overallIndex !== -1 ? overallIndex + 1 : 1;

    // Category Rank
    let rankCategory = rankOverall;
    let totalCandidatesCategory = totalCandidatesOverall;
    if (candData.categoryId) {
      const categoryCandidates = allPublished.filter((c) => c.categoryId === candData.categoryId);
      totalCandidatesCategory = categoryCandidates.length;
      const catIndex = categoryCandidates.findIndex((c) => c.id === candData.id);
      rankCategory = catIndex !== -1 ? catIndex + 1 : 1;
    }

    // Posisi Persaingan
    let competitionStatus = '';
    if (rankOverall === 1) {
      if (allPublished.length > 1) {
        const runnerUp = allPublished[1];
        const gap = candData.totalVotes - runnerUp.totalVotes;
        if (gap > 0) {
          competitionStatus = `Memimpin di Posisi #1 (+${gap.toLocaleString('id-ID')} suara dari ${runnerUp.name})`;
        } else {
          competitionStatus = `Memimpin di Posisi #1 (Skor sama dengan ${runnerUp.name})`;
        }
      } else {
        competitionStatus = 'Memimpin posisi teratas di kompetisi ini';
      }
    } else {
      const rivalAbove = allPublished[overallIndex - 1];
      if (rivalAbove) {
        const gap = rivalAbove.totalVotes - candData.totalVotes;
        competitionStatus = `Hanya butuh ${gap.toLocaleString('id-ID')} suara untuk menyalip ke Posisi #${rankOverall - 1} (${rivalAbove.name})`;
      } else {
        competitionStatus = `Peringkat #${rankOverall} dari ${totalCandidatesOverall} peserta`;
      }
    }

    // Top Supporters (paid transactions)
    const rawSupporters = await db
      .select({
        voterName: transactions.voterName,
        totalVotes: sql<number>`sum(${transactions.voteCount})::int`,
        txCount: sql<number>`count(${transactions.id})::int`,
      })
      .from(transactions)
      .where(and(eq(transactions.candidateId, id), eq(transactions.status, 'paid')))
      .groupBy(transactions.voterName)
      .orderBy(desc(sql`sum(${transactions.voteCount})`))
      .limit(10);

    const topSupporters = rawSupporters.map((s, idx) => ({
      rank: idx + 1,
      voterName: s.voterName,
      totalVotes: s.totalVotes,
      txCount: s.txCount,
    }));

    // Support Comments (paid transactions with voter messages)
    const rawComments = await db
      .select({
        id: transactions.id,
        voterName: transactions.voterName,
        voteCount: transactions.voteCount,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
        paidAt: transactions.paidAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.candidateId, id),
          eq(transactions.status, 'paid'),
          sql`${transactions.notes} is not null and ${transactions.notes} != ''`
        )
      )
      .orderBy(desc(transactions.paidAt), desc(transactions.createdAt))
      .limit(30);

    const supportComments = rawComments
      .filter((c) => {
        const text = (c.notes || '').trim();
        if (!text) return false;
        if (text === 'Free Vote' || text === 'Free Vote resmi teralokasi langsung') return false;
        if (text.startsWith('Paket Free Vote resmi') && !text.includes(' - ')) return false;
        if (text.startsWith('Bukti pembayaran diunggah')) return false;
        if (text === 'Dikonfirmasi & ACC Resmi oleh Admin') return false;
        return true;
      })
      .map((c) => ({
        id: c.id,
        voterName: c.voterName,
        voteCount: c.voteCount,
        message: c.notes,
        date: c.paidAt || c.createdAt,
      }));

    res.json({
      ...candData,
      event: eventData,
      category,
      media,
      rankOverall,
      totalCandidatesOverall,
      rankCategory,
      totalCandidatesCategory,
      competitionStatus,
      topSupporters,
      supportComments,
    });
  } catch (err: any) {
    console.error('Error fetching candidate:', err);
    res.status(500).json({ error: 'Gagal memuat peserta' });
  }
});

// 7. Event Leaderboard (Public)
apiRouter.get('/events/:slug/leaderboard', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { categoryId } = req.query;

    const ev = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev.length) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }
    const eventData = ev[0];

    if (!eventData.isLeaderboardPublic) {
      return res.status(403).json({
        isLeaderboardPublic: false,
        message: 'Leaderboard untuk event ini sementara disembunyikan oleh penyelenggara.',
      });
    }

    const conditions = [eq(candidates.eventId, eventData.id), eq(candidates.isPublished, true)];
    if (categoryId && categoryId !== 'all') {
      conditions.push(eq(candidates.categoryId, Number(categoryId)));
    }

    const rawLeaderboard = await db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.totalVotes), asc(candidates.candidateNumber));

    const categories = await db
      .select()
      .from(eventCategories)
      .where(eq(eventCategories.eventId, eventData.id));
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const totalVotesInView = rawLeaderboard.reduce((acc, curr) => acc + curr.totalVotes, 0);

    const ranked = rawLeaderboard.map((c, idx) => {
      const percentage = totalVotesInView > 0 ? ((c.totalVotes / totalVotesInView) * 100).toFixed(1) : '0';
      return {
        rank: idx + 1,
        id: c.id,
        candidateNumber: c.candidateNumber,
        name: c.name,
        titleTag: c.titleTag,
        photoUrl: c.photoUrl,
        categoryId: c.categoryId,
        categoryName: c.categoryId ? catMap.get(c.categoryId) || 'Umum' : 'Umum',
        totalVotes: eventData.showVoteCounts ? c.totalVotes : null,
        percentage: eventData.showVoteCounts ? percentage : null,
      };
    });

    res.json({
      event: {
        id: eventData.id,
        title: eventData.title,
        slug: eventData.slug,
        status: eventData.status,
        showVoteCounts: eventData.showVoteCounts,
        isLeaderboardPublic: eventData.isLeaderboardPublic,
      },
      totalVotes: totalVotesInView,
      categories,
      rankings: ranked,
    });
  } catch (err: any) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Gagal memuat leaderboard' });
  }
});

// 8. Public Winners Showcase
apiRouter.get('/winners', async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        id: winners.id,
        positionTitle: winners.positionTitle,
        rankOrder: winners.rankOrder,
        announcementDate: winners.announcementDate,
        notes: winners.notes,
        eventTitle: events.title,
        eventSlug: events.slug,
        candidateNumber: candidates.candidateNumber,
        candidateName: candidates.name,
        candidatePhoto: candidates.photoUrl,
        candidateBio: candidates.bio,
        candidateVotes: candidates.totalVotes,
        categoryName: eventCategories.name,
      })
      .from(winners)
      .innerJoin(events, eq(winners.eventId, events.id))
      .innerJoin(candidates, eq(winners.candidateId, candidates.id))
      .leftJoin(eventCategories, eq(winners.categoryId, eventCategories.id))
      .where(eq(winners.isPublished, true))
      .orderBy(desc(winners.announcementDate), asc(winners.rankOrder));

    res.json(list);
  } catch (err: any) {
    console.error('Error fetching winners:', err);
    res.status(500).json({ error: 'Gagal memuat daftar pemenang' });
  }
});

// 9. Transaction Lookup (Public)
apiRouter.get('/transactions/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const tx = await db
      .select({
        id: transactions.id,
        transactionCode: transactions.transactionCode,
        amount: transactions.amount,
        voteCount: transactions.voteCount,
        paymentMethod: transactions.paymentMethod,
        status: transactions.status,
        votesAllocated: transactions.votesAllocated,
        paidAt: transactions.paidAt,
        expiresAt: transactions.expiresAt,
        createdAt: transactions.createdAt,
        qrisPayload: transactions.qrisPayload,
        vaNumber: transactions.vaNumber,
        bankName: transactions.bankName,
        paymentProofUrl: transactions.paymentProofUrl,
        paymentProofUploadedAt: transactions.paymentProofUploadedAt,
        notes: transactions.notes,
        eventTitle: events.title,
        eventSlug: events.slug,
        candidateName: candidates.name,
        candidateNumber: candidates.candidateNumber,
        candidatePhoto: candidates.photoUrl,
        packageName: votePackages.name,
        voterNameMasked: sql<string>`CONCAT(SUBSTRING(${transactions.voterName}, 1, 2), '***')`,
      })
      .from(transactions)
      .innerJoin(events, eq(transactions.eventId, events.id))
      .innerJoin(candidates, eq(transactions.candidateId, candidates.id))
      .leftJoin(votePackages, eq(transactions.packageId, votePackages.id))
      .where(eq(transactions.transactionCode, code.trim()))
      .limit(1);

    if (!tx.length) {
      return res.status(404).json({ error: 'Kode transaksi tidak ditemukan. Pastikan format benar (contoh: PVI-2027-...)' });
    }

    res.json(tx[0]);
  } catch (err: any) {
    console.error('Error looking up transaction:', err);
    res.status(500).json({ error: 'Gagal mencari transaksi' });
  }
});

// 9b. Upload Payment Proof (Public voter upload)
apiRouter.post('/voting/upload-proof', async (req: Request, res: Response) => {
  try {
    const { transactionCode, proofImage, notes } = req.body;
    if (!transactionCode || !proofImage) {
      return res.status(400).json({ error: 'Kode transaksi dan bukti pembayaran (foto/gambar) wajib diunggah' });
    }

    const tx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionCode, transactionCode.trim()))
      .limit(1);

    if (!tx.length) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    const currentTx = tx[0];

    if (currentTx.status === 'paid' && currentTx.votesAllocated) {
      return res.status(400).json({ error: 'Transaksi ini sudah lunas dan suara telah masuk ke leaderboard.' });
    }

    const [updatedTx] = await db
      .update(transactions)
      .set({
        status: 'pending_verification',
        paymentProofUrl: proofImage,
        paymentProofUploadedAt: new Date(),
        notes: notes ? notes.trim() : (currentTx.notes || 'Bukti pembayaran diunggah voter, status Pending Verification'),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, currentTx.id))
      .returning();

    res.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah! Pembayaran menunggu konfirmasi dan ACC dari Admin Portal CMS.',
      transaction: updatedTx,
    });
  } catch (err: any) {
    console.error('Error uploading payment proof:', err);
    res.status(500).json({ error: 'Gagal mengunggah bukti pembayaran' });
  }
});

// 10. Voting Checkout (Free & Paid Vote)
apiRouter.post('/voting/checkout', async (req: Request, res: Response) => {
  try {
    const {
      eventId,
      candidateId,
      packageId,
      voterName,
      voterEmail,
      voterPhone,
      paymentMethod, // 'qris' | 'bank_transfer' | 'free'
      bankName,      // 'BCA' | 'Mandiri' | 'BNI' | 'BRI'
      idempotencyKey,
      supportMessage,
    } = req.body;

    if (!eventId || !candidateId || !voterName) {
      return res.status(400).json({ error: 'Data event, kandidat, dan nama voter wajib diisi' });
    }

    // Verify Event Status
    const ev = await db.select().from(events).where(eq(events.id, Number(eventId))).limit(1);
    if (!ev.length) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }
    const eventData = ev[0];
    if (eventData.status !== 'voting_open') {
      return res.status(400).json({ error: 'Voting untuk event ini belum dibuka atau telah ditutup' });
    }

    // Verify Candidate
    const cand = await db.select().from(candidates).where(and(eq(candidates.id, Number(candidateId)), eq(candidates.eventId, eventData.id))).limit(1);
    if (!cand.length || !cand[0].isPublished) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan atau belum dipublikasikan' });
    }
    const candData = cand[0];

    const effectiveIdempotencyKey = idempotencyKey || `idem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Check existing transaction with idempotency key
    const existingTx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, effectiveIdempotencyKey))
      .limit(1);

    if (existingTx.length > 0) {
      return res.json({ transaction: existingTx[0], message: 'Transaksi yang sama ditemukan' });
    }

    // Case 1: Free Vote
    if (paymentMethod === 'free') {
      const freePackages = await db
        .select()
        .from(votePackages)
        .where(and(eq(votePackages.eventId, eventData.id), eq(votePackages.price, 0), eq(votePackages.isActive, true)))
        .limit(1);

      const hasFreePackage = freePackages.length > 0;
      if (eventData.votingMode !== 'free' && eventData.votingMode !== 'both' && !hasFreePackage) {
        return res.status(400).json({ error: 'Event ini tidak mengaktifkan sistem Free Vote' });
      }

      const txCode = `PVI-FREE-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      // Record transaction
      const [newTx] = await db
        .insert(transactions)
        .values({
          transactionCode: txCode,
          eventId: eventData.id,
          candidateId: candData.id,
          packageId: null,
          voterName: voterName.trim(),
          voterEmail: voterEmail ? voterEmail.trim() : null,
          voterPhone: voterPhone ? voterPhone.trim() : null,
          voteCount: 1,
          amount: 0,
          paymentMethod: 'free',
          paymentProvider: 'system_free',
          status: 'paid',
          idempotencyKey: effectiveIdempotencyKey,
          paidAt: new Date(),
          votesAllocated: true,
          notes: supportMessage ? String(supportMessage).trim() : 'Free Vote resmi teralokasi langsung',
        })
        .returning();

      // Allocate vote
      await db.insert(votes).values({
        eventId: eventData.id,
        candidateId: candData.id,
        transactionId: newTx.id,
        voteType: 'free',
        voteCount: 1,
        voterIp: String(ipAddress),
        voterIdentifier: voterEmail || voterPhone || 'anonymous_voter',
      });

      // Increment candidate total_votes atomically
      await db
        .update(candidates)
        .set({
          totalVotes: sql`${candidates.totalVotes} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candData.id));

      return res.json({
        success: true,
        isFreeVote: true,
        transaction: newTx,
        message: 'Free Vote berhasil diberikan!',
      });
    }

    // Case 2: Paid Vote with Package
    if (!packageId) {
      return res.status(400).json({ error: 'Pilih paket voting berbayar terlebih dahulu' });
    }

    const pkg = await db
      .select()
      .from(votePackages)
      .where(and(eq(votePackages.id, Number(packageId)), eq(votePackages.eventId, eventData.id)))
      .limit(1);

    if (!pkg.length || !pkg[0].isActive) {
      return res.status(404).json({ error: 'Paket vote tidak valid atau tidak aktif' });
    }
    const pkgData = pkg[0];

    const totalVotes = pkgData.votesCount + pkgData.bonusVotes;

    // Handle Free Vote Package (Nilai Jumlah Suara 1 Suara / Rp0)
    if (pkgData.price === 0) {
      const effectiveIdempotencyKey = idempotencyKey || `free-pkg-${candData.id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const txCode = `PVI-FREE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      const [newTx] = await db
        .insert(transactions)
        .values({
          transactionCode: txCode,
          eventId: eventData.id,
          candidateId: candData.id,
          packageId: pkgData.id,
          voterName: voterName.trim(),
          voterEmail: voterEmail ? voterEmail.trim() : null,
          voterPhone: voterPhone ? voterPhone.trim() : null,
          voteCount: totalVotes,
          amount: 0,
          paymentMethod: 'free',
          paymentProvider: 'free_vote_package',
          status: 'paid',
          idempotencyKey: effectiveIdempotencyKey,
          paidAt: new Date(),
          votesAllocated: true,
          notes: supportMessage ? String(supportMessage).trim() : `Paket Free Vote resmi (${pkgData.name}) teralokasi langsung`,
        })
        .returning();

      // Allocate vote
      await db.insert(votes).values({
        eventId: eventData.id,
        candidateId: candData.id,
        transactionId: newTx.id,
        voteType: 'free',
        voteCount: totalVotes,
        voterIp: String(ipAddress),
        voterIdentifier: voterEmail || voterPhone || voterName,
      });

      // Increment candidate total_votes atomically
      await db
        .update(candidates)
        .set({
          totalVotes: sql`${candidates.totalVotes} + ${totalVotes}`,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candData.id));

      return res.json({
        success: true,
        isFreeVote: true,
        transaction: newTx,
        package: pkgData,
        candidate: candData,
        message: `Paket Free Vote (${totalVotes} Suara) berhasil dialokasikan ke Leaderboard!`,
      });
    }

    // Nominal Pembayaran ditambahkan angka unik sesuai dengan nomor urut Finalis
    // semisal Beli Vote 1.000.000 Menjadi 1.000.001 Jika Finalis Nomor Urut 1
    const candidateNumberInt = parseInt(String(candData.candidateNumber || '').replace(/\D/g, ''), 10) || 1;
    const amount = pkgData.price + candidateNumberInt;

    const txCode = `PVI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    let qrisPayload = null;
    let qrImageUrl = null;
    let vaNumber = null;
    let selectedBank = null;

    if (paymentMethod === 'bank_transfer') {
      // Transfer hanya ada pilihan BCA ke Rekening 6110838067 A/N I Gede Sakha Ari Wibawa
      selectedBank = 'BCA';
      vaNumber = '6110838067';
    } else {
      // QRIS resmi tertera Noxaz Creative, Service NMID: ID1026594269932
      qrImageUrl = '/assets/aistudio/QRIS_a4298f73.jpeg';
      qrisPayload = '00020101021126590014ID.LINKAJA.WWW01189360091500000000000215ID10265942699320303A0151440014ID.DANA.WWW01189360091500000000000215ID10265942699320303A015204581253033605802ID5922Noxaz Creative, Service6007BANDUNG61054011562070703A01630452C7';
    }

    const [newTx] = await db
      .insert(transactions)
      .values({
        transactionCode: txCode,
        eventId: eventData.id,
        candidateId: candData.id,
        packageId: pkgData.id,
        voterName: voterName.trim(),
        voterEmail: voterEmail ? voterEmail.trim() : null,
        voterPhone: voterPhone ? voterPhone.trim() : null,
        voteCount: totalVotes,
        amount,
        paymentMethod: paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'qris',
        paymentProvider: paymentMethod === 'bank_transfer' ? 'bca_manual' : 'qris_noxaz',
        status: 'pending',
        idempotencyKey: effectiveIdempotencyKey,
        qrisPayload,
        vaNumber,
        bankName: paymentMethod === 'bank_transfer' ? 'BCA' : null,
        expiresAt,
        votesAllocated: false,
        notes: supportMessage ? String(supportMessage).trim() : null,
      })
      .returning();

    res.json({
      success: true,
      transaction: {
        ...newTx,
        qrImageUrl,
      },
      package: pkgData,
      candidate: candData,
    });
  } catch (err: any) {
    console.error('Error during voting checkout:', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat memproses checkout voting' });
  }
});

// 11. Payment Webhook Simulator & Endpoint (QRIS / Bank Transfer)
apiRouter.post('/payments/webhook', async (req: Request, res: Response) => {
  try {
    const { transactionCode, status, secretKey } = req.body;

    if (!transactionCode) {
      return res.status(400).json({ error: 'Transaction code is required' });
    }

    const tx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionCode, transactionCode))
      .limit(1);

    if (!tx.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const currentTx = tx[0];

    // Prevent double allocation
    if (currentTx.status === 'paid' && currentTx.votesAllocated) {
      return res.json({ success: true, message: 'Transaction already paid and allocated', transaction: currentTx });
    }

    const isSuccess = status === 'paid' || status === 'settlement' || status === 'success';

    if (isSuccess) {
      // 1. Update Transaction to Paid
      const [updatedTx] = await db
        .update(transactions)
        .set({
          status: 'paid',
          paidAt: new Date(),
          votesAllocated: true,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, currentTx.id))
        .returning();

      // 2. Insert into Votes table (Immutable audit record)
      await db.insert(votes).values({
        eventId: currentTx.eventId,
        candidateId: currentTx.candidateId,
        transactionId: currentTx.id,
        voteType: 'paid',
        voteCount: currentTx.voteCount,
        voterIp: req.ip || '127.0.0.1',
        voterIdentifier: currentTx.voterEmail || currentTx.voterPhone || currentTx.voterName,
      });

      // 3. Atomically update Candidate's total_votes count
      await db
        .update(candidates)
        .set({
          totalVotes: sql`${candidates.totalVotes} + ${currentTx.voteCount}`,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, currentTx.candidateId));

      // 4. Record Payment verification
      await db.insert(payments).values({
        transactionId: currentTx.id,
        providerRef: `PAY-WH-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        paymentType: currentTx.paymentMethod,
        rawPayload: JSON.stringify(req.body),
        isSandbox: true,
      });

      return res.json({
        success: true,
        message: 'Pembayaran sukses diverifikasi! Suara resmi dialokasikan ke kandidat.',
        transaction: updatedTx,
      });
    } else {
      // Failed / Expired
      const newStatus = status === 'expired' ? 'expired' : 'failed';
      const [updatedTx] = await db
        .update(transactions)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, currentTx.id))
        .returning();

      return res.json({ success: false, status: newStatus, transaction: updatedTx });
    }
  } catch (err: any) {
    console.error('Error processing payment webhook:', err);
    res.status(500).json({ error: 'Gagal memproses webhook pembayaran' });
  }
});


// ==========================================
// ADMIN PORTAL CMS ENDPOINTS (SINGLE ADMINISTRATOR)
// ==========================================

// 12. Admin Authentication
apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password admin wajib diisi' });
    }

    const adminList = await db.select().from(admins).limit(1);
    if (!adminList.length) {
      return res.status(500).json({ error: 'Akun administrator belum diinisialisasi' });
    }
    const admin = adminList[0];

    // Check account lockout
    if (admin.lockedUntil && new Date() < new Date(admin.lockedUntil)) {
      const waitMinutes = Math.ceil((new Date(admin.lockedUntil).getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        error: `Akun administrator terkunci sementara karena percobaan gagal berulang. Coba lagi dalam ${waitMinutes} menit.`,
      });
    }

    // Verify email & password
    const emailMatches = admin.email.toLowerCase() === email.trim().toLowerCase();
    const passwordValid = emailMatches && bcrypt.compareSync(password, admin.passwordHash);

    if (!passwordValid) {
      const newFailed = admin.failedAttempts + 1;
      let lockTimestamp: Date | null = null;
      if (newFailed >= 5) {
        lockTimestamp = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }

      await db
        .update(admins)
        .set({
          failedAttempts: newFailed,
          lockedUntil: lockTimestamp,
        })
        .where(eq(admins.id, admin.id));

      await logAdminAction({
        adminEmail: email,
        action: 'FAILED_LOGIN_ATTEMPT',
        targetEntity: 'admins',
        targetId: admin.id,
        details: `Percobaan login gagal (upaya ke-${newFailed})`,
        ipAddress: req.ip,
      });

      return res.status(401).json({
        error: 'Kredensial administrator tidak valid.',
        remainingAttempts: Math.max(0, 5 - newFailed),
      });
    }

    // Login successful - Reset failed attempts
    await db
      .update(admins)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(admins.id, admin.id));

    const token = createAdminSession(admin.id, admin.email, admin.fullName);

    await logAdminAction({
      adminEmail: admin.email,
      action: 'ADMIN_LOGIN_SUCCESS',
      targetEntity: 'admins',
      targetId: admin.id,
      details: 'Administrator berhasil login ke Admin Portal CMS',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        avatarUrl: admin.avatarUrl,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat login' });
  }
});

apiRouter.post('/admin/logout', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    revokeAdminSession(token);
  }
  res.json({ success: true, message: 'Berhasil logout' });
});

apiRouter.get('/admin/me', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const adminList = await db.select().from(admins).limit(1);
  if (!adminList.length) {
    return res.status(404).json({ error: 'Administrator tidak ditemukan' });
  }
  const admin = adminList[0];
  res.json({
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    avatarUrl: admin.avatarUrl,
    lastLoginAt: admin.lastLoginAt,
  });
});

apiRouter.post('/admin/change-password', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password baru minimal harus 8 karakter' });
    }

    const adminList = await db.select().from(admins).limit(1);
    const admin = adminList[0];

    if (!bcrypt.compareSync(currentPassword, admin.passwordHash)) {
      return res.status(400).json({ error: 'Password saat ini salah' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db
      .update(admins)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, admin.id));

    await logAdminAction({
      adminEmail: admin.email,
      action: 'CHANGE_PASSWORD',
      targetEntity: 'admins',
      targetId: admin.id,
      details: 'Password administrator diperbarui secara aman',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password administrator berhasil diubah' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengubah password' });
  }
});

apiRouter.post('/admin/change-email', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: 'Email baru dan password konfirmasi wajib diisi' });
    }

    const adminList = await db.select().from(admins).limit(1);
    const admin = adminList[0];

    if (!bcrypt.compareSync(password, admin.passwordHash)) {
      return res.status(400).json({ error: 'Password verifikasi salah' });
    }

    await db
      .update(admins)
      .set({
        email: newEmail.trim().toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(admins.id, admin.id));

    await logAdminAction({
      adminEmail: admin.email,
      action: 'CHANGE_EMAIL',
      targetEntity: 'admins',
      targetId: admin.id,
      details: `Email administrator diubah menjadi ${newEmail}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Email administrator berhasil diperbarui' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengubah email' });
  }
});

// 13. Admin Dashboard KPIs & Charts
apiRouter.get('/admin/dashboard', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    // 1. Events breakdown
    const eventRows = await db.select({ status: events.status, count: sql<number>`count(*)::int` }).from(events).groupBy(events.status);
    let totalEvents = 0;
    let activeEvents = 0;
    let upcomingEvents = 0;
    let completedEvents = 0;

    for (const row of eventRows) {
      totalEvents += row.count;
      if (row.status === 'voting_open' || row.status === 'published') activeEvents += row.count;
      else if (row.status === 'upcoming') upcomingEvents += row.count;
      else if (row.status === 'completed') completedEvents += row.count;
    }

    // 2. Candidates & Total Votes count
    const candStats = await db
      .select({
        totalCandidates: sql<number>`count(*)::int`,
        sumVotes: sql<number>`coalesce(sum(total_votes), 0)::int`,
      })
      .from(candidates);

    // 3. Transactions & Revenue metrics
    const txStats = await db
      .select({
        status: transactions.status,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<number>`coalesce(sum(amount), 0)::int`,
      })
      .from(transactions)
      .groupBy(transactions.status);

    let totalTransactions = 0;
    let successfulTransactions = 0;
    let pendingTransactions = 0;
    let grossRevenue = 0;

    for (const t of txStats) {
      totalTransactions += t.count;
      if (t.status === 'paid') {
        successfulTransactions += t.count;
        grossRevenue += t.totalAmount;
      } else if (t.status === 'pending' || t.status === 'pending_verification') {
        pendingTransactions += t.count;
      }
    }

    // Pending Proofs awaiting Admin ACC
    const pendingProofs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        or(
          eq(transactions.status, 'pending_verification'),
          and(eq(transactions.status, 'pending'), sql`${transactions.paymentProofUrl} IS NOT NULL`)
        )
      );

    // 4. Recent Transactions
    const recentTx = await db
      .select({
        id: transactions.id,
        transactionCode: transactions.transactionCode,
        amount: transactions.amount,
        voteCount: transactions.voteCount,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        paymentProofUrl: transactions.paymentProofUrl,
        voterName: transactions.voterName,
        createdAt: transactions.createdAt,
        eventTitle: events.title,
        candidateName: candidates.name,
      })
      .from(transactions)
      .innerJoin(events, eq(transactions.eventId, events.id))
      .innerJoin(candidates, eq(transactions.candidateId, candidates.id))
      .orderBy(desc(transactions.createdAt))
      .limit(8);

    // 5. Recent Audit Logs
    const recentLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(6);

    // 6. Top Candidates across platform
    const topCandidates = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        candidateNumber: candidates.candidateNumber,
        photoUrl: candidates.photoUrl,
        totalVotes: candidates.totalVotes,
        eventTitle: events.title,
      })
      .from(candidates)
      .innerJoin(events, eq(candidates.eventId, events.id))
      .orderBy(desc(candidates.totalVotes))
      .limit(5);

    res.json({
      kpis: {
        totalEvents,
        activeEvents,
        upcomingEvents,
        completedEvents,
        totalCandidates: candStats[0]?.totalCandidates || 0,
        totalVotes: candStats[0]?.sumVotes || 0,
        totalTransactions,
        successfulTransactions,
        pendingTransactions,
        pendingProofsCount: pendingProofs[0]?.count || 0,
        grossRevenue,
      },
      recentTransactions: recentTx,
      recentLogs,
      topCandidates,
    });
  } catch (err: any) {
    console.error('Error fetching admin dashboard:', err);
    res.status(500).json({ error: 'Gagal memuat statistik dashboard' });
  }
});

// 14. Event Management (CRUD, Duplicate, Status)
apiRouter.get('/admin/events', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const list = await db.select().from(events).orderBy(desc(events.createdAt));
    const enriched = await Promise.all(
      list.map(async (ev) => {
        const cands = await db
          .select({ count: sql<number>`count(*)::int`, sumVotes: sql<number>`coalesce(sum(total_votes), 0)::int` })
          .from(candidates)
          .where(eq(candidates.eventId, ev.id));
        return {
          ...ev,
          candidateCount: cands[0]?.count || 0,
          totalVotes: cands[0]?.sumVotes || 0,
        };
      })
    );
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat event' });
  }
});

apiRouter.post('/admin/events', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      title,
      slug,
      organizerName,
      bannerUrl,
      logoUrl,
      description,
      rules,
      votingGuide,
      eventType,
      status,
      votingMode,
      isLeaderboardPublic,
      showVoteCounts,
      isFeatured,
      startDate,
      endDate,
      votingStartDate,
      votingEndDate,
    } = req.body;

    if (!title || !slug || !bannerUrl) {
      return res.status(400).json({ error: 'Judul, slug, dan banner foto wajib diisi' });
    }

    const existing = await db.select().from(events).where(eq(events.slug, slug.trim())).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Slug URL event sudah digunakan oleh event lain' });
    }

    const [newEvent] = await db
      .insert(events)
      .values({
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        organizerName: organizerName ? organizerName.trim() : 'POPULAR VOTE ID Official',
        bannerUrl: bannerUrl.trim(),
        logoUrl: logoUrl ? logoUrl.trim() : null,
        description: description ? description.trim() : `Kompetisi resmi ${title.trim()}`,
        rules: rules || '',
        votingGuide: votingGuide || '',
        eventType: eventType || 'Ajang Pencarian Bakat',
        status: status || 'voting_open',
        votingMode: votingMode || 'paid',
        isLeaderboardPublic: isLeaderboardPublic !== false,
        showVoteCounts: showVoteCounts !== false,
        isFeatured: Boolean(isFeatured),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        votingStartDate: votingStartDate ? new Date(votingStartDate) : null,
        votingEndDate: votingEndDate ? new Date(votingEndDate) : null,
      })
      .returning();

    // Create default vote packages for this event including Free Vote
    const defaultPkgs = [
      { name: 'Paket Free Vote', votesCount: 1, bonusVotes: 0, price: 0, description: '1 Vote Gratis Harian', badgeLabel: 'Gratis', displayOrder: 0 },
      { name: 'Starter', votesCount: 10, bonusVotes: 0, price: 10000, description: '10 Vote', displayOrder: 1 },
      { name: 'Bronze', votesCount: 25, bonusVotes: 0, price: 25000, description: '25 Vote', displayOrder: 2 },
      { name: 'Silver', votesCount: 50, bonusVotes: 2, price: 50000, description: '50 Vote + 2 Bonus', badgeLabel: 'Populer', displayOrder: 3 },
      { name: 'Gold', votesCount: 100, bonusVotes: 8, price: 100000, description: '100 Vote + 8 Bonus', badgeLabel: 'Best Value', displayOrder: 4 },
      { name: 'Platinum', votesCount: 250, bonusVotes: 25, price: 250000, description: '250 Vote + 25 Bonus', badgeLabel: 'Super Boost', displayOrder: 5 },
    ];
    for (const p of defaultPkgs) {
      await db.insert(votePackages).values({ eventId: newEvent.id, ...p });
    }

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'CREATE_EVENT',
      targetEntity: 'events',
      targetId: newEvent.id,
      details: `Event "${newEvent.title}" berhasil dibuat`,
      ipAddress: req.ip,
    });

    res.json(newEvent);
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat event' });
  }
});

apiRouter.put('/admin/events/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      title,
      slug,
      organizerName,
      bannerUrl,
      logoUrl,
      description,
      rules,
      votingGuide,
      eventType,
      status,
      votingMode,
      isLeaderboardPublic,
      showVoteCounts,
      isFeatured,
      startDate,
      endDate,
      votingStartDate,
      votingEndDate,
    } = req.body;

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updatePayload.title = String(title).trim();
    if (slug !== undefined) updatePayload.slug = String(slug).trim().toLowerCase();
    if (organizerName !== undefined) updatePayload.organizerName = String(organizerName).trim();
    if (bannerUrl !== undefined) updatePayload.bannerUrl = String(bannerUrl).trim();
    if (logoUrl !== undefined) updatePayload.logoUrl = logoUrl ? String(logoUrl).trim() : null;
    if (description !== undefined) updatePayload.description = String(description).trim();
    if (rules !== undefined) updatePayload.rules = rules || '';
    if (votingGuide !== undefined) updatePayload.votingGuide = votingGuide || '';
    if (eventType !== undefined) updatePayload.eventType = eventType;
    if (status !== undefined) updatePayload.status = status;
    if (votingMode !== undefined) updatePayload.votingMode = votingMode;
    if (isLeaderboardPublic !== undefined) updatePayload.isLeaderboardPublic = Boolean(isLeaderboardPublic);
    if (showVoteCounts !== undefined) updatePayload.showVoteCounts = Boolean(showVoteCounts);
    if (isFeatured !== undefined) updatePayload.isFeatured = Boolean(isFeatured);

    if (startDate !== undefined) updatePayload.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updatePayload.endDate = endDate ? new Date(endDate) : null;
    if (votingStartDate !== undefined) updatePayload.votingStartDate = votingStartDate ? new Date(votingStartDate) : null;
    if (votingEndDate !== undefined) updatePayload.votingEndDate = votingEndDate ? new Date(votingEndDate) : null;

    const [updated] = await db.update(events).set(updatePayload).where(eq(events.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'UPDATE_EVENT',
      targetEntity: 'events',
      targetId: id,
      details: `Event "${updated.title}" diperbarui`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: err.message || 'Gagal memperbarui event' });
  }
});

apiRouter.delete('/admin/events/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const ev = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!ev.length) return res.status(404).json({ error: 'Event tidak ditemukan' });

    await db.delete(events).where(eq(events.id, id));

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'DELETE_EVENT',
      targetEntity: 'events',
      targetId: id,
      details: `Event "${ev[0].title}" dihapus beserta seluruh data terkait`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Event berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus event' });
  }
});

apiRouter.post('/admin/events/:id/duplicate', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: 'Event tidak ditemukan' });

    const base = existing[0];
    const newSlug = `${base.slug}-copy-${Date.now().toString().slice(-4)}`;

    const [cloned] = await db
      .insert(events)
      .values({
        ...base,
        id: undefined as any,
        title: `${base.title} (Salinan)`,
        slug: newSlug,
        status: 'draft',
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Clone categories
    const cats = await db.select().from(eventCategories).where(eq(eventCategories.eventId, base.id));
    for (const c of cats) {
      await db.insert(eventCategories).values({
        eventId: cloned.id,
        name: c.name,
        code: c.code,
        description: c.description,
        displayOrder: c.displayOrder,
      });
    }

    // Clone packages
    const pkgs = await db.select().from(votePackages).where(eq(votePackages.eventId, base.id));
    for (const p of pkgs) {
      await db.insert(votePackages).values({
        eventId: cloned.id,
        name: p.name,
        votesCount: p.votesCount,
        bonusVotes: p.bonusVotes,
        price: p.price,
        description: p.description,
        badgeLabel: p.badgeLabel,
        displayOrder: p.displayOrder,
      });
    }

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'DUPLICATE_EVENT',
      targetEntity: 'events',
      targetId: cloned.id,
      details: `Event duplicated from ID ${base.id} to new ID ${cloned.id}`,
      ipAddress: req.ip,
    });

    res.json(cloned);
  } catch (err: any) {
    console.error('Error duplicating event:', err);
    res.status(500).json({ error: 'Gagal menggandakan event' });
  }
});

// 15. Category Management
apiRouter.get('/admin/categories', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId } = req.query;
    let query = db.select().from(eventCategories);
    if (eventId) {
      const list = await query.where(eq(eventCategories.eventId, Number(eventId))).orderBy(asc(eventCategories.displayOrder));
      return res.json(list);
    }
    const list = await query.orderBy(desc(eventCategories.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat kategori' });
  }
});

apiRouter.post('/admin/categories', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId, name, code, description, displayOrder } = req.body;
    if (!eventId || !name) {
      return res.status(400).json({ error: 'Event ID dan Nama kategori wajib diisi' });
    }
    const [newCat] = await db
      .insert(eventCategories)
      .values({
        eventId: Number(eventId),
        name: name.trim(),
        code: code ? code.trim() : null,
        description: description || '',
        displayOrder: Number(displayOrder) || 0,
      })
      .returning();

    res.json(newCat);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambahkan kategori' });
  }
});

apiRouter.put('/admin/categories/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { eventId, name, code, description, displayOrder } = req.body;

    const updatePayload: any = {};
    if (eventId !== undefined) updatePayload.eventId = Number(eventId);
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (code !== undefined) updatePayload.code = code ? String(code).trim() : null;
    if (description !== undefined) updatePayload.description = description || '';
    if (displayOrder !== undefined) updatePayload.displayOrder = Number(displayOrder) || 0;

    const [updated] = await db.update(eventCategories).set(updatePayload).where(eq(eventCategories.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message || 'Gagal memperbarui kategori' });
  }
});

apiRouter.delete('/admin/categories/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(eventCategories).where(eq(eventCategories.id, id));
    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus kategori' });
  }
});

// 16. Candidate Management
apiRouter.get('/admin/candidates', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId } = req.query;
    let query = db
      .select({
        id: candidates.id,
        eventId: candidates.eventId,
        categoryId: candidates.categoryId,
        candidateNumber: candidates.candidateNumber,
        name: candidates.name,
        titleTag: candidates.titleTag,
        photoUrl: candidates.photoUrl,
        bio: candidates.bio,
        instagram: candidates.instagram,
        totalVotes: candidates.totalVotes,
        isPublished: candidates.isPublished,
        displayOrder: candidates.displayOrder,
        createdAt: candidates.createdAt,
        eventTitle: events.title,
        categoryName: eventCategories.name,
      })
      .from(candidates)
      .innerJoin(events, eq(candidates.eventId, events.id))
      .leftJoin(eventCategories, eq(candidates.categoryId, eventCategories.id));

    if (eventId) {
      const list = await query.where(eq(candidates.eventId, Number(eventId))).orderBy(asc(candidates.candidateNumber));
      return res.json(list);
    }
    const list = await query.orderBy(desc(candidates.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat peserta' });
  }
});

apiRouter.post('/admin/candidates', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      eventId,
      categoryId,
      candidateNumber,
      name,
      titleTag,
      photoUrl,
      bio,
      instagram,
      isPublished,
      displayOrder,
    } = req.body;

    if (!eventId || !candidateNumber || !name || !photoUrl) {
      return res.status(400).json({ error: 'Event, nomor peserta, nama, dan foto wajib diisi' });
    }

    const [newCand] = await db
      .insert(candidates)
      .values({
        eventId: Number(eventId),
        categoryId: categoryId ? Number(categoryId) : null,
        candidateNumber: candidateNumber.trim(),
        name: name.trim(),
        titleTag: titleTag ? titleTag.trim() : null,
        photoUrl: photoUrl.trim(),
        bio: bio || '',
        instagram: instagram ? instagram.trim() : null,
        isPublished: isPublished !== false,
        displayOrder: Number(displayOrder) || 0,
        totalVotes: 0,
      })
      .returning();

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'CREATE_CANDIDATE',
      targetEntity: 'candidates',
      targetId: newCand.id,
      details: `Peserta "${newCand.name}" (${newCand.candidateNumber}) ditambahkan ke event ID ${newCand.eventId}`,
      ipAddress: req.ip,
    });

    res.json(newCand);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambahkan peserta' });
  }
});

apiRouter.put('/admin/candidates/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      eventId,
      categoryId,
      candidateNumber,
      name,
      titleTag,
      photoUrl,
      bio,
      instagram,
      isPublished,
      displayOrder,
    } = req.body;

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (eventId !== undefined) updatePayload.eventId = Number(eventId);
    if (categoryId !== undefined) updatePayload.categoryId = categoryId ? Number(categoryId) : null;
    if (candidateNumber !== undefined) updatePayload.candidateNumber = String(candidateNumber).trim();
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (titleTag !== undefined) updatePayload.titleTag = titleTag ? String(titleTag).trim() : null;
    if (photoUrl !== undefined) updatePayload.photoUrl = String(photoUrl).trim();
    if (bio !== undefined) updatePayload.bio = bio || '';
    if (instagram !== undefined) updatePayload.instagram = instagram ? String(instagram).trim() : null;
    if (isPublished !== undefined) updatePayload.isPublished = Boolean(isPublished);
    if (displayOrder !== undefined) updatePayload.displayOrder = Number(displayOrder) || 0;

    const [updated] = await db.update(candidates).set(updatePayload).where(eq(candidates.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan' });
    }

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'UPDATE_CANDIDATE',
      targetEntity: 'candidates',
      targetId: id,
      details: `Profil peserta "${updated.name}" diperbarui`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating candidate:', err);
    res.status(500).json({ error: err.message || 'Gagal memperbarui peserta' });
  }
});

apiRouter.delete('/admin/candidates/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cand = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
    if (!cand.length) return res.status(404).json({ error: 'Peserta tidak ditemukan' });

    await db.delete(candidates).where(eq(candidates.id, id));

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'DELETE_CANDIDATE',
      targetEntity: 'candidates',
      targetId: id,
      details: `Peserta "${cand[0].name}" (${cand[0].candidateNumber}) dihapus`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Peserta berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus peserta' });
  }
});

// CSV Import for Candidates
apiRouter.post('/admin/candidates/import-csv', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId, rows } = req.body;
    if (!eventId || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Data event dan baris CSV tidak valid' });
    }

    let importedCount = 0;
    for (const r of rows) {
      if (!r.name || !r.candidateNumber) continue;
      await db.insert(candidates).values({
        eventId: Number(eventId),
        candidateNumber: String(r.candidateNumber).trim(),
        name: String(r.name).trim(),
        titleTag: r.titleTag ? String(r.titleTag).trim() : null,
        photoUrl: r.photoUrl ? String(r.photoUrl).trim() : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        bio: r.bio || '',
        instagram: r.instagram ? String(r.instagram).trim() : null,
        totalVotes: 0,
      });
      importedCount++;
    }

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'IMPORT_CANDIDATES_CSV',
      targetEntity: 'candidates',
      targetId: eventId,
      details: `Berhasil mengimpor ${importedCount} peserta via CSV`,
      ipAddress: req.ip,
    });

    res.json({ success: true, count: importedCount, message: `Berhasil mengimpor ${importedCount} peserta` });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengimpor peserta dari CSV' });
  }
});

// 17. Vote Packages Management
apiRouter.get('/admin/vote-packages', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId } = req.query;
    let query = db
      .select({
        id: votePackages.id,
        eventId: votePackages.eventId,
        name: votePackages.name,
        votesCount: votePackages.votesCount,
        bonusVotes: votePackages.bonusVotes,
        price: votePackages.price,
        description: votePackages.description,
        badgeLabel: votePackages.badgeLabel,
        displayOrder: votePackages.displayOrder,
        isActive: votePackages.isActive,
        createdAt: votePackages.createdAt,
        eventTitle: events.title,
      })
      .from(votePackages)
      .innerJoin(events, eq(votePackages.eventId, events.id));

    if (eventId) {
      const list = await query.where(eq(votePackages.eventId, Number(eventId))).orderBy(asc(votePackages.displayOrder));
      return res.json(list);
    }
    const list = await query.orderBy(desc(votePackages.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat paket vote' });
  }
});

apiRouter.post('/admin/vote-packages', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId, name, votesCount, bonusVotes, price, description, badgeLabel, displayOrder, isActive } = req.body;
    if (!eventId || !name || !votesCount || price === undefined) {
      return res.status(400).json({ error: 'Event, nama paket, jumlah vote, dan harga wajib diisi' });
    }

    const [newPkg] = await db
      .insert(votePackages)
      .values({
        eventId: Number(eventId),
        name: name.trim(),
        votesCount: Number(votesCount),
        bonusVotes: Number(bonusVotes) || 0,
        price: Number(price),
        description: description || '',
        badgeLabel: badgeLabel ? badgeLabel.trim() : null,
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive !== false,
      })
      .returning();

    res.json(newPkg);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat paket vote' });
  }
});

apiRouter.put('/admin/vote-packages/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      eventId,
      name,
      votesCount,
      bonusVotes,
      price,
      description,
      badgeLabel,
      displayOrder,
      isActive,
    } = req.body;

    const updatePayload: any = {};
    if (eventId !== undefined) updatePayload.eventId = Number(eventId);
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (votesCount !== undefined) updatePayload.votesCount = Number(votesCount);
    if (bonusVotes !== undefined) updatePayload.bonusVotes = Number(bonusVotes) || 0;
    if (price !== undefined) updatePayload.price = Number(price);
    if (description !== undefined) updatePayload.description = description || '';
    if (badgeLabel !== undefined) updatePayload.badgeLabel = badgeLabel ? String(badgeLabel).trim() : null;
    if (displayOrder !== undefined) updatePayload.displayOrder = Number(displayOrder) || 0;
    if (isActive !== undefined) updatePayload.isActive = Boolean(isActive);

    const [updated] = await db.update(votePackages).set(updatePayload).where(eq(votePackages.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'Paket vote tidak ditemukan' });
    }
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating vote package:', err);
    res.status(500).json({ error: err.message || 'Gagal memperbarui paket vote' });
  }
});

apiRouter.delete('/admin/vote-packages/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(votePackages).where(eq(votePackages.id, id));
    res.json({ success: true, message: 'Paket vote berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus paket vote' });
  }
});

// 18. Voting Management & Audit Adjustments
apiRouter.get('/admin/votes', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId, candidateId } = req.query;
    let query = db
      .select({
        id: votes.id,
        eventId: votes.eventId,
        candidateId: votes.candidateId,
        transactionId: votes.transactionId,
        voteType: votes.voteType,
        voteCount: votes.voteCount,
        voterIp: votes.voterIp,
        voterIdentifier: votes.voterIdentifier,
        createdAt: votes.createdAt,
        eventTitle: events.title,
        candidateName: candidates.name,
        candidateNumber: candidates.candidateNumber,
      })
      .from(votes)
      .innerJoin(events, eq(votes.eventId, events.id))
      .innerJoin(candidates, eq(votes.candidateId, candidates.id));

    const conditions = [];
    if (eventId) conditions.push(eq(votes.eventId, Number(eventId)));
    if (candidateId) conditions.push(eq(votes.candidateId, Number(candidateId)));

    const list = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(votes.createdAt)).limit(100)
      : await query.orderBy(desc(votes.createdAt)).limit(100);

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat log suara' });
  }
});

apiRouter.post('/admin/votes/adjust', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId, candidateId, deltaVotes, reason } = req.body;
    if (!eventId || !candidateId || deltaVotes === undefined || !reason) {
      return res.status(400).json({ error: 'Event, kandidat, selisih suara, dan alasan audit wajib diisi' });
    }

    const delta = Number(deltaVotes);
    if (delta === 0) {
      return res.status(400).json({ error: 'Nilai penyesuaian suara tidak boleh 0' });
    }

    const cand = await db.select().from(candidates).where(eq(candidates.id, Number(candidateId))).limit(1);
    if (!cand.length) return res.status(404).json({ error: 'Kandidat tidak ditemukan' });

    // Record adjustment
    await db.insert(voteAdjustments).values({
      eventId: Number(eventId),
      candidateId: Number(candidateId),
      adminId: req.admin?.adminId || null,
      deltaVotes: delta,
      reason: reason.trim(),
    });

    // Record vote line
    await db.insert(votes).values({
      eventId: Number(eventId),
      candidateId: Number(candidateId),
      voteType: 'adjustment',
      voteCount: delta,
      voterIp: req.ip || 'admin_console',
      voterIdentifier: `Admin: ${req.admin?.email} (${reason})`,
    });

    // Update candidate total_votes
    const [updatedCand] = await db
      .update(candidates)
      .set({
        totalVotes: sql`GREATEST(0, ${candidates.totalVotes} + ${delta})`,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, Number(candidateId)))
      .returning();

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'VOTE_ADJUSTMENT',
      targetEntity: 'candidates',
      targetId: candidateId,
      details: `Penyesuaian suara: ${delta > 0 ? '+' : ''}${delta} suara untuk ${updatedCand.name}. Alasan: ${reason}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Penyesuaian suara berhasil disimpan. Total suara baru: ${updatedCand.totalVotes}`,
      candidate: updatedCand,
    });
  } catch (err: any) {
    console.error('Error adjusting votes:', err);
    res.status(500).json({ error: 'Gagal melakukan penyesuaian suara' });
  }
});

// 19. Transaction Management
apiRouter.get('/admin/transactions', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { status, eventId, search } = req.query;
    let query = db
      .select({
        id: transactions.id,
        transactionCode: transactions.transactionCode,
        amount: transactions.amount,
        voteCount: transactions.voteCount,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        paymentProvider: transactions.paymentProvider,
        paymentProofUrl: transactions.paymentProofUrl,
        paymentProofUploadedAt: transactions.paymentProofUploadedAt,
        notes: transactions.notes,
        voterName: transactions.voterName,
        voterEmail: transactions.voterEmail,
        voterPhone: transactions.voterPhone,
        votesAllocated: transactions.votesAllocated,
        paidAt: transactions.paidAt,
        expiresAt: transactions.expiresAt,
        createdAt: transactions.createdAt,
        eventTitle: events.title,
        candidateName: candidates.name,
        candidateNumber: candidates.candidateNumber,
        packageName: votePackages.name,
      })
      .from(transactions)
      .innerJoin(events, eq(transactions.eventId, events.id))
      .innerJoin(candidates, eq(transactions.candidateId, candidates.id))
      .leftJoin(votePackages, eq(transactions.packageId, votePackages.id));

    const conditions = [];
    if (status === 'pending_proof' || status === 'pending_verification') {
      conditions.push(
        or(
          eq(transactions.status, 'pending_verification'),
          and(eq(transactions.status, 'pending'), sql`${transactions.paymentProofUrl} IS NOT NULL`)
        )
      );
    } else if (status && status !== 'all') {
      conditions.push(eq(transactions.status, String(status)));
    }
    if (eventId && eventId !== 'all') conditions.push(eq(transactions.eventId, Number(eventId)));
    if (search) {
      conditions.push(
        sql`(${transactions.transactionCode} ILIKE ${`%${String(search)}%`} OR ${transactions.voterName} ILIKE ${`%${String(search)}%`})`
      );
    }

    const list = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(transactions.createdAt)).limit(100)
      : await query.orderBy(desc(transactions.createdAt)).limit(100);

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat transaksi' });
  }
});

// Manual Verification / ACC by Admin (alias /acc-payment)
const handleAccTransaction = async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const tx = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!tx.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const currentTx = tx[0];

    if (currentTx.status === 'paid' && currentTx.votesAllocated) {
      return res.status(400).json({ error: 'Transaksi ini sudah berstatus paid dan suara sudah dialokasikan ke leaderboard' });
    }

    // 1. Mark as Paid
    const [updatedTx] = await db
      .update(transactions)
      .set({
        status: 'paid',
        paidAt: new Date(),
        votesAllocated: true,
        notes: `Dikonfirmasi & ACC Resmi oleh Admin (${req.admin?.email})`,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, currentTx.id))
      .returning();

    // 2. Allocate votes into votes audit table
    await db.insert(votes).values({
      eventId: currentTx.eventId,
      candidateId: currentTx.candidateId,
      transactionId: currentTx.id,
      voteType: 'paid',
      voteCount: currentTx.voteCount,
      voterIp: req.ip || '127.0.0.1',
      voterIdentifier: currentTx.voterEmail || currentTx.voterName,
    });

    // 3. Atomically update Candidate's total_votes in Database
    await db
      .update(candidates)
      .set({
        totalVotes: sql`${candidates.totalVotes} + ${currentTx.voteCount}`,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, currentTx.candidateId));

    // 4. Payment record
    await db.insert(payments).values({
      transactionId: currentTx.id,
      providerRef: `ACC-ADMIN-${Date.now()}`,
      paymentType: currentTx.paymentMethod,
      rawPayload: JSON.stringify({ verifiedBy: req.admin?.email, manual: true, proof: currentTx.paymentProofUrl ? 'Attached' : 'None' }),
      isSandbox: false,
    });

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'ADMIN_ACC_PAYMENT',
      targetEntity: 'transactions',
      targetId: currentTx.id,
      details: `Bukti transaksi ${currentTx.transactionCode} (${currentTx.amount} IDR) di-ACC Admin. Alokasi: ${currentTx.voteCount} suara langsung ke leaderboard.`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Pembayaran sukses di-ACC! Suara sejumlah ${currentTx.voteCount} suara langsung otomatis masuk ke Leaderboard.`,
      transaction: updatedTx,
    });
  } catch (err: any) {
    console.error('Manual verification error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi / ACC transaksi' });
  }
};

apiRouter.post('/admin/transactions/:id/verify-manual', requireAdmin, handleAccTransaction);
apiRouter.post('/admin/transactions/:id/acc-payment', requireAdmin, handleAccTransaction);

// Reject Payment Proof by Admin
apiRouter.post('/admin/transactions/:id/reject-payment', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;
    const tx = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!tx.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const currentTx = tx[0];

    if (currentTx.status === 'paid' && currentTx.votesAllocated) {
      return res.status(400).json({ error: 'Transaksi sudah dibayar, gunakan fitur refund jika ingin membatalkan' });
    }

    const [updatedTx] = await db
      .update(transactions)
      .set({
        status: 'failed',
        notes: `Ditolak Admin (${req.admin?.email}): ${reason || 'Bukti transfer tidak valid atau dana belum masuk'}`,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, currentTx.id))
      .returning();

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'REJECT_PAYMENT_PROOF',
      targetEntity: 'transactions',
      targetId: currentTx.id,
      details: `Bukti transaksi ${currentTx.transactionCode} ditolak. Alasan: ${reason || 'Tidak valid'}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Pembayaran ditolak. Catatan penolakan tersimpan di log.',
      transaction: updatedTx,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menolak pembayaran' });
  }
});

// Transaction Refund
apiRouter.post('/admin/transactions/:id/refund', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;
    const tx = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!tx.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const currentTx = tx[0];

    if (currentTx.status === 'refunded') {
      return res.status(400).json({ error: 'Transaksi ini sudah pernah di-refund' });
    }

    // If votes were previously allocated, deduct them
    if (currentTx.votesAllocated) {
      await db
        .update(candidates)
        .set({
          totalVotes: sql`GREATEST(0, ${candidates.totalVotes} - ${currentTx.voteCount})`,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, currentTx.candidateId));

      await db.insert(votes).values({
        eventId: currentTx.eventId,
        candidateId: currentTx.candidateId,
        transactionId: currentTx.id,
        voteType: 'adjustment',
        voteCount: -currentTx.voteCount,
        voterIp: req.ip || 'admin_console',
        voterIdentifier: `Refund Transaksi: ${currentTx.transactionCode}`,
      });
    }

    const [updatedTx] = await db
      .update(transactions)
      .set({
        status: 'refunded',
        votesAllocated: false,
        notes: `Refund oleh Admin (${req.admin?.email}): ${reason || 'Tidak ada alasan'}`,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, currentTx.id))
      .returning();

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'TRANSACTION_REFUND',
      targetEntity: 'transactions',
      targetId: currentTx.id,
      details: `Transaksi ${currentTx.transactionCode} di-refund. Suara dialokasikan dikembalikan. Alasan: ${reason}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Transaksi berhasil di-refund', transaction: updatedTx });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal melakukan refund' });
  }
});

// 20. Winner Management
apiRouter.get('/admin/winners', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const list = await db
      .select({
        id: winners.id,
        eventId: winners.eventId,
        candidateId: winners.candidateId,
        categoryId: winners.categoryId,
        positionTitle: winners.positionTitle,
        rankOrder: winners.rankOrder,
        announcementDate: winners.announcementDate,
        isPublished: winners.isPublished,
        notes: winners.notes,
        eventTitle: events.title,
        candidateName: candidates.name,
        candidateNumber: candidates.candidateNumber,
        candidatePhoto: candidates.photoUrl,
        categoryName: eventCategories.name,
      })
      .from(winners)
      .innerJoin(events, eq(winners.eventId, events.id))
      .innerJoin(candidates, eq(winners.candidateId, candidates.id))
      .leftJoin(eventCategories, eq(winners.categoryId, eventCategories.id))
      .orderBy(asc(winners.rankOrder));

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat pemenang' });
  }
});

apiRouter.post('/admin/winners', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { eventId, candidateId, categoryId, positionTitle, rankOrder, isPublished, notes } = req.body;
    if (!eventId || !candidateId || !positionTitle) {
      return res.status(400).json({ error: 'Event, kandidat, dan gelar juara wajib diisi' });
    }

    const [newWinner] = await db
      .insert(winners)
      .values({
        eventId: Number(eventId),
        candidateId: Number(candidateId),
        categoryId: categoryId ? Number(categoryId) : null,
        positionTitle: positionTitle.trim(),
        rankOrder: Number(rankOrder) || 1,
        isPublished: isPublished !== false,
        notes: notes || '',
      })
      .returning();

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'ADD_WINNER',
      targetEntity: 'winners',
      targetId: newWinner.id,
      details: `Pemenang disahkan: ${positionTitle} untuk kandidat ID ${candidateId}`,
      ipAddress: req.ip,
    });

    res.json(newWinner);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambahkan pemenang' });
  }
});

apiRouter.put('/admin/winners/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      eventId,
      candidateId,
      categoryId,
      positionTitle,
      rankOrder,
      isPublished,
      notes,
    } = req.body;

    const updatePayload: any = {};
    if (eventId !== undefined) updatePayload.eventId = Number(eventId);
    if (candidateId !== undefined) updatePayload.candidateId = Number(candidateId);
    if (categoryId !== undefined) updatePayload.categoryId = categoryId ? Number(categoryId) : null;
    if (positionTitle !== undefined) updatePayload.positionTitle = String(positionTitle).trim();
    if (rankOrder !== undefined) updatePayload.rankOrder = Number(rankOrder) || 1;
    if (isPublished !== undefined) updatePayload.isPublished = Boolean(isPublished);
    if (notes !== undefined) updatePayload.notes = notes || '';

    const [updated] = await db.update(winners).set(updatePayload).where(eq(winners.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: 'Data pemenang tidak ditemukan' });
    }
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating winner:', err);
    res.status(500).json({ error: err.message || 'Gagal memperbarui pemenang' });
  }
});

apiRouter.delete('/admin/winners/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(winners).where(eq(winners.id, id));
    res.json({ success: true, message: 'Data pemenang berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus pemenang' });
  }
});

// 21. Reports & CSV Export
apiRouter.get('/admin/reports/:type', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    let csvData = '';

    if (type === 'events') {
      const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));
      csvData = 'ID,Title,Slug,Status,Event Type,Total Votes,Created At\n';
      for (const e of allEvents) {
        csvData += `"${e.id}","${e.title}","${e.slug}","${e.status}","${e.eventType}","${e.createdAt}"\n`;
      }
    } else if (type === 'candidates') {
      const allCands = await db
        .select({
          id: candidates.id,
          name: candidates.name,
          number: candidates.candidateNumber,
          totalVotes: candidates.totalVotes,
          eventTitle: events.title,
        })
        .from(candidates)
        .innerJoin(events, eq(candidates.eventId, events.id))
        .orderBy(desc(candidates.totalVotes));

      csvData = 'ID,Candidate Number,Name,Event,Total Votes\n';
      for (const c of allCands) {
        csvData += `"${c.id}","${c.number}","${c.name}","${c.eventTitle}","${c.totalVotes}"\n`;
      }
    } else if (type === 'transactions') {
      const allTx = await db
        .select({
          code: transactions.transactionCode,
          voterName: transactions.voterName,
          amount: transactions.amount,
          votes: transactions.voteCount,
          status: transactions.status,
          method: transactions.paymentMethod,
          date: transactions.createdAt,
          eventTitle: events.title,
          candidateName: candidates.name,
        })
        .from(transactions)
        .innerJoin(events, eq(transactions.eventId, events.id))
        .innerJoin(candidates, eq(transactions.candidateId, candidates.id))
        .orderBy(desc(transactions.createdAt));

      csvData = 'Transaction Code,Event,Candidate,Voter Name,Amount (IDR),Votes,Method,Status,Date\n';
      for (const t of allTx) {
        csvData += `"${t.code}","${t.eventTitle}","${t.candidateName}","${t.voterName}","${t.amount}","${t.votes}","${t.method}","${t.status}","${t.date}"\n`;
      }
    } else {
      return res.status(400).json({ error: 'Tipe laporan tidak dikenal' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="popularvote_${type}_${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat laporan CSV' });
  }
});

// 22. CMS Content Management
apiRouter.get('/admin/cms', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const pages = await db.select().from(cmsPages);
    const faqList = await db.select().from(faqs).orderBy(asc(faqs.displayOrder));
    res.json({ pages, faqs: faqList });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat konten CMS' });
  }
});

apiRouter.put('/admin/cms/pages/:slug', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, content } = req.body;
    const [updated] = await db
      .update(cmsPages)
      .set({ title, content, lastUpdated: new Date() })
      .where(eq(cmsPages.slug, slug))
      .returning();

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'UPDATE_CMS_PAGE',
      targetEntity: 'cms_pages',
      targetId: slug,
      details: `Halaman CMS "${title}" (${slug}) diperbarui`,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui halaman CMS' });
  }
});

apiRouter.post('/admin/cms/faqs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { question, answer, category, displayOrder } = req.body;
    const [newFaq] = await db
      .insert(faqs)
      .values({
        question: question.trim(),
        answer: answer.trim(),
        category: category || 'General',
        displayOrder: Number(displayOrder) || 0,
      })
      .returning();
    res.json(newFaq);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambahkan FAQ' });
  }
});

apiRouter.put('/admin/cms/faqs/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(faqs).set(req.body).where(eq(faqs.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui FAQ' });
  }
});

apiRouter.delete('/admin/cms/faqs/:id', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(faqs).where(eq(faqs.id, id));
    res.json({ success: true, message: 'FAQ berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus FAQ' });
  }
});

// 23. Platform Settings Management
apiRouter.get('/admin/settings', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const list = await db.select().from(siteSettings);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat pengaturan' });
  }
});

apiRouter.put('/admin/settings', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { settings } = req.body; // array of { key, value }
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Format data pengaturan tidak valid' });
    }

    for (const item of settings) {
      await db
        .insert(siteSettings)
        .values({ key: item.key, value: item.value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: item.value, updatedAt: new Date() },
        });
    }

    await logAdminAction({
      adminEmail: req.admin?.email || 'admin',
      action: 'UPDATE_SETTINGS',
      targetEntity: 'site_settings',
      details: `Memperbarui ${settings.length} konfigurasi platform`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Pengaturan platform berhasil disimpan' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui pengaturan' });
  }
});

// 24. Audit Logs
apiRouter.get('/admin/audit-logs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat log audit' });
  }
});
