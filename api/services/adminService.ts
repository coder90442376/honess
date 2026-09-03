import { apiClient } from '@/lib/api'

/**
 * Admin API Service (AD-01..AD-10)
 * -------------------------------------------------------------------------
 * Typed wrapper over the backend admin API mounted at /api/admin. The shared
 * apiClient (lib/api) already prefixes the base URL with /api and attaches the
 * bearer token, so paths here begin with /admin.
 *
 * The backend wraps every successful response as { success: true, data: ... }.
 * Each method unwraps and returns `data`.
 */

// ── Shared types ──────────────────────────────────────────────────────────
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  pagination: Pagination
  [key: string]: T[] | Pagination | unknown
}

export type Permission = string

export interface AdminMe {
  id: string
  email: string
  display_name: string
  admin_roles: string[]
  permissions: Permission[] // ['*'] for super admin
}

export interface AdminRole {
  key: string
  label: string
  description: string
  permissions: string[]
}

// ── Dashboard (AD-01) ───────────────────────────────────────────────────
export interface DashboardOverview {
  generated_at: string
  window_days: number
  users: {
    total: number
    new_in_window: number
    active_30d: number
    blocked: number
    creators: number
    admins: number
  }
  campaigns: {
    total: number
    new_in_window: number
    pending_moderation: number
    flagged: number
    by_status: Record<string, number>
  }
  finance: {
    all_time: FinanceMoney
    window: FinanceMoney
  }
  queues: {
    open_reports: number
    pending_verifications: number
    open_alerts: number
    critical_alerts: number
    transactions_on_hold: number
  }
  recent_activity: AuditLogEntry[]
}

export interface FinanceMoney {
  gross_cents: number
  gross_dollars: number
  platform_fees_cents: number
  platform_fees_dollars: number
  net_to_creators_cents: number
  net_to_creators_dollars: number
  transaction_count: number
}

export interface TimeSeries {
  signups: Array<{ _id: string; count: number }>
  donations: Array<{ _id: string; gross_cents: number; count: number }>
}

// ── Analytics (AN-02 Platform Analytics) ────────────────────────────────
export interface PlatformAnalytics {
  period: string
  generated_at: string
  users: { total: number; new_this_period: number; active_donors_this_period: number }
  campaigns: { total: number; active: number; completed: number; new_this_period: number; completion_rate: number }
  donations: {
    count: number
    gross_cents: number
    gross_dollars: number
    platform_fees_cents: number
    platform_fees_dollars: number
    average_donation_dollars: number
  }
  revenue: {
    donation_fees_dollars: number
    sponsorship_fees_dollars: number
    total_platform_revenue_dollars: number
  }
  sponsorships: { active: number; gross_dollars: number }
  businesses: { total: number }
  top_categories: Array<{ category: string; campaigns: number; raised_dollars: number }>
  geographic_distribution: Array<{ country: string; state: string; campaigns: number; raised_dollars: number }>
}

export interface RegionImpactReport {
  group_by: string
  filters: { country: string | null; state: string | null }
  generated_at: string
  regions: Array<{
    region: string
    campaigns: number
    active_campaigns: number
    completed_campaigns: number
    donations: number
    volunteers: number
    raised_dollars: number
    goal_dollars: number
    funding_progress: number
  }>
}

// ── Moderation (AD-02 / AD-08) ──────────────────────────────────────────
export interface ModerationCampaign {
  _id: string
  campaign_id: string
  title: string
  status: string
  created_at: string
  /** 'fundraising' = a Free Campaign, 'sharing' = already a Share Campaign. */
  campaign_type?: 'fundraising' | 'sharing'
  upgrade_meta?: {
    original_campaign_type?: string | null
    upgraded_at?: string | null
    upgrade_initiator_type?: 'creator' | 'sponsor' | 'admin' | null
  }
  creator_id?: { _id: string; display_name: string; email: string; verified?: boolean; trust_score?: number }
  moderation?: {
    review_status: string
    review_notes?: string
    rejection_reason?: string
    flag_reason?: string
    report_count?: number
    risk_score?: number | null
  }
}

export interface UpgradeBlocker {
  code: string
  message: string
}

/** Context an admin reviews before upgrading a campaign. Carries no payment credentials. */
export interface CampaignUpgradeContext {
  campaign: {
    id: string
    campaign_id: string
    title: string
    status: string
    campaign_type: string
    original_campaign_type: string | null
    created_at: string
    review_status: string | null
  }
  owner: {
    id: string
    display_name: string
    email: string
    created_at: string
    blocked: boolean
    identity_verified: boolean
    trust_score: number | null
  } | null
  payout_readiness: {
    ready: boolean
    level: 'verified' | 'provisional' | 'none'
    method: { id: string; type: string; last_four: string | null } | null
    reason: string | null
  }
  risk: { risk_score: number | null; report_count: number }
  blockers: UpgradeBlocker[]
  /** Non-blocking advisories, e.g. the owner has no payout method yet. */
  warnings: UpgradeBlocker[]
  can_upgrade: boolean
  upgrade_history: CampaignUpgradeRecord[]
}

export interface CampaignUpgradeRecord {
  _id: string
  campaign_ref: string | null
  campaign_title: string | null
  owner_id?: { _id: string; display_name?: string; email?: string } | string
  initiated_by?: { _id: string; display_name?: string; email?: string } | string
  initiator_type: 'creator' | 'sponsor' | 'admin'
  status: string
  admin_note: string | null
  reason: string | null
  rejection_reason: string | null
  payout_readiness?: { readiness_level: string }
  created_at: string
  completed_at: string | null
  expires_at: string | null
}

export interface CampaignUpgradesPage {
  upgrades: CampaignUpgradeRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface UpgradeFunnel {
  window: { start: string | null; end: string | null }
  attempted: number
  succeeded: number
  failed: number
  conversion_rate: number
  payout_gate_failures: number
  payout_gate_share_of_failures: number
  /** Share of ALL attempts turned away by the payout gate. The rollout metric. */
  payout_gate_block_rate: number
  failures_by_reason: Array<{ reason_code: string; count: number; payout_gate: boolean }>
  successes_by_initiator: Array<{ initiator_type: string; count: number }>
  sponsored: { requested: number; approved: number; rejected: number; approval_rate: number }
}

export interface BoostAnalytics {
  window: { start: string | null; end: string | null }
  counted: number
  suppressed: number
  revoked: number
  total: number
  suppression_rate: number
  suppressed_by_reason: Array<{ reason: string; count: number }>
}

export interface UpgradeStatsResponse {
  funnel: UpgradeFunnel
  boosts: BoostAnalytics
}

export interface SupportBoostRecord {
  _id: string
  booster_id?: { _id: string; display_name?: string; email?: string; created_at?: string } | string
  boost_type: string
  source: string
  counts_toward_score: boolean
  trust_weight: number
  score_contribution: number
  suppressed_reason: string | null
  boost_day: string
  ip_hash: string | null
  revoked_at: string | null
  revoked_reason: string | null
  created_at: string
}

export interface SupportBoostsPage {
  campaign: {
    id: string
    campaign_id: string
    title: string
    community_boost_score: number
    community_boost_count: number
  }
  boosts: SupportBoostRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface FlaggedComment {
  _id: string
  content: string
  status: string
  report_count: number
  created_at: string
  is_deleted: boolean
  user_id?: { _id: string; display_name: string; email: string }
  campaign_id?: { _id: string; title: string; campaign_id: string }
}

// ── Users (AD-03) ─────────────────────────────────────────────────────────
export interface AdminUser {
  _id: string
  email: string
  display_name: string
  role: string
  admin_roles?: string[]
  verified: boolean
  verification_status?: string
  blocked: boolean
  trust_score?: number
  created_at: string
  last_login?: string
  stats?: Record<string, number>
}

export interface UserDetail {
  user: AdminUser
  activity: {
    campaigns_created: number
    donations_count: number
    total_donated_cents: number
    total_donated_dollars: number
  }
  reports: { open_against_user: number; recent: UserReport[] }
}

export interface UserReport {
  _id: string
  report_id: string
  reason: string
  description: string
  status: string
  severity: string
  action_taken?: string
  created_at: string
  reporter_id?: { display_name: string; email: string }
  reported_user_id?: { _id: string; display_name: string; email: string; blocked?: boolean }
}

// ── Finance (AD-04 / AD-10) ─────────────────────────────────────────────
export interface FinanceOverview {
  range: { startDate: string | null; endDate: string | null }
  volume: FinanceMoney
  refunds: { amount_cents: number; amount_dollars: number; count: number }
  on_hold: { amount_cents: number; amount_dollars: number; count: number }
  fees_by_status: Record<string, StatusBucket>
  withdrawals_by_status: Record<string, StatusBucket>
  payouts_by_status: Record<string, StatusBucket>
  settlements_by_status: Record<string, StatusBucket>
}
export interface StatusBucket { count: number; amount_cents: number; amount_dollars: number }

export interface AdminTransaction {
  _id: string
  transaction_id: string
  amount_cents: number
  platform_fee_cents: number
  net_amount_cents: number
  status: string
  payment_method: string
  created_at: string
  campaign_id?: { title: string; campaign_id: string }
  supporter_id?: { display_name: string; email: string }
}

export interface PeriodReport {
  range: { startDate: string; endDate: string; groupBy: string }
  periods: Array<{
    period: string
    gross_dollars: number
    platform_fees_dollars: number
    net_dollars: number
    transaction_count: number
  }>
  totals: { gross_dollars: number; platform_fees_dollars: number; net_dollars: number; count: number }
}

export interface Reconciliation {
  range: { startDate: string | null; endDate: string | null }
  transaction_fees_cents: number
  ledger_fees_cents: number
  difference_cents: number
  difference_dollars: number
  balanced: boolean
  transaction_count: number
  ledger_count: number
  discrepancies: { transactions_missing_ledger: number; ledger_orphans: number }
}

// ── Verification (AD-05) ─────────────────────────────────────────────────
export interface VerificationSubmission {
  _id: string
  tier: string
  document_type: string
  status: string
  submitted_at: string
  reviewed_at?: string
  rejection_reason?: string
  review_notes?: string
  document_front_url?: string
  document_back_url?: string
  selfie_url?: string
  automated_checks?: Record<string, unknown>
  user_id?: { _id: string; display_name: string; email: string; verified?: boolean; trust_score?: number }
}

// ── Fraud (AD-06) ─────────────────────────────────────────────────────────
export interface FraudDashboard {
  alerts: {
    by_severity: Record<string, number>
    by_status: Record<string, number>
    recent_open: FraudAlert[]
  }
  ai_assessments: {
    by_risk_level: Record<string, number>
    top_risks: FraudAssessment[]
  }
}
export interface FraudAlert {
  _id: string
  alert_type: string
  severity: string
  title: string
  description: string
  status: string
  created_at: string
  assigned_to?: { display_name: string; email: string }
}
export interface FraudAssessment {
  _id: string
  subject_type: string
  subject_id: string
  risk_score: number
  risk_level: string
  summary?: string
  recommended_action?: string
  review_status: string
  flagged_for_review: boolean
}

// ── Audit (AD-09) ─────────────────────────────────────────────────────────
export interface AuditLogEntry {
  _id: string
  action_type: string
  entity_type?: string
  entity_id?: string
  description?: string
  status: string
  created_at: string
  ip_address?: string
  admin_id?: { display_name: string; email: string; role: string }
}

// ── AI subsystem oversight ──────────────────────────────────────────────
export interface AIProviderStatus {
  name: string
  enabled: boolean
  model: string
  fastModel: string
}
export interface AIConfigSnapshot {
  effort: Record<string, string>
  maxTokens: Record<string, number>
  rateLimit: { windowMs: number; maxRequests: number }
  fraudReviewThreshold: number
  moderationBlockThreshold: number
  moderationWarnThreshold: number
  recommendationTtlMs: number
}
export interface AIFeatureUsage {
  feature: string
  calls: number
  successCalls: number
  failedCalls: number
  successRate: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  avgLatencyMs: number
}
export interface AIOverview {
  provider: AIProviderStatus
  config: AIConfigSnapshot
  window: { days: number; since: string }
  summary: {
    totalCalls: number
    successCalls: number
    failedCalls: number
    successRate: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    avgLatencyMs: number
  }
  byFeature: AIFeatureUsage[]
}
export interface AITimeseriesPoint {
  date: string
  calls: number
  successCalls: number
  failedCalls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}
export interface AIGenerationLogEntry {
  _id: string
  feature: string
  model: string | null
  kind: 'text' | 'json'
  success: boolean
  input_tokens: number
  output_tokens: number
  latency_ms: number
  stop_reason: string | null
  error: string | null
  user_id?: { _id: string; display_name: string; email: string } | null
  campaign_id?: string | null
  created_at: string
}

type Query = Record<string, string | number | boolean | undefined>

function clean(params?: Query): Query {
  if (!params) return {}
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
}

export const adminService = {
  // Identity / RBAC
  me: () => apiClient.get('/admin/me').then((r) => r.data.data as AdminMe),
  roles: () => apiClient.get('/admin/roles').then((r) => r.data.data as AdminRole[]),

  // AD-01 Dashboard
  dashboard: (windowDays?: number) =>
    apiClient.get('/admin/dashboard', { params: clean({ windowDays }) }).then((r) => r.data.data as DashboardOverview),
  timeseries: (days?: number) =>
    apiClient.get('/admin/dashboard/timeseries', { params: clean({ days }) }).then((r) => r.data.data as TimeSeries),

  // AN-02 Platform analytics
  analytics: (period?: string) =>
    apiClient.get('/admin/analytics', { params: clean({ period }) }).then((r) => r.data.data as PlatformAnalytics),
  analyticsRegions: (params?: Query) =>
    apiClient.get('/admin/analytics/regions', { params: clean(params) }).then((r) => r.data.data as RegionImpactReport),

  // AD-02 Campaign moderation
  campaignQueue: (params?: Query) =>
    apiClient.get('/admin/moderation/campaigns', { params: clean(params) })
      .then((r) => r.data.data as { campaigns: ModerationCampaign[]; pagination: Pagination }),
  campaignForReview: (id: string) =>
    apiClient.get(`/admin/moderation/campaigns/${id}`).then((r) => r.data.data as ModerationCampaign),
  moderateCampaign: (id: string, body: { decision: string; notes?: string; reason?: string }) =>
    apiClient.post(`/admin/moderation/campaigns/${id}/decision`, body).then((r) => r.data.data),
  pauseCampaign: (id: string, reason?: string) =>
    apiClient.post(`/admin/moderation/campaigns/${id}/pause`, { reason }).then((r) => r.data.data),
  resumeCampaign: (id: string, reason?: string) =>
    apiClient.post(`/admin/moderation/campaigns/${id}/resume`, { reason }).then((r) => r.data.data),

  // AD-02 Free Campaign → Share Campaign upgrade.
  // The context call carries the OWNER's payout readiness plus a `blockers`
  // list, so the UI can disable the action with a reason instead of letting an
  // admin discover the problem on submit. The server re-checks regardless —
  // there is no admin override of the payout requirement.
  campaignUpgradeStats: (params?: Query) =>
    apiClient
      .get('/admin/moderation/campaign-upgrades/stats', { params })
      .then((r) => r.data.data as UpgradeStatsResponse),
  campaignSupportBoosts: (campaignId: string, params?: Query) =>
    apiClient
      .get(`/admin/moderation/campaigns/${campaignId}/support-boosts`, { params })
      .then((r) => r.data.data as SupportBoostsPage),
  revokeSupportBoost: (boostId: string, reason: string) =>
    apiClient
      .post(`/admin/moderation/support-boosts/${boostId}/revoke`, { reason })
      .then((r) => r.data.data),
  campaignUpgrades: (params?: Query) =>
    apiClient
      .get('/admin/moderation/campaign-upgrades', { params })
      .then((r) => r.data.data as CampaignUpgradesPage),
  campaignUpgradeContext: (id: string) =>
    apiClient.get(`/admin/moderation/campaigns/${id}/upgrade-context`).then((r) => r.data.data),
  upgradeCampaign: (
    id: string,
    body: {
      budget: number
      reward_per_share: number
      admin_note: string
      idempotency_key?: string
    }
  ) => apiClient.post(`/admin/moderation/campaigns/${id}/upgrade`, body).then((r) => r.data.data),

  // AD-08 Content moderation
  flaggedComments: (params?: Query) =>
    apiClient.get('/admin/moderation/comments', { params: clean(params) })
      .then((r) => r.data.data as { comments: FlaggedComment[]; pagination: Pagination }),
  moderateComment: (id: string, body: { action: string; reason?: string }) =>
    apiClient.post(`/admin/moderation/comments/${id}/action`, body).then((r) => r.data.data),

  // AD-03 Users
  users: (params?: Query) =>
    apiClient.get('/admin/users', { params: clean(params) })
      .then((r) => r.data.data as { users: AdminUser[]; pagination: Pagination }),
  userDetail: (id: string) => apiClient.get(`/admin/users/${id}`).then((r) => r.data.data as UserDetail),
  verifyUser: (id: string, notes?: string) =>
    apiClient.patch(`/admin/users/${id}/verify`, { notes }).then((r) => r.data.data),
  rejectVerification: (id: string, notes?: string) =>
    apiClient.patch(`/admin/users/${id}/reject-verification`, { notes }).then((r) => r.data.data),
  blockUser: (id: string, reason?: string) =>
    apiClient.patch(`/admin/users/${id}/block`, { reason }).then((r) => r.data.data),
  unblockUser: (id: string) => apiClient.patch(`/admin/users/${id}/unblock`).then((r) => r.data.data),
  restoreUser: (id: string) => apiClient.patch(`/admin/users/${id}/restore`).then((r) => r.data.data),
  deleteUser: (id: string, reason?: string) =>
    apiClient.delete(`/admin/users/${id}`, { data: { reason } }).then((r) => r.data.data),
  updateUserRole: (id: string, body: { role?: string; adminRoles?: string[] }) =>
    apiClient.patch(`/admin/users/${id}/role`, body).then((r) => r.data.data),
  exportUser: (id: string) => apiClient.get(`/admin/users/${id}/export`).then((r) => r.data.data),

  // Reports
  reports: (params?: Query) =>
    apiClient.get('/admin/reports', { params: clean(params) })
      .then((r) => r.data.data as { reports: UserReport[]; pagination: Pagination }),
  resolveReport: (id: string, body: { resolution?: string; actionTaken?: string }) =>
    apiClient.patch(`/admin/reports/${id}/resolve`, body).then((r) => r.data.data),
  dismissReport: (id: string, reason?: string) =>
    apiClient.patch(`/admin/reports/${id}/dismiss`, { reason }).then((r) => r.data.data),

  // AD-04 Finance oversight
  financeOverview: (params?: Query) =>
    apiClient.get('/admin/finance/overview', { params: clean(params) }).then((r) => r.data.data as FinanceOverview),
  transactions: (params?: Query) =>
    apiClient.get('/admin/finance/transactions', { params: clean(params) })
      .then((r) => r.data.data as { transactions: AdminTransaction[]; pagination: Pagination }),
  refundTransaction: (id: string, reason?: string) =>
    apiClient.post(`/admin/finance/transactions/${id}/refund`, { reason }).then((r) => r.data.data),

  // AD-10 Reports & reconciliation
  periodReport: (params?: Query) =>
    apiClient.get('/admin/finance/reports', { params: clean(params) }).then((r) => r.data.data as PeriodReport),
  reportCsvUrl: (params: Query) => {
    const q = new URLSearchParams(clean({ ...params, format: 'csv' }) as Record<string, string>).toString()
    return `/admin/finance/reports?${q}`
  },
  downloadReportCsv: (params: Query) =>
    apiClient.get('/admin/finance/reports', { params: clean({ ...params, format: 'csv' }), responseType: 'blob' })
      .then((r) => r.data as Blob),
  reconcile: (params?: Query) =>
    apiClient.get('/admin/finance/reconcile', { params: clean(params) }).then((r) => r.data.data as Reconciliation),

  // AD-05 Verification queue
  verifications: (params?: Query) =>
    apiClient.get('/admin/verifications', { params: clean(params) })
      .then((r) => r.data.data as { submissions: VerificationSubmission[]; pagination: Pagination }),
  verificationDetail: (id: string) =>
    apiClient.get(`/admin/verifications/${id}`).then((r) => r.data.data as VerificationSubmission),
  approveVerification: (id: string, body: { notes?: string; tier?: string }) =>
    apiClient.post(`/admin/verifications/${id}/approve`, body).then((r) => r.data.data),
  rejectVerificationSubmission: (id: string, reason: string) =>
    apiClient.post(`/admin/verifications/${id}/reject`, { reason }).then((r) => r.data.data),
  requestVerificationInfo: (id: string, notes?: string) =>
    apiClient.post(`/admin/verifications/${id}/request-info`, { notes }).then((r) => r.data.data),

  // AD-06 Fraud
  fraudDashboard: () => apiClient.get('/admin/fraud').then((r) => r.data.data as FraudDashboard),
  fraudAlerts: (params?: Query) =>
    apiClient.get('/admin/fraud/alerts', { params: clean(params) })
      .then((r) => r.data.data as { alerts: FraudAlert[]; pagination: Pagination }),
  actOnAlert: (id: string, body: { action: string; notes?: string }) =>
    apiClient.post(`/admin/fraud/alerts/${id}/action`, body).then((r) => r.data.data),
  reviewAssessment: (id: string, body: { decision: string; notes?: string }) =>
    apiClient.post(`/admin/fraud/assessments/${id}/review`, body).then((r) => r.data.data),

  // AD-07 Config
  config: () => apiClient.get('/admin/config').then((r) => r.data.data as Record<string, Record<string, unknown>>),
  updateConfig: (key: string, value: Record<string, unknown>) =>
    apiClient.put(`/admin/config/${key}`, { value }).then((r) => r.data.data),
  broadcasts: (params?: Query) =>
    apiClient.get('/admin/broadcasts', { params: clean(params) }).then((r) => r.data.data),
  createBroadcast: (body: Record<string, unknown>) =>
    apiClient.post('/admin/broadcasts', body).then((r) => r.data.data),

  // AD-09 Audit
  audit: (params?: Query) =>
    apiClient.get('/admin/audit', { params: clean(params) })
      .then((r) => r.data.data as { logs: AuditLogEntry[]; pagination: Pagination }),
  auditStats: (params?: Query) =>
    apiClient.get('/admin/audit/statistics', { params: clean(params) }).then((r) => r.data.data),

  // AI subsystem oversight
  aiOverview: (days?: number) =>
    apiClient.get('/admin/ai/overview', { params: clean({ days }) }).then((r) => r.data.data as AIOverview),
  aiTimeseries: (days?: number) =>
    apiClient.get('/admin/ai/timeseries', { params: clean({ days }) }).then((r) => r.data.data as AITimeseriesPoint[]),
  aiLogs: (params?: Query) =>
    apiClient.get('/admin/ai/logs', { params: clean(params) })
      .then((r) => r.data.data as { logs: AIGenerationLogEntry[]; pagination: Pagination }),
  aiFeatures: () => apiClient.get('/admin/ai/features').then((r) => r.data.data as string[]),
}

export default adminService
