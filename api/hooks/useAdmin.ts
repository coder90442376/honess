'use client'

/**
 * Admin React Query hooks (AD-01..AD-10)
 * Thin wrappers over adminService with consistent cache keys + invalidation.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { adminService } from '@/api/services/adminService'

type Query = Record<string, string | number | boolean | undefined>

const keys = {
  me: ['admin', 'me'] as const,
  roles: ['admin', 'roles'] as const,
  dashboard: (w?: number) => ['admin', 'dashboard', w] as const,
  campaignUpgradeContext: (id: string) => ['admin', 'campaignUpgradeContext', id] as const,
  campaignUpgrades: (p: Query) => ['admin', 'campaignUpgrades', p] as const,
  campaignUpgradeStats: (p: Query) => ['admin', 'campaignUpgradeStats', p] as const,
  supportBoosts: (id: string, p: Query) => ['admin', 'supportBoosts', id, p] as const,
  timeseries: (d?: number) => ['admin', 'timeseries', d] as const,
  analytics: (p?: string) => ['admin', 'analytics', p] as const,
  analyticsRegions: (p: Query) => ['admin', 'analyticsRegions', p] as const,
  campaignQueue: (p: Query) => ['admin', 'campaignQueue', p] as const,
  campaign: (id: string) => ['admin', 'campaign', id] as const,
  comments: (p: Query) => ['admin', 'comments', p] as const,
  users: (p: Query) => ['admin', 'users', p] as const,
  user: (id: string) => ['admin', 'user', id] as const,
  reports: (p: Query) => ['admin', 'reports', p] as const,
  financeOverview: (p: Query) => ['admin', 'financeOverview', p] as const,
  transactions: (p: Query) => ['admin', 'transactions', p] as const,
  periodReport: (p: Query) => ['admin', 'periodReport', p] as const,
  reconcile: (p: Query) => ['admin', 'reconcile', p] as const,
  verifications: (p: Query) => ['admin', 'verifications', p] as const,
  verification: (id: string) => ['admin', 'verification', id] as const,
  fraud: ['admin', 'fraud'] as const,
  fraudAlerts: (p: Query) => ['admin', 'fraudAlerts', p] as const,
  config: ['admin', 'config'] as const,
  audit: (p: Query) => ['admin', 'audit', p] as const,
  aiOverview: (d?: number) => ['admin', 'aiOverview', d] as const,
  aiTimeseries: (d?: number) => ['admin', 'aiTimeseries', d] as const,
  aiLogs: (p: Query) => ['admin', 'aiLogs', p] as const,
  aiFeatures: ['admin', 'aiFeatures'] as const,
}

const onErr = (e: unknown) => {
  const err = e as { response?: { data?: { error?: { message?: string } } } }
  toast.error(err?.response?.data?.error?.message || 'Action failed')
}

// ── Identity / RBAC ──────────────────────────────────────────────────────
export const useAdminMe = () =>
  useQuery({ queryKey: keys.me, queryFn: adminService.me, staleTime: 10 * 60 * 1000, retry: false })

export const useAdminRoles = () =>
  useQuery({ queryKey: keys.roles, queryFn: adminService.roles, staleTime: 30 * 60 * 1000 })

// ── AD-01 Dashboard ────────────────────────────────────────────────────
export const useAdminDashboard = (windowDays?: number) =>
  useQuery({ queryKey: keys.dashboard(windowDays), queryFn: () => adminService.dashboard(windowDays) })

export const useAdminTimeseries = (days?: number) =>
  useQuery({ queryKey: keys.timeseries(days), queryFn: () => adminService.timeseries(days) })

// ── AN-02 Platform analytics ─────────────────────────────────────────────
export const useAdminAnalytics = (period?: string) =>
  useQuery({ queryKey: keys.analytics(period), queryFn: () => adminService.analytics(period) })

export const useAnalyticsRegions = (params: Query) =>
  useQuery({ queryKey: keys.analyticsRegions(params), queryFn: () => adminService.analyticsRegions(params), placeholderData: keepPreviousData })

// ── AD-02 Campaign moderation ──────────────────────────────────────────
export const useCampaignQueue = (params: Query) =>
  useQuery({ queryKey: keys.campaignQueue(params), queryFn: () => adminService.campaignQueue(params), placeholderData: keepPreviousData })

export const useCampaignReview = (id: string) =>
  useQuery({ queryKey: keys.campaign(id), queryFn: () => adminService.campaignForReview(id), enabled: !!id })

export const useModerateCampaign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; decision: string; notes?: string; reason?: string }) =>
      adminService.moderateCampaign(id, body),
    onSuccess: () => {
      toast.success('Decision applied')
      qc.invalidateQueries({ queryKey: ['admin', 'campaignQueue'] })
    },
    onError: onErr,
  })
}

/**
 * Upgrade funnel + boost analytics. `payout_gate_block_rate` is the number the
 * rollout decision hangs on — how many creators the payout gate turns away.
 */
export const useCampaignUpgradeStats = (params: Query, enabled = true) =>
  useQuery({
    queryKey: keys.campaignUpgradeStats(params),
    queryFn: () => adminService.campaignUpgradeStats(params),
    enabled,
    retry: false,
  })

/** Community (peer) boosts on one campaign — the fraud-inspection view. */
export const useCampaignSupportBoosts = (campaignId: string | null, params: Query) =>
  useQuery({
    queryKey: keys.supportBoosts(campaignId ?? '', params),
    queryFn: () => adminService.campaignSupportBoosts(campaignId as string, params),
    enabled: !!campaignId,
    retry: false,
  })

export const useRevokeSupportBoost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boostId, reason }: { boostId: string; reason: string }) =>
      adminService.revokeSupportBoost(boostId, reason),
    onSuccess: () => {
      toast.success('Boost revoked and campaign score recomputed')
      qc.invalidateQueries({ queryKey: ['admin', 'supportBoosts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'campaignQueue'] })
      qc.invalidateQueries({ queryKey: ['admin', 'campaignUpgradeStats'] })
    },
    onError: onErr,
  })
}

/** Free → Share upgrade audit trail across all campaigns (AD-02). */
export const useCampaignUpgrades = (params: Query, enabled = true) =>
  useQuery({
    queryKey: keys.campaignUpgrades(params),
    queryFn: () => adminService.campaignUpgrades(params),
    enabled,
    placeholderData: keepPreviousData,
    retry: false,
  })

/**
 * Context an admin needs before upgrading a Free Campaign to a Share Campaign:
 * the owner, their payout readiness, risk signals and any blockers.
 *
 * `staleTime: 0` — payout readiness can change while the modal is open (the
 * owner may add a method), and acting on a stale "not ready" would be wrong.
 */
export const useCampaignUpgradeContext = (id: string | null) =>
  useQuery({
    queryKey: keys.campaignUpgradeContext(id ?? ''),
    queryFn: () => adminService.campaignUpgradeContext(id as string),
    enabled: !!id,
    staleTime: 0,
    retry: false,
  })

export const useAdminUpgradeCampaign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      budget: number
      reward_per_share: number
      admin_note: string
      idempotency_key?: string
    }) => adminService.upgradeCampaign(id, body),
    onSuccess: () => {
      toast.success('Campaign upgraded to a Share Campaign')
      qc.invalidateQueries({ queryKey: ['admin', 'campaignQueue'] })
      qc.invalidateQueries({ queryKey: ['admin', 'campaignUpgradeContext'] })
      qc.invalidateQueries({ queryKey: ['admin', 'campaignUpgrades'] })
    },
    onError: onErr,
  })
}

export const useCampaignPauseResume = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pause, reason }: { id: string; pause: boolean; reason?: string }) =>
      pause ? adminService.pauseCampaign(id, reason) : adminService.resumeCampaign(id, reason),
    onSuccess: () => {
      toast.success('Updated')
      qc.invalidateQueries({ queryKey: ['admin', 'campaignQueue'] })
    },
    onError: onErr,
  })
}

// ── AD-08 Content moderation ───────────────────────────────────────────
export const useFlaggedComments = (params: Query) =>
  useQuery({ queryKey: keys.comments(params), queryFn: () => adminService.flaggedComments(params), placeholderData: keepPreviousData })

export const useModerateComment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; action: string; reason?: string }) =>
      adminService.moderateComment(id, body),
    onSuccess: () => {
      toast.success('Comment updated')
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] })
    },
    onError: onErr,
  })
}

// ── AD-03 Users ─────────────────────────────────────────────────────────
export const useAdminUsers = (params: Query) =>
  useQuery({ queryKey: keys.users(params), queryFn: () => adminService.users(params), placeholderData: keepPreviousData })

export const useAdminUserDetail = (id: string) =>
  useQuery({ queryKey: keys.user(id), queryFn: () => adminService.userDetail(id), enabled: !!id })

export const useUserAction = () => {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    qc.invalidateQueries({ queryKey: ['admin', 'user'] })
  }
  return {
    verify: useMutation({ mutationFn: ({ id, notes }: { id: string; notes?: string }) => adminService.verifyUser(id, notes), onSuccess: () => { toast.success('User verified'); invalidate() }, onError: onErr }),
    rejectVerification: useMutation({ mutationFn: ({ id, notes }: { id: string; notes?: string }) => adminService.rejectVerification(id, notes), onSuccess: () => { toast.success('Verification rejected'); invalidate() }, onError: onErr }),
    block: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminService.blockUser(id, reason), onSuccess: () => { toast.success('User blocked'); invalidate() }, onError: onErr }),
    unblock: useMutation({ mutationFn: (id: string) => adminService.unblockUser(id), onSuccess: () => { toast.success('User unblocked'); invalidate() }, onError: onErr }),
    remove: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminService.deleteUser(id, reason), onSuccess: () => { toast.success('User deleted'); invalidate() }, onError: onErr }),
    updateRole: useMutation({ mutationFn: ({ id, role, adminRoles }: { id: string; role?: string; adminRoles?: string[] }) => adminService.updateUserRole(id, { role, adminRoles }), onSuccess: () => { toast.success('Role updated'); invalidate() }, onError: onErr }),
  }
}

export const useAdminReports = (params: Query) =>
  useQuery({ queryKey: keys.reports(params), queryFn: () => adminService.reports(params), placeholderData: keepPreviousData })

export const useReportAction = () => {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] })
  return {
    resolve: useMutation({ mutationFn: ({ id, ...body }: { id: string; resolution?: string; actionTaken?: string }) => adminService.resolveReport(id, body), onSuccess: () => { toast.success('Report resolved'); invalidate() }, onError: onErr }),
    dismiss: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminService.dismissReport(id, reason), onSuccess: () => { toast.success('Report dismissed'); invalidate() }, onError: onErr }),
  }
}

// ── AD-04 Finance ─────────────────────────────────────────────────────────
export const useFinanceOverview = (params: Query) =>
  useQuery({ queryKey: keys.financeOverview(params), queryFn: () => adminService.financeOverview(params) })

export const useAdminTransactions = (params: Query) =>
  useQuery({ queryKey: keys.transactions(params), queryFn: () => adminService.transactions(params), placeholderData: keepPreviousData })

export const useRefundTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminService.refundTransaction(id, reason),
    onSuccess: () => { toast.success('Refund processed'); qc.invalidateQueries({ queryKey: ['admin', 'transactions'] }) },
    onError: onErr,
  })
}

// ── AD-10 Reports & reconciliation ──────────────────────────────────────
export const usePeriodReport = (params: Query) =>
  useQuery({ queryKey: keys.periodReport(params), queryFn: () => adminService.periodReport(params) })

export const useReconciliation = (params: Query) =>
  useQuery({ queryKey: keys.reconcile(params), queryFn: () => adminService.reconcile(params) })

// ── AD-05 Verification ────────────────────────────────────────────────────
export const useVerifications = (params: Query) =>
  useQuery({ queryKey: keys.verifications(params), queryFn: () => adminService.verifications(params), placeholderData: keepPreviousData })

export const useVerificationDetail = (id: string) =>
  useQuery({ queryKey: keys.verification(id), queryFn: () => adminService.verificationDetail(id), enabled: !!id })

export const useVerificationAction = () => {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'verifications'] })
  return {
    approve: useMutation({ mutationFn: ({ id, notes, tier }: { id: string; notes?: string; tier?: string }) => adminService.approveVerification(id, { notes, tier }), onSuccess: () => { toast.success('Verification approved'); invalidate() }, onError: onErr }),
    reject: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.rejectVerificationSubmission(id, reason), onSuccess: () => { toast.success('Verification rejected'); invalidate() }, onError: onErr }),
    requestInfo: useMutation({ mutationFn: ({ id, notes }: { id: string; notes?: string }) => adminService.requestVerificationInfo(id, notes), onSuccess: () => { toast.success('Requested more info'); invalidate() }, onError: onErr }),
  }
}

// ── AD-06 Fraud ─────────────────────────────────────────────────────────
export const useFraudDashboard = () =>
  useQuery({ queryKey: keys.fraud, queryFn: adminService.fraudDashboard })

export const useFraudAlerts = (params: Query) =>
  useQuery({ queryKey: keys.fraudAlerts(params), queryFn: () => adminService.fraudAlerts(params), placeholderData: keepPreviousData })

export const useFraudAction = () => {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'fraud'] })
    qc.invalidateQueries({ queryKey: ['admin', 'fraudAlerts'] })
  }
  return {
    actOnAlert: useMutation({ mutationFn: ({ id, ...body }: { id: string; action: string; notes?: string }) => adminService.actOnAlert(id, body), onSuccess: () => { toast.success('Alert updated'); invalidate() }, onError: onErr }),
    reviewAssessment: useMutation({ mutationFn: ({ id, ...body }: { id: string; decision: string; notes?: string }) => adminService.reviewAssessment(id, body), onSuccess: () => { toast.success('Assessment reviewed'); invalidate() }, onError: onErr }),
  }
}

// ── AD-07 Config ─────────────────────────────────────────────────────────
export const useAdminConfig = () =>
  useQuery({ queryKey: keys.config, queryFn: adminService.config })

export const useUpdateConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) => adminService.updateConfig(key, value),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: keys.config }) },
    onError: onErr,
  })
}

// ── AD-09 Audit ─────────────────────────────────────────────────────────
export const useAuditLog = (params: Query) =>
  useQuery({ queryKey: keys.audit(params), queryFn: () => adminService.audit(params), placeholderData: keepPreviousData })

// ── AI subsystem oversight ───────────────────────────────────────────────
export const useAIOverview = (days?: number) =>
  useQuery({ queryKey: keys.aiOverview(days), queryFn: () => adminService.aiOverview(days) })

export const useAITimeseries = (days?: number) =>
  useQuery({ queryKey: keys.aiTimeseries(days), queryFn: () => adminService.aiTimeseries(days) })

export const useAILogs = (params: Query) =>
  useQuery({ queryKey: keys.aiLogs(params), queryFn: () => adminService.aiLogs(params), placeholderData: keepPreviousData })

export const useAIFeatures = () =>
  useQuery({ queryKey: keys.aiFeatures, queryFn: adminService.aiFeatures, staleTime: 10 * 60 * 1000 })
