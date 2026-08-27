import { apiClient } from '@/lib/api'

/**
 * Campaign Upgrade Service — Frontend
 *
 * Free Campaign (fundraising) → Share Campaign (sharing).
 *
 * Every call goes through apiClient so token refresh + retry are handled
 * centrally; raw axios/fetch for authenticated endpoints is a defect in this
 * codebase.
 *
 * The eligibility response is for RENDERING ONLY. The server re-checks
 * authorisation, campaign status and the owner's payout method on every
 * mutation, so a stale or tampered eligibility payload cannot buy anything.
 */

export type PayoutReadinessLevel = 'verified' | 'provisional' | 'none'
export type ActorRole = 'creator' | 'sponsor' | 'viewer'

export interface PayoutMethodSummary {
  id: string
  type: string
  provider: string | null
  status: string
  verification_status: string
  is_primary: boolean
  last_four: string | null
  nickname: string | null
}

export interface UpgradeBlockReason {
  code: string
  message: string
  blocking: boolean
  action?: string | null
  action_url?: string | null
}

export interface UpgradeEligibility {
  eligible: boolean
  reason_code: string | null
  reasons: UpgradeBlockReason[]
  campaign: {
    id: string
    campaign_id: string
    title: string
    campaign_type: 'fundraising' | 'sharing'
    status: string
    already_share_campaign: boolean
    original_campaign_type: string | null
  }
  payout_readiness: {
    ready: boolean
    level: PayoutReadinessLevel
    method: PayoutMethodSummary | null
  }
  actor_role: ActorRole
  sponsor_basis: string | null
  requires_owner_approval: boolean
  pending_upgrade: {
    id: string
    status: string
    initiated_by: string
    created_at: string
    expires_at: string | null
  } | null
}

export interface UpgradeShareConfigInput {
  /** Total reward pool, in dollars. */
  budget: number
  /** Reward per qualifying share, in dollars. */
  reward_per_share: number
  platforms?: string[]
}

export interface UpgradeRequestRecord {
  _id: string
  campaign_id: string
  campaign_ref: string | null
  campaign_title: string | null
  owner_id: string
  initiated_by: string
  initiator_type: 'creator' | 'sponsor' | 'admin'
  status: string
  reason: string | null
  created_at: string
  expires_at: string | null
}

/**
 * A stable idempotency key per user *intent*.
 *
 * Reused across retries of the same attempt so a lost response cannot cause a
 * second upgrade — the server returns the original outcome instead. Generate a
 * new one only when the user starts a fresh attempt.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const campaignUpgradeService = {
  /**
   * Whether this campaign can become a Share Campaign, and whether the owner
   * has a usable payout method. Drives the UI only.
   */
  async getEligibility(campaignId: string): Promise<UpgradeEligibility> {
    const { data } = await apiClient.get(`/campaigns/${campaignId}/upgrade-eligibility`)
    return data.data
  },

  /**
   * Creator upgrades their own campaign.
   */
  async upgradeOwnCampaign(
    campaignId: string,
    payload: UpgradeShareConfigInput & {
      payout_consent: boolean
      payment_method_id?: string | null
      idempotency_key: string
    }
  ) {
    const { data } = await apiClient.post(`/campaigns/${campaignId}/upgrade`, payload)
    return data
  },

  /**
   * A qualified supporter asks the owner to upgrade. Never changes the campaign
   * on its own — the owner must approve, because the owner is the one who will
   * owe sharers their rewards.
   */
  async requestUpgradeForOther(
    campaignId: string,
    payload: Partial<UpgradeShareConfigInput> & {
      reason?: string
      idempotency_key: string
    }
  ) {
    const { data } = await apiClient.post(`/campaigns/${campaignId}/upgrade-requests`, payload)
    return data
  },

  /**
   * The owner's inbox of sponsored requests awaiting a decision.
   */
  async getMyUpgradeRequests(params?: { status?: string; page?: number; limit?: number }) {
    const { data } = await apiClient.get('/campaigns/upgrade-requests/mine', { params })
    return data.data as { items: UpgradeRequestRecord[]; total: number }
  },

  async approveUpgradeRequest(
    upgradeId: string,
    payload: UpgradeShareConfigInput & {
      payout_consent: boolean
      payment_method_id?: string | null
    }
  ) {
    const { data } = await apiClient.post(
      `/campaigns/upgrade-requests/${upgradeId}/approve`,
      payload
    )
    return data
  },

  async rejectUpgradeRequest(upgradeId: string, reason?: string) {
    const { data } = await apiClient.post(`/campaigns/upgrade-requests/${upgradeId}/reject`, {
      reason,
    })
    return data
  },

  async cancelUpgradeRequest(upgradeId: string) {
    const { data } = await apiClient.post(`/campaigns/upgrade-requests/${upgradeId}/cancel`, {})
    return data
  },
}

export default campaignUpgradeService
