export interface EventItem {
  id: number;
  slug: string;
  title: string;
  organizerName: string;
  bannerUrl: string;
  logoUrl?: string | null;
  description: string;
  rules?: string | null;
  votingGuide?: string | null;
  eventType: string;
  status: 'draft' | 'upcoming' | 'published' | 'voting_open' | 'voting_closed' | 'completed' | 'archived';
  votingMode: 'free' | 'paid' | 'both';
  isLeaderboardPublic: boolean;
  showVoteCounts: boolean;
  isFeatured: boolean;
  startDate?: string | null;
  endDate?: string | null;
  votingStartDate?: string | null;
  votingEndDate?: string | null;
  candidateCount?: number;
  totalEventVotes?: number;
  totalVotes?: number;
  categories?: EventCategory[];
  votePackages?: VotePackage[];
  createdAt: string;
  updatedAt: string;
}

export interface EventCategory {
  id: number;
  eventId: number;
  name: string;
  code?: string | null;
  description?: string | null;
  displayOrder: number;
  createdAt?: string;
}

export interface CandidateItem {
  id: number;
  eventId: number;
  categoryId?: number | null;
  candidateNumber: string;
  name: string;
  titleTag?: string | null;
  photoUrl: string;
  bio?: string | null;
  instagram?: string | null;
  totalVotes: number;
  isPublished: boolean;
  displayOrder: number;
  categoryName?: string;
  eventTitle?: string;
  showVoteCounts?: boolean;
  event?: EventItem;
  category?: EventCategory;
  media?: { id: number; mediaUrl: string; caption?: string }[];
  rankOverall?: number;
  totalCandidatesOverall?: number;
  rankCategory?: number;
  totalCandidatesCategory?: number;
  competitionStatus?: string;
  topSupporters?: { rank: number; voterName: string; totalVotes: number; txCount: number }[];
  supportComments?: { id: number; voterName: string; voteCount: number; message: string; date: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface VotePackage {
  id: number;
  eventId: number;
  name: string;
  votesCount: number;
  bonusVotes: number;
  price: number;
  description?: string | null;
  badgeLabel?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface TransactionItem {
  id: number;
  transactionCode: string;
  eventId: number;
  candidateId: number;
  packageId?: number | null;
  voterName: string;
  voterEmail?: string | null;
  voterPhone?: string | null;
  voteCount: number;
  amount: number;
  paymentMethod: 'qris' | 'bank_transfer' | 'free';
  paymentProvider: string;
  status: 'pending' | 'pending_verification' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';
  idempotencyKey: string;
  qrisPayload?: string | null;
  qrImageUrl?: string | null;
  vaNumber?: string | null;
  bankName?: string | null;
  paymentProofUrl?: string | null;
  paymentProofUploadedAt?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  votesAllocated: boolean;
  notes?: string | null;
  createdAt: string;
  eventTitle?: string;
  candidateName?: string;
  candidateNumber?: string;
  candidatePhoto?: string;
  packageName?: string;
  voterNameMasked?: string;
}

export interface WinnerItem {
  id: number;
  eventId: number;
  candidateId: number;
  categoryId?: number | null;
  positionTitle: string;
  rankOrder: number;
  announcementDate: string;
  isPublished: boolean;
  notes?: string | null;
  eventTitle: string;
  eventSlug: string;
  candidateNumber: string;
  candidateName: string;
  candidatePhoto: string;
  candidateBio?: string;
  candidateVotes?: number;
  categoryName?: string;
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface AuditLogItem {
  id: number;
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}
