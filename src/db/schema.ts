import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. admins (Single administrator record with security protection)
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull().default('Administrator Popular Vote ID'),
  avatarUrl: text('avatar_url'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 2. events (Competitions / contests)
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  organizerName: text('organizer_name').notNull().default('POPULAR VOTE ID Official'),
  bannerUrl: text('banner_url').notNull(),
  logoUrl: text('logo_url'),
  description: text('description').notNull(),
  rules: text('rules'),
  votingGuide: text('voting_guide'),
  eventType: text('event_type').notNull().default('Modelling Competition'),
  // Status: draft | upcoming | published | voting_open | voting_closed | completed | archived
  status: text('status').notNull().default('published'),
  // Voting mode: free | paid | both
  votingMode: text('voting_mode').notNull().default('paid'),
  isLeaderboardPublic: boolean('is_leaderboard_public').notNull().default(true),
  showVoteCounts: boolean('show_vote_counts').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  votingStartDate: timestamp('voting_start_date'),
  votingEndDate: timestamp('voting_end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 3. event_categories
export const eventCategories = pgTable('event_categories', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 4. candidates (Participants)
export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => eventCategories.id, { onDelete: 'set null' }),
  candidateNumber: text('candidate_number').notNull(),
  name: text('name').notNull(),
  titleTag: text('title_tag'),
  photoUrl: text('photo_url').notNull(),
  bio: text('bio'),
  instagram: text('instagram'),
  totalVotes: integer('total_votes').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 5. candidate_media (Gallery photos / media)
export const candidateMedia = pgTable('candidate_media', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull().default('image'),
  mediaUrl: text('media_url').notNull(),
  caption: text('caption'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 6. vote_packages
export const votePackages = pgTable('vote_packages', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  votesCount: integer('votes_count').notNull(),
  bonusVotes: integer('bonus_votes').notNull().default(0),
  price: integer('price').notNull(), // IDR integer
  description: text('description'),
  badgeLabel: text('badge_label'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 7. voters
export const voters = pgTable('voters', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 8. transactions
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transactionCode: text('transaction_code').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  packageId: integer('package_id').references(() => votePackages.id, { onDelete: 'set null' }),
  voterId: integer('voter_id').references(() => voters.id, { onDelete: 'set null' }),
  voterName: text('voter_name').notNull(),
  voterEmail: text('voter_email'),
  voterPhone: text('voter_phone'),
  voteCount: integer('vote_count').notNull(),
  amount: integer('amount').notNull(), // IDR
  paymentMethod: text('payment_method').notNull().default('qris'), // qris | bank_transfer | free
  paymentProvider: text('payment_provider').notNull().default('qris_midtrans'),
  // Status: pending | paid | failed | expired | cancelled | refunded
  status: text('status').notNull().default('pending'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  qrisPayload: text('qris_payload'),
  vaNumber: text('va_number'),
  bankName: text('bank_name'),
  paymentProofUrl: text('payment_proof_url'),
  paymentProofUploadedAt: timestamp('payment_proof_uploaded_at'),
  paidAt: timestamp('paid_at'),
  expiresAt: timestamp('expires_at'),
  votesAllocated: boolean('votes_allocated').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 9. payments (Proof / webhook record)
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  providerRef: text('provider_ref'),
  paymentType: text('payment_type').notNull().default('qris'),
  rawPayload: text('raw_payload'),
  verifiedAt: timestamp('verified_at').notNull().defaultNow(),
  isSandbox: boolean('is_sandbox').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 10. votes (Immutable audit record of valid individual votes)
export const votes = pgTable('votes', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  transactionId: integer('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  voteType: text('vote_type').notNull().default('paid'), // paid | free | adjustment
  voteCount: integer('vote_count').notNull().default(1),
  voterIp: text('voter_ip'),
  voterIdentifier: text('voter_identifier'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 11. vote_adjustments
export const voteAdjustments = pgTable('vote_adjustments', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  adminId: integer('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  deltaVotes: integer('delta_votes').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 12. winners
export const winners = pgTable('winners', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => eventCategories.id, { onDelete: 'set null' }),
  positionTitle: text('position_title').notNull(), // e.g. "Juara 1 / Winner", "Juara Favorit"
  rankOrder: integer('rank_order').notNull().default(1),
  announcementDate: timestamp('announcement_date').notNull().defaultNow(),
  isPublished: boolean('is_published').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 13. announcements
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 14. cms_pages
export const cmsPages = pgTable('cms_pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // about | faq | contact | terms | privacy | voting-rules
  title: text('title').notNull(),
  content: text('content').notNull(),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});

// 15. faqs
export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').notNull().default('General'),
  displayOrder: integer('display_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
});

// 16. site_settings
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 17. audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  targetEntity: text('target_entity').notNull(),
  targetId: text('target_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  categories: many(eventCategories),
  candidates: many(candidates),
  votePackages: many(votePackages),
  transactions: many(transactions),
  votes: many(votes),
  winners: many(winners),
}));

export const eventCategoriesRelations = relations(eventCategories, ({ one, many }) => ({
  event: one(events, {
    fields: [eventCategories.eventId],
    references: [events.id],
  }),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  event: one(events, {
    fields: [candidates.eventId],
    references: [events.id],
  }),
  category: one(eventCategories, {
    fields: [candidates.categoryId],
    references: [eventCategories.id],
  }),
  media: many(candidateMedia),
  votes: many(votes),
  transactions: many(transactions),
}));

export const candidateMediaRelations = relations(candidateMedia, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateMedia.candidateId],
    references: [candidates.id],
  }),
}));

export const votePackagesRelations = relations(votePackages, ({ one, many }) => ({
  event: one(events, {
    fields: [votePackages.eventId],
    references: [events.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  event: one(events, {
    fields: [transactions.eventId],
    references: [events.id],
  }),
  candidate: one(candidates, {
    fields: [transactions.candidateId],
    references: [candidates.id],
  }),
  package: one(votePackages, {
    fields: [transactions.packageId],
    references: [votePackages.id],
  }),
  payments: many(payments),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  event: one(events, {
    fields: [votes.eventId],
    references: [events.id],
  }),
  candidate: one(candidates, {
    fields: [votes.candidateId],
    references: [candidates.id],
  }),
  transaction: one(transactions, {
    fields: [votes.transactionId],
    references: [transactions.id],
  }),
}));

export const winnersRelations = relations(winners, ({ one }) => ({
  event: one(events, {
    fields: [winners.eventId],
    references: [events.id],
  }),
  candidate: one(candidates, {
    fields: [winners.candidateId],
    references: [candidates.id],
  }),
  category: one(eventCategories, {
    fields: [winners.categoryId],
    references: [eventCategories.id],
  }),
}));
